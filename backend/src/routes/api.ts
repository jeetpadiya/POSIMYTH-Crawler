import { Router } from "express";
import { crawlWebsite } from "../controllers/crawlController.js";
import { askQuestion } from "../controllers/chatController.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "crawler-rag-api",
  });
});

router.post("/crawl", crawlWebsite);
router.post("/chat", askQuestion);

export default router;
