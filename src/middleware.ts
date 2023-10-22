import { getUserFromSessionKey } from "./auth";
import { defineMiddleware } from "astro:middleware";

// This function checks if a given URL matches a pattern.
function matchesPattern(url, pattern) {
  const regex = new RegExp(
    "^" + pattern.replace(/:[a-zA-Z0-9_]+/g, "([a-zA-Z0-9_-]+)") + "$",
  );
  return regex.test(url);
}

function urlIsPublic(url) {
  const publicUrls = ["/", "/auth/login/", "/auth/register/"];
  return publicUrls.includes(url);
}

function urlIsAuth(url) {
  const authUrls = ["/auth/logout/", "/auth/waiting-room/"];

  return authUrls.includes(url);
}

function urlIsAdmin(url) {
  const adminUrls = ["/admin/"];
  return adminUrls.includes(url);
}

export const onRequest = defineMiddleware(async (context, next) => {
  const currentUrl = context.url.pathname;
  const isPublicUrl = urlIsPublic(currentUrl);
  const isAuthUrl = urlIsAuth(currentUrl);

  const sessionKey = context.cookies.get("astro-sqlite-tts-feed-session")
    ?.value;
  const user = await getUserFromSessionKey(sessionKey);

  context.locals.user = user;

  if (!isPublicUrl && !isAuthUrl && !user) {
    return context.redirect("/auth/login/");
  }

  if (isAuthUrl && user) {
    return next();
  }

  if (!isPublicUrl && !user.isApproved && !isAuthUrl) {
    return context.redirect("/auth/waiting-room/");
  }

  const isAdminUrl = urlIsAdmin(currentUrl);

  if (isAdminUrl && !user.isAdmin) {
    return new Response(null, { status: 403, statusText: "Forbidden" });
  }

  // return a Response or the result of calling `next()`
  return next();
});
