import { db } from "../config/db.js";
import logger from "../config/logger.js";
import { Url } from "../entities/Url.js";
import { tryCatch } from "../lib/try-catch.js";

const generateRandomShortCode = (length = 10): string => {
  const characters = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
};

const updateUrls = async (shortCode: string, longUrl: string) => {
  const { data, error } = await tryCatch(
    db.query<Url>(
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
};

const getUrl = async (shortCode: string): Promise<Url | null> => {
  const { data, error } = await tryCatch(
    db.query<Url>(
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
};

const urlService = {
  generateRandomShortCode: generateRandomShortCode,
  updateUrls: updateUrls,
  getUrl: getUrl,
};

export default urlService;
