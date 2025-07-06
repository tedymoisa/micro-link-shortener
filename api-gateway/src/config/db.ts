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

db.query(
  `
  CREATE TABLE IF NOT EXISTS urls (
    id SERIAL PRIMARY KEY,
    short_code VARCHAR(10) UNIQUE NOT NULL,
    long_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    qr_code_path VARCHAR(255)
  );
`,
)
  .then(() =>
    db.query(`
    CREATE TABLE IF NOT EXISTS url_analytics (
      id SERIAL PRIMARY KEY,
      url_id INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
      visit_count BIGINT DEFAULT 0,
      last_visited_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(url_id)
    );
  `),
  )
  .then(() => {
    logger.info("Tables created!");
  })
  .catch((err) => {
    logger.error("Error creating tables:", err);
    process.exit(1);
  });
