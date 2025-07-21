import { ConsumeMessage } from "amqplib";
import logger from "./config/logger.js";
import { UrlRepository } from "./url-repository.js";

function createUrlService(urlRepository: UrlRepository) {
  return {
    async generateQRCode(msg: ConsumeMessage) {
      const data = JSON.parse(msg.content.toString()) as { shortCode: string };
      logger.info(`Processing message for shortCode: ${data.shortCode}`);

      const qrCodePath = `QR code for ${data.shortCode}`;

      const row = await urlRepository.updateQrCodePath(data.shortCode, qrCodePath);
      if (!row) {
        logger.warn(`Error saving the QR code for: ${data.shortCode}`);
        return;
      }

      logger.info(`QR code saved for: ${data.shortCode}`);
    },
  };
}

export default createUrlService;
