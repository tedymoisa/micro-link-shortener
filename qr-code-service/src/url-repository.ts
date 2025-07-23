import { Pool } from "pg";
import logger from "./config/logger.js";
import { Url } from "./entities/Url.js";
import { getFormattedErrorMessage } from "./lib/error.js";

export function createUrlRepository(dbPool: Pool) {
  return {
    async updateQrCodePath(shortCode: string, qrCodePath: string) {
      const dbClient = await dbPool.connect();

      try {
        const result = await dbClient.query<Url>(
          `
            UPDATE urls SET qr_code = $1 WHERE short_code = $2 RETURNING *;
          `,
          [qrCodePath, shortCode],
        );

        return result.rows[0] ?? null;
      } catch (error) {
        logger.error(getFormattedErrorMessage(error, "Database upsert error!"));
        return null;
      } finally {
        dbClient.release();
      }
    },
  };
}

export type UrlRepository = ReturnType<typeof createUrlRepository>;
