### Project Idea: "Micro-Link Shortener" (Simplified)

The goal is to build a simple URL shortening service, similar to Bitly, with distinct microservices for URL management and QR code generation.

---

### Core Architecture Overview

Here’s a visual representation of the components and their interactions:

```text
+-----------------+      +----------------+      +-----------------+
|   User's        |----->|  API Gateway   |----->|   PostgreSQL    |
|   Browser       |      | (Node/Express) |      |    Database     |
+-----------------+      +----------------+      +-----------------+
                             |        ^
         (RabbitMQ Task)     |        | (Update QR Code)
                             v        |
                         +----------------+
                         |    RabbitMQ    |
                         | (Task Queue)   |
                         +----------------+
                               |
                               v
                         +-----------------+
                         |  QR Code Service|
                         |    (Node.js)    |
                         +-----------------+
```

---

### The Microservices and Their Roles

#### 1. `api-gateway` (Node.js + Express)

This is the only service the user directly interacts with.

- **Responsibility:**
  - Provides a REST API endpoint `POST /shorten` that accepts a long URL.
  - Generates a unique short code (e.g., `abcdef`).
  - Saves the `short_code -> long_url` mapping in the PostgreSQL database. The `qr_code` field will initially be `NULL`.
  - **Publishes a "task" to RabbitMQ:** `{"type": "GENERATE_QR", "shortCode": "abcdef", "shortUrl": "http://your-domain.com/abcdef"}`.
  - Provides a redirect endpoint `GET /:shortCode`. When hit, it looks up the long URL in the database.
  - Redirects the user to the original long URL.
  - Optionally, it could also provide an endpoint `GET /qr/:shortCode` to retrieve the generated QR code (if the `qr_code` field in the DB is not null).
- **Key Learning:** REST API design, synchronous database interaction, publishing to a message broker.

#### 2. `qr-code-service` (Node.js, no Express needed)

This is a background worker service.

- **Responsibility:**
  - **Listens to a RabbitMQ queue** for `GENERATE_QR` tasks.
  - When it receives a message (containing `shortCode` and `shortUrl`), it generates a QR code for the `shortUrl` in Base64 format.
  - **Updates the `urls` table in the PostgreSQL database with the generated Base64 QR code** for the corresponding `shortCode`.
- **Key Learning:** Consuming messages from a task queue (RabbitMQ), performing a discrete background job, updating database records.

#### 3. `database` (PostgreSQL)

The single source of truth for our data.

- **Responsibility:**
  - Hosts the data for our services.
  - You'll have one table: `urls` (`id`, `short_code`, `long_url`, `created_at`, `qr_code`).
- **Key Learning:** Data modeling for microservices, managing a database within Docker.

---

### Tips and a Step-by-Step Learning Path

1.  **Start with Docker Compose:** Your `docker-compose.yml` file is your best friend. It will define and link all your services. Start by defining the `postgres` and `rabbitmq` services.

2.  **Build the `api-gateway` First:**

    - Create a simple Express app.
    - Connect it to the PostgreSQL container.
    - Implement the `POST /shorten` and `GET /:shortCode` endpoints. Make sure the basic URL shortening and redirecting works. Ensure the `qr_code` field is set to `NULL` upon initial creation.

3.  **Integrate RabbitMQ for QR Codes:**
    - Add the `rabbitmq` service to your `docker-compose.yml` (if not already done).
    - In your `api-gateway`, use a library like `amqplib` to publish a `GENERATE_QR` message to a queue after a URL is created and saved.
    - Create the `qr-code-service` as a separate Node.js application. Use `amqplib` to listen to the queue. When it receives a message, use the `qrcode` library to generate the Base64 QR code.
    - **Crucially:** The `qr-code-service` should then connect to the same PostgreSQL database and update the `qr_code` field for the respective `short_code`. This demonstrates the "task" pattern and asynchronous data update.

This simplified project still provides excellent learning opportunities in microservice architecture, asynchronous communication, containerization, and database interaction. Good luck!
