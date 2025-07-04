### Project Idea: "Micro-Link Shortener"

The goal is to build a simple URL shortening service, similar to Bitly, but broken down into distinct microservices. This project is perfect because the tasks are small, clearly defined, and showcase different communication patterns.

---

### Core Architecture Overview

Here’s a visual representation of the components and their interactions:

```text
+-----------------+      +----------------+      +-----------------+
|   User's        |----->|  API Gateway   |----->|   PostgreSQL    |
|   Browser       |      | (Node/Express) |      |    Database     |
+-----------------+      +----------------+      +-----------------+
                             |        |
         (RabbitMQ Task)     |        | (Kafka Event)
                             v        v
+-----------------+      +----------------+      +-----------------+
|  QR Code Service|      |    RabbitMQ    |      |      Kafka      |
|    (Node.js)    |<- - -|                |      |                 |
+-----------------+      +----------------+      +-----------------+
                                                       |
                                                       | (Consumes Event)
                                                       v
                                                 +-----------------+
                                                 | Analytics Service|
                                                 |    (Node.js)    |
                                                 +-----------------+
                                                       |
                                                       v
                                                 +-----------------+
                                                 |   PostgreSQL    |
                                                 | (Updates stats) |
                                                 +-----------------+
```

**Observability Stack (Monitors everything above):**
*   **Metrics:** Prometheus & Grafana
*   **Logs:** Loki & Promtail

---

### The Microservices and Their Roles

#### 1. `api-gateway` (Node.js + Express)
This is the only service the user directly interacts with.
*   **Responsibility:**
    *   Provides a REST API endpoint `POST /shorten` that accepts a long URL.
    *   Generates a unique short code (e.g., `abcdef`).
    *   Saves the `short_code -> long_url` mapping in the PostgreSQL database.
    *   **Publishes a "task" to RabbitMQ:** `{"type": "URL_CREATED", "shortCode": "abcdef"}`.
    *   Provides a redirect endpoint `GET /:shortCode`. When hit, it looks up the long URL in the database.
    *   **Publishes an "event" to Kafka:** `{"type": "URL_VISITED", "shortCode": "abcdef", "timestamp": "...", "userAgent": "..."}`.
    *   Redirects the user to the original long URL.
*   **Key Learning:** REST API design, synchronous database interaction, publishing to two different message brokers.

#### 2. `qr-code-service` (Node.js, no Express needed)
This is a background worker service.
*   **Responsibility:**
    *   **Listens to a RabbitMQ queue** for `URL_CREATED` tasks.
    *   When it receives a message, it generates a QR code for the short URL (e.g., `http://your-domain.com/abcdef`).
    *   Saves the QR code image to a shared volume or updates the database with the image data. (For simplicity, just log "Generated QR for abcdef" to the console).
*   **Key Learning:** Consuming messages from a task queue (RabbitMQ), performing a discrete background job.

#### 3. `analytics-service` (Node.js, no Express needed)
This is another background worker service for processing events.
*   **Responsibility:**
    *   **Subscribes to a Kafka topic** for `URL_VISITED` events.
    *   When it receives an event, it updates the analytics data in the PostgreSQL database (e.g., increments a `visit_count` for that `shortCode`).
*   **Key Learning:** Consuming from an event stream (Kafka), handling high-throughput data, updating database records.

#### 4. `database` (PostgreSQL)
The single source of truth for our data.
*   **Responsibility:**
    *   Hosts the data for our services.
    *   You'll likely have two tables:
        1.  `urls` (`id`, `short_code`, `long_url`, `created_at`, `qr_code_path`).
        2.  `url_analytics` (`id`, `url_id`, `visit_count`, `last_visited_at`).
*   **Key Learning:** Data modeling for microservices, managing a database within Docker.

#### 5. The Infrastructure & Observability Stack
These are not services you write code for, but ones you configure.
*   **RabbitMQ:** A message broker ideal for **task queues**. You send a command to a specific worker. "Please do this job."
*   **Kafka:** A distributed event streaming platform. You publish a fact (event) that has happened. Any number of services can listen and react to it. "This thing just happened."
*   **Prometheus:** A time-series database that **pulls** metrics from your services (e.g., from a `/metrics` endpoint).
*   **Grafana:** A visualization tool to create dashboards from data in Prometheus (for metrics) and Loki (for logs).
*   **Loki & Promtail:** A log aggregation system. **Promtail** is an agent that **pushes** logs from your services to **Loki**, which stores and indexes them.

---

### Tips and a Step-by-Step Learning Path

1.  **Start with Docker Compose:** Your `docker-compose.yml` file is your best friend. It will define and link all your services. Start by defining the infrastructure: `postgres`, `rabbitmq`, `kafka`, `zookeeper` (Kafka needs it).

2.  **Build the `api-gateway` First:**
    *   Create a simple Express app.
    *   Connect it to the PostgreSQL container.
    *   Implement the `POST /shorten` and `GET /:shortCode` endpoints *without* any messaging yet. Make sure the basic URL shortening and redirecting works.

3.  **Integrate RabbitMQ for QR Codes:**
    *   Add the `rabbitmq` service to your `docker-compose.yml`.
    *   In your `api-gateway`, use a library like `amqplib` to publish a message after a URL is created.
    *   Create the `qr-code-service`. Use `amqplib` to listen to the queue and log a message. This demonstrates the "task" pattern.

4.  **Integrate Kafka for Analytics:**
    *   Add `kafka` and `zookeeper` to your `docker-compose.yml`.
    *   In your `api-gateway`, use a library like `kafkajs` to publish an event when a URL is visited.
    *   Create the `analytics-service`. Use `kafkajs` to consume from the topic and log the event. This demonstrates the "event-driven" pattern.

5.  **Add Metrics (Prometheus):**
    *   In your Node.js services (`api-gateway`, `qr-code-service`, `analytics-service`), add the `prom-client` library.
    *   Expose a `/metrics` endpoint on your Express service. For the worker services, you can spin up a tiny server just for this endpoint.
    *   Add `prometheus` and `grafana` to `docker-compose.yml`. Configure Prometheus to scrape the `/metrics` endpoints of your services.

6.  **Add Logging (Loki):**
    *   The simplest way is to just log to `console.log()` in your Node.js apps. Docker captures this output.
    *   Add `loki` and `promtail` to your `docker-compose.yml`.
    *   Configure `promtail` to discover your running containers and send their logs to Loki.
    *   In Grafana, add Loki as a data source and explore your logs.

This project forces you to learn the most critical aspects of a microservice architecture: service discovery (via Docker networking), different communication styles (REST, task queue, event stream), containerization, and observability, all within a manageable scope. Good luck
