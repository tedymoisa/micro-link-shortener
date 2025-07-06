### Project Idea: "Micro-Link Shortener with OpenTelemetry"

The goal remains to build a simple URL shortening service, but now with a deep focus on gaining insight into its distributed behavior using OpenTelemetry. This project is perfect for learning because it forces you to instrument your code, understand context propagation, and configure a complete observability backend.

---

### Core Architecture Overview

Here’s the updated visual representation, highlighting the OpenTelemetry components:

```text
+-----------------+      +----------------+      +-----------------+
|   User's        |----->|  API Gateway   |----->|   PostgreSQL    |
|   Browser       |      | (Node/Express) |      |    Database     |
+-----------------+      +----------------+      +-----------------+
        ^                  |        |                  ^
        |                  |        |                  |
   (OTel SDKs)             |        | (Kafka Event)    | (OTel SDKs)
        |                  v        v                  |
        |          +----------------+      +-----------------+
        |          |    RabbitMQ    |      |      Kafka      |
        |<- - - - -|                |      |                 |
        |          +----------------+      +-----------------+
        |                                        |
        | (OTel SDKs)                            | (Consumes Event)
        |                                        v
+-----------------+                      +-----------------+
|  QR Code Service|                      | Analytics Service|
|    (Node.js)    |                      |    (Node.js)    |
+-----------------+                      +-----------------+
        ^                                        ^
        | (OTLP Export)                          | (OTLP Export)
        +----------------------------------------+
                               |
                               v
                     +---------------------+
                     | OpenTelemetry       |
                     | Collector (OTLP)    |
                     +---------------------+
                               |
            +------------------+------------------+
            |                  |                  |
            v                  v                  v
    +--------------+   +--------------+   +--------------+
    |   Jaeger     |   |   Prometheus |   |   Loki       |
    |  (Traces)    |   |  (Metrics)   |   |  (Logs)      |
    +--------------+   +--------------+   +--------------+
            ^                  ^                  ^
            | (Query/Visualize)| (Query/Visualize)| (Query/Visualize)
            +------------------+------------------+
                               |
                               v
                     +-----------------+
                     |     Grafana     |
                     | (Dashboards &   |
                     |  Explore)       |
                     +-----------------+
```

---

### The Microservices and Their Roles (Updated for OpenTelemetry)

#### 1. `api-gateway` (Node.js + Express)

- **Responsibilities:**
  - REST API: `POST /shorten`, `GET /:shortCode`.
  - Database: Save `short_code -> long_url` mapping in PostgreSQL.
  - RabbitMQ: Publish `URL_CREATED` task (`{"type": "URL_CREATED", "shortCode": "abcdef"}`).
  - Kafka: Publish `URL_VISITED` event (`{"type": "URL_VISITED", "shortCode": "abcdef", "timestamp": "...", "userAgent": "..."}`).
- **OpenTelemetry Instrumentation:**
  - **Tracing:** Use OTel Node.js SDK with auto-instrumentation for Express, `pg` (PostgreSQL), `amqplib` (RabbitMQ), and `kafkajs`. Manually create spans for custom logic like short code generation, database interactions, and message publishing. Crucially, OTel will propagate trace context through HTTP headers and message broker headers (if configured).
  - **Metrics:** Auto-instrumentation for HTTP requests (latency, count). Manually increment a counter for `short_urls_created_total`. Track request duration as a histogram.
  - **Logs:** Configure your logger (e.g., Winston, Pino) to integrate with OTel, adding trace and span IDs to log records automatically. Export logs as OTLP.
- **Key Learning:** Full OTel instrumentation across synchronous (HTTP, DB) and asynchronous (MQ) communication.

#### 2. `qr-code-service` (Node.js Worker)

- **Responsibilities:**
  - RabbitMQ: Listen to `URL_CREATED` tasks.
  - Generate QR code (or simulate it with a log message for simplicity).
- **OpenTelemetry Instrumentation:**
  - **Tracing:** Auto-instrumentation for `amqplib` (should pick up trace context from RabbitMQ message headers). Manually create spans for QR generation logic.
  - **Metrics:** Manually increment a counter for `qr_codes_generated_total`. Track processing duration.
  - **Logs:** Integrate logger with OTel to add trace/span IDs. Export logs as OTLP.
- **Key Learning:** Consuming trace context from a task queue, instrumenting background workers.

#### 3. `analytics-service` (Node.js Worker)

- **Responsibilities:**
  - Kafka: Subscribe to `URL_VISITED` events.
  - Database: Update `visit_count` in PostgreSQL.
- **OpenTelemetry Instrumentation:**
  - **Tracing:** Auto-instrumentation for `kafkajs` (should pick up trace context from Kafka message headers). Auto-instrumentation for `pg` (PostgreSQL).
  - **Metrics:** Increment `url_visits_processed_total`. Track duration of database updates.
  - **Logs:** Integrate logger with OTel to add trace/span IDs. Export logs as OTLP.
- **Key Learning:** Consuming trace context from an event stream, instrumenting database updates from a worker.

#### 4. `database` (PostgreSQL)

