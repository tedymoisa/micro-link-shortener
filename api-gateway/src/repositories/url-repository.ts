import { Pool } from "pg";
import logger from "../config/logger.js";
import { Url } from "../entities/Url.js";

const createUrlRepository = (dbPool: Pool) => {
  return {
    updateUrl: async (shortCode: string, longUrl: string) => {
      const dbClient = await dbPool.connect();

      try {
        const result = await dbClient.query<Url>(
          `
          INSERT INTO urls (short_code, long_url)
          VALUES ($1, $2)
          ON CONFLICT (short_code)
          DO UPDATE SET long_url = EXCLUDED.long_url
          RETURNING *;
        `,
          [shortCode, longUrl],
        );

        return result.rows[0] ?? null;
      } catch (error) {
        logger.error("Database upsert error!", error);
        return null;
      } finally {
        dbClient.release();
      }
    },

    getLongUrl: async (shortCode: string) => {
      const dbClient = await dbPool.connect();

      try {
        const result = await dbClient.query<Url>(
          `
          SELECT id, short_code, long_url, created_at FROM urls
          WHERE short_code = $1;
        `,
          [shortCode],
        );

        return result.rows[0] ?? null;
      } catch (error) {
        logger.error("Database upsert error!", error);
        return null;
      } finally {
        dbClient.release();
      }
    },
  };
};

export type UrlRepository = ReturnType<typeof createUrlRepository>;
export default createUrlRepository;
