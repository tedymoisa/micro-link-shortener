import { Pool } from "pg";
import logger from "../config/logger.js";
import { Url } from "../entities/Url.js";
import { tryCatch } from "../lib/try-catch.js";

const createUrlRepository = async (dbPool: Pool) => {
  return {
    updateUrl: async (shortCode: string, longUrl: string) => {
      const dbClient = await dbPool.connect();

      const { data, error } = await tryCatch(
        dbClient.query<Url>(
          `
        INSERT INTO urls (short_code, long_url)
        VALUES ($1, $2)
        ON CONFLICT (short_code)
        DO UPDATE SET long_url = EXCLUDED.long_url
        RETURNING *;
        `,
          [shortCode, longUrl],
        ),
      );

      if (error) {
        logger.error("Database upsert error!", error);
        return null;
      }

      return data?.rows[0] ?? null;
    },

    getLongUrl: async (shortCode: string) => {
      const dbClient = await dbPool.connect();

      const { data, error } = await tryCatch(
        dbClient.query<Url>(
          `
        SELECT id, short_code, long_url, created_at FROM urls
        WHERE short_code = $1;
        `,
          [shortCode],
        ),
      );

      if (error) {
        logger.error("Database query error for short code lookup!", {
          error,
          shortCode,
        });
        return null;
      }

      return data?.rows[0] ?? null;
    },
  };
};

export type UrlRepository = ReturnType<typeof createUrlRepository>;
export default createUrlRepository;
