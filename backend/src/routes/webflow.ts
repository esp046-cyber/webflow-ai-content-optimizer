import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { webflowService } from "../services/webflowService";
import { AppError } from "../middleware/errorHandler";

export const webflowRouter = Router();

/** Extract and validate the Webflow token from the request */
function getToken(req: Request): string {
  const token =
    (req.headers["x-webflow-token"] as string) ??
    (req.body?.webflowToken as string) ??
    (req.query["webflowToken"] as string);

  if (!token) {
    throw new AppError(
      400,
      "Missing Webflow API token. Provide it in the X-Webflow-Token header."
    );
  }
  return token;
}

// ─── Sites ─────────────────────────────────────────────────────────────────────

/** GET /api/webflow/sites — list all sites */
webflowRouter.get("/sites", async (req: Request, res: Response) => {
  const token = getToken(req);
  const sites = await webflowService.getSites(token);
  res.json({ success: true, data: sites });
});

/** GET /api/webflow/sites/:siteId — get a site */
webflowRouter.get("/sites/:siteId", async (req: Request, res: Response) => {
  const token = getToken(req);
  const site = await webflowService.getSite(token, req.params.siteId!);
  res.json({ success: true, data: site });
});

// ─── Collections ───────────────────────────────────────────────────────────────

/** GET /api/webflow/sites/:siteId/collections — list collections */
webflowRouter.get(
  "/sites/:siteId/collections",
  async (req: Request, res: Response) => {
    const token = getToken(req);
    const collections = await webflowService.getCollections(
      token,
      req.params.siteId!
    );
    res.json({ success: true, data: collections });
  }
);

/** GET /api/webflow/collections/:collectionId — get collection + schema */
webflowRouter.get(
  "/collections/:collectionId",
  async (req: Request, res: Response) => {
    const token = getToken(req);
    const collection = await webflowService.getCollection(
      token,
      req.params.collectionId!
    );
    res.json({ success: true, data: collection });
  }
);

// ─── Items ─────────────────────────────────────────────────────────────────────

const listItemsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(100),
  offset: z.coerce.number().min(0).optional().default(0),
  fetchAll: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional()
    .default("false"),
});

/** GET /api/webflow/collections/:collectionId/items */
webflowRouter.get(
  "/collections/:collectionId/items",
  async (req: Request, res: Response) => {
    const token = getToken(req);
    const query = listItemsSchema.parse(req.query);
    const result = await webflowService.getItems(
      token,
      req.params.collectionId!,
      { limit: query.limit, offset: query.offset, fetchAll: query.fetchAll }
    );
    res.json({ success: true, data: result });
  }
);

/** GET /api/webflow/collections/:collectionId/items/:itemId */
webflowRouter.get(
  "/collections/:collectionId/items/:itemId",
  async (req: Request, res: Response) => {
    const token = getToken(req);
    const item = await webflowService.getItem(
      token,
      req.params.collectionId!,
      req.params.itemId!
    );
    res.json({ success: true, data: item });
  }
);
