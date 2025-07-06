import { Request, Response } from "express";
import { ShortenReq } from "./dto/ShortenReq.js";
import { ShortenRes } from "./dto/ShortenRes.js";
import urlService from "../../services/url-service.js";
import { getRabbitMqChannel } from "../../config/rabbitmq.js";

export const createShortUrl = async (req: Request<{}, {}, ShortenReq>, res: Response<ShortenRes>) => {
  const { longUrl } = req.body;

  const shortCode = urlService.generateRandomShortCode();

  const row = await urlService.updateUrls(shortCode, longUrl);
  if (!row) {
    res.status(400);
    return;
  }

  const channel = await getRabbitMqChannel();
  await channel.assertQueue("tasks", { durable: true });
  channel.sendToQueue("tasks", Buffer.from(JSON.stringify({ type: "URL_CREATED", shortCode: shortCode })));

  res.json(row);
};

export const getUrl = () => {};
