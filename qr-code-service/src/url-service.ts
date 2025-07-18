import { ConsumeMessage } from "amqplib";
import { UrlRepository } from "./url-repository.js";
import logger from "./config/logger.js";
import { getFormattedErrorMessage } from "./lib/error.js";

export function createUrlService(urlRepository: UrlRepository) {
  return {
    async generateQRCode(msg: ConsumeMessage): Promise<void> {
      const messageId = msg.properties.messageId || "N/A";

      try {
        const data = JSON.parse(msg.content.toString());
        logger.info(`Processing message ID ${messageId} for shortCode: ${data.shortCode}`);

        const qrCodePath = `QR code for ${data.shortCode}`;

        await urlRepository.updateQrCodePath(data.shortCode, qrCodePath);

        logger.info("Simulated Database update for:", data.shortCode);
      } catch (error) {
        logger.error(getFormattedErrorMessage(`Failed to process message ID ${messageId}.`, error));
      }
    },
  };
}
