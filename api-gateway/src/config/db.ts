import { Pool } from "pg";
import { env } from "./env.js";
import logger from "./logger.js";

export const db = new Pool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

db.query("SELECT 1")
  .then(() => {
    logger.info("Database connected!");
  })
  .catch((err) => {
    logger.error("Database connection failed:", err);
    process.exit(1);
  });
