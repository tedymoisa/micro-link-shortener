import { Pool } from "pg";
import logger from "./logger.js";
import env from "./env.js";

export const db = new Pool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

export async function initializeDatabase() {
  try {
    await db.query("SELECT 1");
    logger.info("Database connected successfully!");

    await db.query(`
      CREATE TABLE IF NOT EXISTS urls (
        id SERIAL PRIMARY KEY,
        short_code VARCHAR(10) UNIQUE NOT NULL,
        long_url TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        qr_code_path VARCHAR(255)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS url_analytics (
        id SERIAL PRIMARY KEY,
        url_id INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
        visit_count BIGINT DEFAULT 0,
        last_visited_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(url_id)
      );
    `);

    logger.info("All database tables initialized successfully!");
  } catch (error) {
    logger.error("Database initialization failed:", error);
    process.exit(1);
  }
}

// await initializeDatabase();
