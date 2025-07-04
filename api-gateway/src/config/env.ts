import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

export enum PinoLogLevel {
  FATAL = "fatal",
  ERROT = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
  TRACE = "trace",
}

dotenvConfig({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});

const envSchema = z.object({
  PORT: z.string().default("3000"),
  LOG_LEVEL: z.nativeEnum(PinoLogLevel).default(PinoLogLevel.INFO),
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  process.exit(1);
}

export const env = _env.data;
