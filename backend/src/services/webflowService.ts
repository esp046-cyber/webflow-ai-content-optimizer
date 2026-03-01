import axios, { type AxiosInstance } from "axios";
import { config } from "../config";
import type {
  WebflowSite,
  WebflowCollection,
  WebflowItem,
  WebflowItemsResponse,
} from "../types";
import { logger } from "../utils/logger";

/**
 * WebflowService — typed wrapper around the Webflow CMS API v2.
 * Each method accepts a `token` so users can connect their own Webflow sites.
 */
export class WebflowService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = config.webflow.apiUrl;
  }

  /** Create an Axios instance pre-configured with a Webflow bearer token */
  private client(token: string): AxiosInstance {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        "accept-version": "1.0.0",
        "Content-Type": "application/json",
      },
      timeout: 30_000,
    });
  }

  // ─── Sites ─────────────────────────────────────────────────────────────────

  /** List all sites accessible with the provided token */
  async getSites(token: string): Promise<WebflowSite[]> {
    logger.debug("WebflowService.getSites");
    const res = await this.client(token).get<{ sites: WebflowSite[] }>(
      "/sites"
    );
    return res.data.sites ?? [];
  }

  /** Get a single site by ID */
  async getSite(token: string, siteId: string): Promise<WebflowSite> {
    logger.debug(`WebflowService.getSite(${siteId})`);
    const res = await this.client(token).get<WebflowSite>(
      `/sites/${siteId}`
    );
    return res.data;
  }

  // ─── Collections ───────────────────────────────────────────────────────────

  /** List all CMS collections for a site */
  async getCollections(
    token: string,
    siteId: string
  ): Promise<WebflowCollection[]> {
    logger.debug(`WebflowService.getCollections(${siteId})`);
    const res = await this.client(token).get<{
      collections: WebflowCollection[];
    }>(`/sites/${siteId}/collections`);
    return res.data.collections ?? [];
  }

  /** Get a single collection with its field schema */
  async getCollection(
    token: string,
    collectionId: string
  ): Promise<WebflowCollection> {
    logger.debug(`WebflowService.getCollection(${collectionId})`);
    const res = await this.client(token).get<WebflowCollection>(
      `/collections/${collectionId}`
    );
    return res.data;
  }

  // ─── Items ─────────────────────────────────────────────────────────────────

  /**
   * List collection items with pagination.
   * Automatically fetches all pages if `fetchAll` is true.
   */
  async getItems(
    token: string,
    collectionId: string,
    options?: {
      limit?: number;
      offset?: number;
      fetchAll?: boolean;
    }
  ): Promise<WebflowItemsResponse> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    logger.debug(
      `WebflowService.getItems(${collectionId}) limit=${limit} offset=${offset}`
    );

    const res = await this.client(token).get<WebflowItemsResponse>(
      `/collections/${collectionId}/items`,
      { params: { limit, offset } }
    );

    if (!options?.fetchAll || res.data.pagination.total <= offset + limit) {
      return res.data;
    }

    // Recursively fetch remaining pages
    const next = await this.getItems(token, collectionId, {
      limit,
      offset: offset + limit,
      fetchAll: true,
    });

    return {
      items: [...res.data.items, ...next.items],
      pagination: {
        ...next.pagination,
        offset: 0,
      },
    };
  }

  /** Get a single collection item */
  async getItem(
    token: string,
    collectionId: string,
    itemId: string
  ): Promise<WebflowItem> {
    logger.debug(`WebflowService.getItem(${itemId})`);
    const res = await this.client(token).get<WebflowItem>(
      `/collections/${collectionId}/items/${itemId}`
    );
    return res.data;
  }

  // ─── Mutations ─────────────────────────────────────────────────────────────

  /**
   * Update a single item's field data (PATCH).
   * Returns the updated item.
   */
  async updateItem(
    token: string,
    collectionId: string,
    itemId: string,
    fieldData: Record<string, unknown>
  ): Promise<WebflowItem> {
    logger.debug(`WebflowService.updateItem(${itemId})`);
    const res = await this.client(token).patch<WebflowItem>(
      `/collections/${collectionId}/items/${itemId}`,
      { fieldData }
    );
    return res.data;
  }

  /**
   * Bulk PATCH up to 100 items in a single request.
   * Webflow v2 supports bulk updates via /collections/:id/items endpoint.
   */
  async bulkUpdateItems(
    token: string,
    collectionId: string,
    updates: Array<{ id: string; fieldData: Record<string, unknown> }>
  ): Promise<{ updatedItems: WebflowItem[]; errors: unknown[] }> {
    logger.debug(
      `WebflowService.bulkUpdateItems(${collectionId}) count=${updates.length}`
    );

    // Webflow v2 bulk PATCH
    const res = await this.client(token).patch<{
      updatedItems: WebflowItem[];
      errors: unknown[];
    }>(`/collections/${collectionId}/items`, {
      items: updates.map((u) => ({ id: u.id, fieldData: u.fieldData })),
    });

    return {
      updatedItems: res.data.updatedItems ?? [],
      errors: res.data.errors ?? [],
    };
  }

  /**
   * Publish draft items (makes them live).
   * Accepts up to 100 item IDs.
   */
  async publishItems(
    token: string,
    collectionId: string,
    itemIds: string[]
  ): Promise<void> {
    logger.debug(
      `WebflowService.publishItems(${collectionId}) count=${itemIds.length}`
    );
    await this.client(token).post(
      `/collections/${collectionId}/items/publish`,
      { itemIds }
    );
  }
}

export const webflowService = new WebflowService();
