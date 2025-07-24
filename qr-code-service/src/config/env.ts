import { z } from "zod";
import { config as dotenvConfig } from "dotenv";

dotenvConfig({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});

export enum PinoLogLevel {
  FATAL = "fatal",
  ERROT = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
  TRACE = "trace",
}

const envSchema = z.object({
  LOG_LEVEL: z.nativeEnum(PinoLogLevel).default(PinoLogLevel.INFO),
  DB_HOST: z.string(),
  DB_PORT: z.string().default("5432"),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_DATABASE: z.string(),
  REDIS_HOST: z.string(),
  REDIS_PASSWORD: z.string(),
  REDIS_PORT: z.string().default("6379"),
  REDIS_DATABASE: z.string().default("0"),
  RABBIT_MQ_HOST: z.string(),
  RABBIT_MQ_USER: z.string(),
  RABBIT_MQ_PASSWORD: z.string(),
  RABBIT_MQ_PORT: z.string().default("5672"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const _env = envSchema.safeParse(process.env);
if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  process.exit(1);
}

const env = _env.data;

export default env;
