import { sendMessage } from "../config/rabbitmq.js";
import { Url } from "../entities/Url.js";
import { RABBIT_MQ_QUEUES } from "../lib/globals.js";
import { UrlRepository } from "../repositories/url-repository.js";
import { RedisCacheService } from "./redis-cache-service.js";

const createUrlService = (urlRepository: UrlRepository, redisCacheService: RedisCacheService) => {
  return {
    updateUrl: async (shortCode: string, longUrl: string): Promise<Url | null> => {
      const url = await urlRepository.updateUrl(shortCode, longUrl);

      if (url) {
        const cacheKey = `url:${shortCode}`;
        await redisCacheService.hSet(
          cacheKey,
          {
            long_url: longUrl,
            qr_code: "",
          },
          120,
        );
      }

      sendMessage(RABBIT_MQ_QUEUES.QR_SERVICE_QUEUE, JSON.stringify({ shortCode, longUrl }));

      return url;
    },

    getLongUrl: async (shortCode: string): Promise<string | null> => {
      const cacheKey = `url:${shortCode}`;

      const cachedLongUrl = await redisCacheService.hGet(cacheKey, "long_url");
      if (cachedLongUrl) {
        return cachedLongUrl;
      }

      const url = await urlRepository.getUrl(shortCode);
      if (url) {
        await redisCacheService.hSet(
          cacheKey,
          {
            long_url: url.long_url,
            qr_code: url.qr_code,
          },
          120,
        );

        return url.long_url;
      }

      return null;
    },

    getQrCode: async (shortCode: string): Promise<string | null> => {
      const cacheKey = `url:${shortCode}`;

      const cachedQrCode = await redisCacheService.hGet(cacheKey, "qr_code");
      if (cachedQrCode) {
        return cachedQrCode;
      }

      const url = await urlRepository.getUrl(shortCode);
      if (url) {
        await redisCacheService.hSet(
          cacheKey,
          {
            long_url: url.long_url,
            qr_code: url.qr_code,
          },
          120,
        );

        return url.qr_code;
      }

      return null;
    },
  };
};

export type UrlService = ReturnType<typeof createUrlService>;
export default createUrlService;
