import amqp from "amqplib";
import { Pool } from "pg";

const db = new Pool({
  host: "localhost",
  port: 5432,
  user: "user",
  password: "pass",
  database: "db",
});

async function startWorker() {
  const conn = await amqp.connect("amqp://user:pass@localhost:5672");
  const channel = await conn.createChannel();
  await channel.assertQueue("tasks", { durable: true });

  channel.consume(
    "tasks",
    async (msg) => {
      if (msg) {
        try {
          const data = JSON.parse(msg.content.toString());

          const qrCodePath = `QR code for ${data.shortCode}`;

          await db.query(
            "UPDATE urls SET qr_code_path = $1 WHERE short_code = $2",
            [qrCodePath, data.shortCode]
          );
          console.log("Database updated for:", data.shortCode);
          channel.ack(msg);
        } catch (err) {
          console.error("Failed to process message:", err);
          // Optionally: channel.nack(msg, false, true); // requeue the message
        }
      }
    },
    { noAck: false }
  );

  console.log("Worker is listening for tasks...");
}

startWorker().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
