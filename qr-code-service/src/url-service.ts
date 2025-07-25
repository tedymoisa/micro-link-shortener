import { ConsumeMessage } from "amqplib";
import logger from "./config/logger.js";
import { UrlRepository } from "./url-repository.js";
import { generateQrCodeAsBase64 } from "./lib/utils.js";
import { RedisClientType } from "redis";
import { RedisCacheService } from "./redis-cache-service.js";

function createUrlService(urlRepository: UrlRepository, redisCacheService: RedisCacheService) {
  return {
    async generateQRCode(msg: ConsumeMessage) {
      const { shortCode, longUrl } = JSON.parse(msg.content.toString()) as { shortCode: string; longUrl: string };
      logger.info(`Processing message for shortCode: ${shortCode}`);

      const qrCode = await generateQrCodeAsBase64(longUrl);

      const url = await urlRepository.updateQrCodePath(shortCode, qrCode);
      if (!url) {
        logger.warn(`Error saving the QR code for: ${shortCode}`);
        return;
      }

      const cacheKey = `url:${shortCode}`;
      await redisCacheService.hSet(
        cacheKey,
        {
          long_url: url.long_url,
          qr_code: url.qr_code,
        },
        120,
      );

      logger.info(`QR code saved for: ${shortCode}`);
    },
  };
}

export default createUrlService;
