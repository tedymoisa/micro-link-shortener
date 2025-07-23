import { sendMessage } from "../config/rabbitmq.js";
import { RABBIT_MQ_QUEUES } from "../lib/globals.js";
import { UrlRepository } from "../repositories/url-repository.js";

const createUrlService = (urlRepository: UrlRepository) => {
  return {
    updateUrl: async (shortCode: string, longUrl: string) => {
      const url = await urlRepository.updateUrl(shortCode, longUrl);

      sendMessage(RABBIT_MQ_QUEUES.QR_SERVICE_QUEUE, JSON.stringify({ shortCode, longUrl }));

      return url;
    },

    getLongUrl: async (shortCode: string) => {
      return await urlRepository.getLongUrl(shortCode);
    },
  };
};

export type UrlService = ReturnType<typeof createUrlService>;
export default createUrlService;
