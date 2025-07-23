import { Request, Response } from "express";
import { generateRandomShortCode } from "../../lib/utils.js";
import { UrlService } from "../../services/url-service.js";
import { ShortenReq } from "./dto/shorten-req.js";
import { ShortenRes } from "./dto/shorten-res.js";

const createUrlController = (urlService: UrlService) => {
  return {
    createShortUrl: async (req: Request<unknown, unknown, ShortenReq>, res: Response<ShortenRes>) => {
      const { longUrl } = req.body;

      const shortCode = generateRandomShortCode();

      const row = await urlService.updateUrl(shortCode, longUrl);
      if (!row) {
        res.status(400);
        return;
      }

      res.json(row);
    },

    getUrl: async (req: Request, res: Response) => {
      const { shortCode } = req.params;

      const row = await urlService.getLongUrl(shortCode);
      if (!row) {
        res.status(400);
        return;
      }

      res.json(row);
    },
  };
};

export type UrlController = ReturnType<typeof createUrlController>;
export default createUrlController;
