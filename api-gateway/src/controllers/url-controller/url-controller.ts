import { Request, Response } from "express";
import { ShortenReq } from "./dto/ShortenReq.js";
import { ShortenRes } from "./dto/ShortenRes.js";
import urlService from "../../services/url-service.js";
import { getRabbitMQChannel, publishMessage, sendMessage } from "../../config/rabbitmq.js";
import { RABBIT_MQ_EXHANGES } from "../../lib/rabbitmq-exhanges.js";

export const createShortUrl = async (req: Request<{}, {}, ShortenReq>, res: Response<ShortenRes>) => {
  const { longUrl } = req.body;

  const shortCode = urlService.generateRandomShortCode();

  const row = await urlService.updateUrls(shortCode, longUrl);
  if (!row) {
    res.status(400);
    return;
  }

  // sendMessage("tasks", JSON.stringify({ type: "URL_CREATED", shortCode: shortCode }));
  publishMessage(RABBIT_MQ_EXHANGES.QR_CODE_SERVICE_EXCHANGE, undefined, JSON.stringify({ shortCode: shortCode }));

  res.json(row);
};

export const getUrl = async (req: Request, res: Response) => {
  const { shortCode } = req.params;

  const row = await urlService.getUrl(shortCode);
  if (!row) {
    res.status(400);
    return;
  }

  res.json(row);
};
