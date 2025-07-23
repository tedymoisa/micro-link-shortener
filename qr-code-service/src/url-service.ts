import { ConsumeMessage } from "amqplib";
import logger from "./config/logger.js";
import { UrlRepository } from "./url-repository.js";
import { generateQrCodeAsBase64 } from "./lib/utils.js";

function createUrlService(urlRepository: UrlRepository) {
  return {
    async generateQRCode(msg: ConsumeMessage) {
      const { shortCode, longUrl } = JSON.parse(msg.content.toString()) as { shortCode: string; longUrl: string };
      logger.info(`Processing message for shortCode: ${shortCode}`);

      const qrCode = await generateQrCodeAsBase64(longUrl);

      const row = await urlRepository.updateQrCodePath(shortCode, qrCode);
      if (!row) {
        logger.warn(`Error saving the QR code for: ${shortCode}`);
        return;
      }

      logger.info(`QR code saved for: ${shortCode}`);
    },
  };
}

export default createUrlService;
