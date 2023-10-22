import { drizzle } from "drizzle-orm/better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import type { InferSelectModel } from "drizzle-orm";

const sqlite = new Database("./sqlite.db");
export const db: BetterSQLite3Database = drizzle(sqlite);
