import { createAdminUser } from "../auth/index.js";
import { config as setupEnv } from "dotenv";
setupEnv();

async function main() {
  // load values from .env
  const name = process.env.SUPERUSER_NAME;
  const email = process.env.SUPERUSER_EMAIL;
  const password = process.env.SUPERUSER_PASSWORD;

  if (!name) {
    throw new Error("SUPERUSER_NAME not set in .env");
  }
  if (!email) {
    throw new Error("SUPERUSER_EMAIL not set in .env");
  }
  if (!password) {
    throw new Error("SUPERUSER_PASSWORD not set in .env");
  }

  const user = await createAdminUser(name, email, password);
  console.log("Created super user", user);
}

main();