- **Responsibility:** Central data store for `urls` and `url_analytics`.
- **OpenTelemetry Role:** Your Node.js services will have their `pg` client instrumented by OTel, so database calls will appear as spans in your traces.

#### 5. The OpenTelemetry Observability Stack

These are the components you'll configure via `docker-compose.yml`.

- **OpenTelemetry Collector (`otel-collector-contrib` Docker image):**
  - Acts as a central processing pipeline for all observability data.
  - **Receivers:** Configured to accept OTLP (OpenTelemetry Protocol) data from your Node.js services.
  - **Processors:** Can enrich data (e.g., add service names, resource attributes).
  - **Exporters:**
    - Exports traces to Jaeger.
    - Exports metrics to Prometheus (by exposing a Prometheus scrape endpoint that Prometheus then pulls from).
    - Exports logs to Loki.
- **Jaeger:**
  - A distributed tracing system that collects, stores, and visualizes trace data received from the OTel Collector.
  - **Key Learning:** Visualizing call flows, identifying latency bottlenecks across services.
- **Prometheus:**
  - A monitoring system that scrapes (pulls) metrics from the OTel Collector.
  - **Key Learning:** Collecting and storing time-series metrics.
- **Loki:**
  - A log aggregation system, similar to Prometheus but for logs. It stores and indexes logs received from the OTel Collector.
  - **Key Learning:** Centralized logging, correlating logs with traces.
- **Grafana:**
  - A powerful open-source platform for data visualization and monitoring.
  - Connects to Prometheus (for metrics) and Loki (for logs).
  - Can also integrate with Jaeger to allow "trace drill-down" from metrics or logs.
  - **Key Learning:** Building dashboards, exploring metrics and logs, cross-observability correlation.

---

### Tips and a Step-by-Step Learning Path

1.  **Understand OpenTelemetry Basics:** Before coding, read up on OTel concepts: Traces (spans, context propagation), Metrics (counters, gauges, histograms), Logs (structured logs with trace context), and the OTLP protocol.
2.  **Start with Docker Compose:**
    - Define `postgres`, `rabbitmq`, `kafka`, `zookeeper`.
    - Add `jaeger-all-in-one`, `prometheus`, `loki`, `grafana`.
    - **Crucially, add `otel-collector-contrib`**: This will be the centerpiece of your observability. Configure its `receivers` (OTLP), `processors`, and `exporters` (Jaeger, Prometheus, Loki).
3.  **Build `api-gateway` and Basic OTel Tracing:**
    - Set up a simple Express app.
    - **Integrate OTel Node.js SDK:**
      - Install necessary `@opentelemetry/sdk-node`, `@opentelemetry/api`, `@opentelemetry/exporter-otlp-proto-http`, and auto-instrumentation packages (`@opentelemetry/instrumentation-express`, `@opentelemetry/instrumentation-pg`, etc.).
      - Initialize the `NodeSDK` in your app's entry point, pointing its exporter to your OTel Collector (e.g., `http://otel-collector:4318/v1/traces`).
    - Implement `POST /shorten` and `GET /:shortCode` to use PostgreSQL.
    - Test by sending requests and **checking Jaeger UI** (e.g., `http://localhost:16686`) to see traces. You should see spans for HTTP requests and database calls.
4.  **Add OTel Metrics to `api-gateway`:**
    - Use OTel SDK's MeterProvider.
    - Implement a custom counter (`short_urls_created_total`) to increment when a URL is shortened.
    - Ensure auto-instrumentation provides HTTP request metrics.
    - Test and check Prometheus UI (e.g., `http://localhost:9090`) for metrics, then Grafana.
5.  **Add OTel Logging to `api-gateway`:**
    - Configure a logger (Winston, Pino, or even just `console.log` wrapped) to automatically include trace/span IDs provided by OTel context.
    - Configure the OTel SDK to export logs (e.g., via OTLP to the collector).
    - Test and check Loki via Grafana to see logs correlated with traces.
6.  **Integrate RabbitMQ & Kafka with OTel:**
    - In `api-gateway`, add RabbitMQ publishing and Kafka event publishing. Ensure OTel auto-instrumentation for `amqplib` and `kafkajs` is enabled; it should automatically inject trace context into message headers.
    - Create `qr-code-service` and `analytics-service`.
    - **Crucially:** Ensure these worker services also have the OTel Node.js SDK configured and running, with appropriate auto-instrumentation. When they consume messages, OTel should automatically extract the trace context from the message headers, continuing the trace.
    - Test the full flow (shorten URL, visit URL) and observe the end-to-end traces in Jaeger, showing the journey through RabbitMQ/Kafka and all services.
7.  **Refine OTel Instrumentation:**
    - Add more meaningful manual spans for specific business logic.
    - Create custom metrics for other key operations.
    - Ensure all services are consistently logging with trace/span IDs.
8.  **Build Grafana Dashboards:**
    - Connect Grafana to Prometheus (for metrics), Loki (for logs), and Jaeger (for traces).
    - Create dashboards visualizing key metrics (e.g., short URLs created per second, average redirect time).
    - Use Grafana's explore feature to query logs and traces, demonstrating correlation.

This revised project provides a comprehensive hands-on experience with modern microservice architecture and cutting-edge observability using OpenTelemetry. Good luck!
