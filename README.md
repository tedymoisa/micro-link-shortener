# Micro-Link Shortener (With Redis Caching and JSON Response)

The goal of this project is to build a simple URL shortening service, similar to Bitly, leveraging distinct microservices for URL management, asynchronous QR code generation, and **Redis for efficient caching of hot links and their QR codes**.

---

## Core Architecture Overview

Here’s a visual representation of the components and their interactions:

```text
+-----------------+      +----------------+      +-----------------+
|   User's        |----->|  API Gateway   |----->|   PostgreSQL    |
|   Browser       |      | (Node/Express) |      |    Database     |
+-----------------+      +----------------+      +-----------------+
                             |    ^    |
                             |    |    | (Check/Store Cache)
         (RabbitMQ Task)     |    |    | (Update Cache)
                             v    v    v
                         +----------------+
                         |     Redis      |
                         |     (Cache)    |
                         +----------------+
                               ^    |
                               |    | (Update QR Code)
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

## The Microservices and Their Roles

#### 1. `api-gateway` (Node.js + Express)

This is the only service the user directly interacts with.

- **Responsibility:**
  - Provides a REST API endpoint `POST /shorten` that accepts a long URL.
  - Generates a unique short code (e.g., `abcdef`).
  - Saves the `short_code -> long_url` mapping in the PostgreSQL database. The `qr_code` field will initially be `NULL`.
  - **Proactively caches the new `short_code` data (long URL and initial `null` QR code) in Redis using a Hash with a TTL.**
  - Publishes a "task" to RabbitMQ: `{"type": "GENERATE_QR", "shortCode": "abcdef", "shortUrl": "http://your-domain.com/abcdef"}`.
  - Provides a lookup endpoint `GET /:shortCode`. When hit:
    1.  **Checks Redis first** for the `short_code`'s details (long URL and QR code).
    2.  **If found in Redis (cache hit):** Returns `long_url` and `qr_code` in a JSON response. This is very fast!
    3.  **If not found in Redis (cache miss):** Queries the PostgreSQL database for _both_ the `long_url` and `qr_code`.
    4.  **If found in PostgreSQL:** Stores _both_ fields in Redis (using a Hash and setting a TTL), then returns them in a JSON response.
    5.  **If not found in PostgreSQL:** Returns a 404 error.
- **Key Learning:** REST API design, synchronous database interaction, publishing to a message broker, **implementing cache-aside pattern with Redis Hashes (`HGETALL`/`HSET` with `EX`), handling multi-field caching.**

#### 2. `qr-code-service` (Node.js, no Express needed)

This is a background worker service.

- **Responsibility:**
  - **Listens to a RabbitMQ queue** for `GENERATE_QR` tasks.
  - When it receives a message (containing `shortCode` and `shortUrl`), it generates a QR code for the `shortUrl` in Base64 format.
  - **Updates the `urls` table in the PostgreSQL database with the generated Base64 QR code** for the corresponding `shortCode`.
  - **Crucially, it also updates the `qr_code` field in the Redis cache** for that `shortCode` using an `HSET` command, ensuring the cache is eventually consistent with the database for the QR code.
- **Key Learning:** Consuming messages from a task queue (RabbitMQ), performing a discrete background job, updating database records, **updating specific fields within a Redis Hash to maintain cache consistency.**

#### 3. `database` (PostgreSQL)

The single source of truth for our data.

- **Responsibility:**
  - Hosts the data for our services.
  - You'll have one table: `urls` (`id`, `short_code`, `long_url`, `created_at`, `qr_code`).
  - Acts as the **fallback** and **source of truth** for `api-gateway` when the cache is missed or invalidated.
- **Key Learning:** Data modeling for microservices, managing a database within Docker.

#### 4. `redis` (Cache)

A super-fast, in-memory data store.

- **Responsibility:**
  - Stores frequently accessed `short_code` details (long URL and QR code) to speed up lookups.
  - Manages the **TTL (Time-To-Live)** for cached entries, ensuring that data eventually expires and forces a refresh from the database, preventing stale data.
- **Key Learning:** Understanding in-memory data stores, caching strategy (cache-aside), `HSET`, `HGETALL`, `EXPIRE` commands for Hash types.

---

## Tips and a Step-by-Step Learning Path

1.  **Start with Docker Compose (Updated!):** Your `docker-compose.yml` file is your best friend. It will define and link all your services. Begin by defining the `postgres`, `rabbitmq`, and `redis` services.

2.  **Build the `api-gateway` First (Pre-Redis):**

    - Create a simple Express app.
    - Connect it to the PostgreSQL container.
    - Implement the `POST /shorten` and `GET /:shortCode` endpoints. Make sure the basic URL shortening works. Ensure the `qr_code` field in the database is set to `NULL` upon initial creation. For `GET /:shortCode`, simply fetch from DB and return as JSON.

3.  **Integrate Redis into `api-gateway`:**

    - Add the `redis` service to your `docker-compose.yml`.
    - In your `api-gateway`, install a Node.js Redis client library (e.g., `redis` or `ioredis`).
    - **For `POST /shorten`:** After successfully saving the URL mapping to PostgreSQL, proactively store this `shortCode`'s `long_url` and `qr_code` (which will be `null` initially) in Redis. Use a Redis Hash and set a TTL for the key. A good starting TTL for testing might be 60 seconds (or 3600 seconds for 1 hour).
      ```typescript
      // Example for node-redis client (using ioredis for HSET/HGETALL syntax)
      // Assume redisClient is connected
      const shortCodeKey = `shortcode:${shortCode}`; // Use a prefix for Redis keys
      await redisClient.hset(shortCodeKey, {
        long_url: longUrl,
        qr_code: null, // Initially null
      });
      await redisClient.expire(shortCodeKey, 3600); // Set TTL for 1 hour
      ```
    - **For `GET /:shortCode`:**

      1.  Before querying PostgreSQL, attempt to `HGETALL` from Redis using the `shortCode` as the key.
      2.  If Redis returns a value (cache hit, check if `Object.keys(cachedData).length > 0`), return `cachedData.long_url` and `cachedData.qr_code` in a JSON response.
      3.  If Redis returns `null` or empty object (cache miss), then query PostgreSQL for _both_ `long_url` and `qr_code`.
      4.  If PostgreSQL returns the data, store it in Redis using `HSET` and `EXPIRE` before returning the JSON response.

          ```typescript
          // Example for node-redis client
          // Assume redisClient and db are connected
          const shortCodeKey = `shortcode:${shortCode}`;

          let data = await redisClient.hgetall(shortCodeKey);

          if (Object.keys(data).length > 0) {
            // Cache hit!
            console.log(`Cache hit for ${shortCode}`);
            return res.json({ long_url: data.long_url, qr_code: data.qr_code });
          }

          // Cache miss, fetch from DB
          console.log(`Cache miss for ${shortCode}, fetching from DB.`);
          const result = await db.query(
            "SELECT long_url, qr_code FROM urls WHERE short_code = $1",
            [shortCode]
          );

          if (result.rows.length > 0) {
            const fetchedData = result.rows[0];
            await redisClient.hset(shortCodeKey, {
              long_url: fetchedData.long_url,
              qr_code: fetchedData.qr_code,
            });
            await redisClient.expire(shortCodeKey, 3600); // Set TTL
            return res.json({
              long_url: fetchedData.long_url,
              qr_code: fetchedData.qr_code,
            });
          } else {
            return res.status(404).send("Short URL not found");
          }
          ```

- **Key Aspect:** Observe how repeated requests for the same short URL (within the TTL) no longer hit PostgreSQL, demonstrating the caching effect.

4.  **Integrate RabbitMQ for QR Codes:** (This part remains largely the same, but adds a Redis update).
    - Add the `rabbitmq` service to your `docker-compose.yml` (if not already done).
    - In your `api-gateway`, use a library like `amqplib` to publish a `GENERATE_QR` message to a queue after a URL is created and saved (and cached).
    - Create the `qr-code-service` as a separate Node.js application. Use `amqplib` to listen to the queue. When it receives a message, use the `qrcode` library to generate the Base64 QR code.
    - The `qr-code-service` should then connect to the same PostgreSQL database and update the `qr_code` field for the respective `short_code`.
    - **Crucially, after updating PostgreSQL, also connect to Redis and update only the `qr_code` field within the corresponding Hash:**
      ```typescript
      // Example in qr-code-service after DB update
      // Assume redisClient is connected
      const shortCodeKey = `shortcode:${shortCode}`;
      await redisClient.hset(shortCodeKey, "qr_code", generatedQrCodeBase64);
      // Note: HSET does not refresh the TTL by default. If you want the cache entry to
      // live longer *after* the QR code is updated, you'd need to re-call EXPIRE:
      // await redisClient.expire(shortCodeKey, 3600); // Re-extend TTL if desired
      ```

This expanded project is fantastic for understanding a more complete microservice pattern, including the critical role of caching for performance and maintaining consistency across distributed systems!
