import z from "zod";

export const shortenReqSchema = z.object({
  longUrl: z.string().url(),
});

export type ShortenReq = z.infer<typeof shortenReqSchema>;
