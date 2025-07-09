import { Pool } from "pg";
import {
  closeRabbitMQ,
  connectRabbitMQ,
  startConsuming,
} from "./rabbitmq-client";
import { Channel, ConsumeMessage } from "amqplib";

const db = new Pool({
  host: "localhost",
  port: 5432,
  user: "user",
  password: "pass",
  database: "db",
});

async function processTaskMessage(msg: ConsumeMessage, channel: Channel) {
  const messageId = msg.properties.messageId || "N/A";
  try {
    const data = JSON.parse(msg.content.toString());
    console.info(
      `Processing message ID ${messageId} for shortCode: ${data.shortCode}`
    );

    const qrCodePath = `QR code for ${data.shortCode}`;
    await db.query("UPDATE urls SET qr_code_path = $1 WHERE short_code = $2", [
      qrCodePath,
      data.shortCode,
    ]);
    console.log("Simulated Database update for:", data.shortCode);

    channel.ack(msg);
    console.info(
      `Acknowledged message ID ${messageId} for shortCode: ${data.shortCode}`
    );
  } catch (err: any) {
    console.error(`Failed to process message ID ${messageId}:`, err.message);

    if (err instanceof SyntaxError) {
      console.error(
        `Message ID ${messageId} is a poison pill (malformed JSON), NOT requeueing.`
      );
      channel.nack(msg, false, false);
    } else if (
      err.code === "DB_CONNECTION_ERROR" ||
      err.message.includes("network")
    ) {
      console.warn(`Transient error for message ID ${messageId}, requeueing.`);
      channel.nack(msg, false, true);
    } else {
      console.error(
        `Unhandled processing error for message ID ${messageId}, NOT requeueing (default).`
      );
      channel.nack(msg, false, false);
    }
  }
}

async function startWorkerApplication() {
  const QUEUE_NAME = "url.created";
  try {
    await connectRabbitMQ();
    console.info("Worker: RabbitMQ connection established.");

    await startConsuming(processTaskMessage);

    console.info(`Worker is listening for tasks on queue: "${QUEUE_NAME}"...`);
  } catch (error) {
    console.error(
      "Worker application failed to start due to RabbitMQ connection error."
    );
    process.exit(1);
  }
}

startWorkerApplication();

process.on("SIGINT", async () => {
  console.info("Worker: SIGINT received, gracefully shutting down...");
  await closeRabbitMQ();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.info("Worker: SIGTERM received, gracefully shutting down...");
  await closeRabbitMQ();
  process.exit(0);
});
