import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

import type { AstroGlobal } from "astro";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

export function createAdminUser(name: string, email: string, password: string) {
  if (!name) throw new Error("Admin name not set");
  if (!email) throw new Error("Admin email not set");
  if (!password) throw new Error("Admin password not set");
  // check if user exists with email

  const existingUser = findUserWithEmail(email);

  if (existingUser) {
    throw new Error("User with that email already exists");
  }

  const passwordHash = hashPassword(password);

  const newUser = db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
      isAdmin: true,
      isApproved: true,
    })
    .returning()
    .get();

  return newUser;
}

export function hashPassword(password: string) {
  if (!password) {
    throw new Error("Password not set");
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  return passwordHash;
}

import Redis from "ioredis";

const redisClient = new Redis();

/*
 the password flow:
 when someone signs up, they enter their password twice. we check that the passwords match.
 then we hash their password using our secret key. we save the hashed password in the db.

 when someone logs in, we check the password hash against the password hash stored in the db for the user's email
if it matches, we create a new session key and store it in redis, with the user id as the value. we set it to expire after 24 hours.
we set a cookie header with that session key so the browser will continue to use that cookie

on each request, we read the session key from the user's cookie
we look it up in redis and get the user id
if we don't get a user id, we redirect to login page
*/

function findUserWithEmail(email: string) {
  return db.select().from(users).where(eq(users.email, email)).get();
}

export async function handleLogin(
  Astro: AstroGlobal,
  email: string,
  password: string,
) {
  console.log("email", email);
  const existingUser = findUserWithEmail(email);

  if (!existingUser) {
    throw new Error("User with that email does not exist");
  }

  const isCorrectPassword = checkPassword(password, existingUser.passwordHash);

  if (isCorrectPassword) {
    const sessionKey = await createRedisSession(existingUser.id);
    setSessionCookie(Astro, sessionKey);
    return true;
  } else {
    throw new Error("Incorrect password");
  }
}

export async function handleLogout(Astro: AstroGlobal) {
  await deleteRedisSession(Astro);
  deleteSessionCookie(Astro);
  return true;
}

export async function handleSignup(
  Astro: AstroGlobal,
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
) {
  console.log({ password, confirmPassword });
  const passwordsMatch = password === confirmPassword;
  if (!passwordsMatch) {
    throw new Error("Passwords do not match");
  }

  // check if user exists with email
  const existingUser = findUserWithEmail(email);

  if (existingUser) {
    throw new Error("User with that email already exists");
  }

  // create user
  const passwordHash = hashPassword(password);
  const newUser = db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
      isAdmin: false,
      isApproved: false,
    })
    .returning()
    .get();
  // create session
  const sessionKey = await createRedisSession(newUser.id);
  setSessionCookie(Astro, sessionKey);

  return true;
}

function generateSessionKey() {
  return randomBytes(16).toString("hex");
}

export async function createRedisSession(userId: number) {
  const sessionKey = generateSessionKey();
  await redisClient.set(sessionKey, userId, "EX", SEVEN_DAYS); // Set the session to expire in 24 hours
  return sessionKey;
}

function getSessionKeyFromAstro(Astro: AstroGlobal) {
  const cookie = Astro.cookies.get("astro-sqlite-tts-feed-session");
  if (cookie) return cookie.value;
  return null;
}

export async function deleteRedisSession(Astro: AstroGlobal) {
  const sessionKey = getSessionKeyFromAstro(Astro);
  if (sessionKey) {
    await redisClient.del(sessionKey);
  }
}

export async function getUserIdFromSessionKey(sessionKey: string) {
  const valueFromRedis = await redisClient.get(sessionKey);
  if (!valueFromRedis) return null;
  return parseInt(valueFromRedis);
}

export async function getUserFromSessionKey(sessionKey: string) {
  const userId = await getUserIdFromSessionKey(sessionKey);
  if (!userId) return null;

  const user = db.select().from(users).where(eq(users.id, userId)).get();

  return user;
}

export function checkPassword(suppliedPassword: string, passwordHash: string) {
  return bcrypt.compareSync(suppliedPassword, passwordHash);
}

const ONE_DAY_SECONDS = 60 * 60 * 24;
const SEVEN_DAYS = 7 * ONE_DAY_SECONDS;

export function deleteSessionCookie(Astro: AstroGlobal) {
  Astro.cookies.delete("astro-sqlite-tts-feed-session", {
    path: "/",
  });
}

export function setSessionCookie(Astro: AstroGlobal, sessionKey: string) {
  Astro.cookies.set("astro-sqlite-tts-feed-session", sessionKey, {
    maxAge: SEVEN_DAYS,
    path: "/",
    sameSite: "lax",
    secure: true,
    httpOnly: true,
  });
}

export function getUnapprovedUsers() {
  const unapprovedUsers = db
    .select()
    .from(users)
    .where(eq(users.isApproved, false))
    .all();

  return unapprovedUsers;
}

export function approveUser(userId: number) {
  const updatedUser = db
    .update(users)
    .set({ isApproved: true })
    .where(eq(users.id, userId))
    .returning()
    .get();

  return updatedUser;
}
