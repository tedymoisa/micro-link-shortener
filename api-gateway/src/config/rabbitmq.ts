import amqp, { Channel, ChannelModel } from "amqplib";
import logger from "./logger.js";
import env from "./env.js";

let connection: ChannelModel;
let channel: Channel | null = null;

try {
  connection = await amqp.connect(
    `amqp://${env.RABBIT_MQ_USER}:${env.RABBIT_MQ_PASSWORD}@${env.RABBIT_MQ_HOST}:${env.RABBIT_MQ_PORT}`,
  );
  channel = await connection.createChannel();
  logger.info("Successfully connected to RabbitMQ!");
} catch (error) {
  logger.error("Error connecting to RabbitMQ!", error);
  process.exit(1);
}

export default channel;
