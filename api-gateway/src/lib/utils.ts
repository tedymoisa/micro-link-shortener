import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodSchema } from "zod";

export const validateBody =
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
