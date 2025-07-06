import { Router } from "express";
import { createShortUrl, getUrl } from "../controllers/url-controller/url-controller.js";
import { validateBody } from "../lib/utils.js";
import { shortenReqSchema } from "../controllers/url-controller/dto/ShortenReq.js";

const urlRouter = Router();

urlRouter.post("/shorten", validateBody(shortenReqSchema), createShortUrl);
urlRouter.get("/:shortCode", getUrl);

export default urlRouter;
