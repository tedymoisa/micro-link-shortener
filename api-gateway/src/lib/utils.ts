import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

const validateBody =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Invalid request",
        details: result.error.errors,
      });

      return;
    }

    req.body = result.data as typeof result.data;

    next();
  };

const generateRandomShortCode = (length = 10): string => {
  const characters = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
};

export { generateRandomShortCode, validateBody };
