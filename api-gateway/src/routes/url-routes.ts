import { Router } from "express";
import { shortenReqSchema } from "../controllers/url-controller/dto/shorten-req.js";
import { UrlController } from "../controllers/url-controller/url-controller.js";
import { validateBody } from "../lib/utils.js";

const createUrlRouter = (urlController: UrlController) => {
  const router = Router();

  router.post("/shorten", validateBody(shortenReqSchema), urlController.createShortUrl);
  router.get("/:shortCode/url", urlController.getLongUrl);
  router.get("/:shortCode/qr", urlController.getQrCode);

  return router;
};

export type UrlRouter = ReturnType<typeof createUrlRouter>;
export default createUrlRouter;
