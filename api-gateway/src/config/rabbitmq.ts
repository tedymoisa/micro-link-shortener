import amqp, { Connection, Channel, ChannelModel } from "amqplib";
import logger from "./logger.js";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function getRabbitMqChannel(): Promise<Channel> {
  if (channel) return channel;

  connection = await amqp.connect("amqp://user:pass@localhost:5672");
  if (!connection) {
    console.error("❌ Error connecting to RabbitMQ");
  }

  channel = await connection.createChannel();
  if (!channel) {
    console.error("❌ Error connecting to RabbitMQ channel");
  }

  logger.info("RabbitMQ ready to send event taks!");

  return channel;
}
