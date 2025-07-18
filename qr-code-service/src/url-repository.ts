import { Pool } from "pg";

export function createUrlRepository(dbClient: Pool) {
  return {
    async updateQrCodePath(shortCode: string, qrCodePath: string): Promise<void> {
      await dbClient.query("UPDATE urls SET qr_code_path = $1 WHERE short_code = $2", [qrCodePath, shortCode]);
    },
  };
}

export type UrlRepository = ReturnType<typeof createUrlRepository>;
