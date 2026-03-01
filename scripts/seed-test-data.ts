#!/usr/bin/env tsx
/**
 * Seed script — verifies your Webflow connection and lists available collections.
 * Usage: tsx scripts/seed-test-data.ts
 */

import dotenv from "dotenv";
import path from "path";
import axios from "axios";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const WEBFLOW_TOKEN = process.env.WEBFLOW_API_TOKEN;
const APP_API_KEY = process.env.APP_API_KEY;
const API_BASE = `http://localhost:${process.env.PORT ?? 3001}`;

if (!WEBFLOW_TOKEN) {
  console.error("❌ WEBFLOW_API_TOKEN not set in .env");
  process.exit(1);
}

async function main() {
  console.log("🔍 Verifying Webflow connection...\n");

  try {
    // 1. Check health
    const health = await axios.get(`${API_BASE}/health`);
    console.log("✅ Server healthy:", health.data.status);

    // 2. List sites
    const sites = await axios.get(`${API_BASE}/api/webflow/sites`, {
      headers: {
        "X-API-Key": APP_API_KEY,
        "X-Webflow-Token": WEBFLOW_TOKEN,
      },
    });

    console.log(`\n✅ Found ${sites.data.data.length} site(s):\n`);
    for (const site of sites.data.data) {
      console.log(`  📦 ${site.displayName} (${site.id})`);

      // 3. List collections per site
      const cols = await axios.get(
        `${API_BASE}/api/webflow/sites/${site.id}/collections`,
        {
          headers: {
            "X-API-Key": APP_API_KEY,
            "X-Webflow-Token": WEBFLOW_TOKEN,
          },
        }
      );

      for (const col of cols.data.data) {
        console.log(`     └─ 📋 ${col.displayName} (${col.id}) — ${col.fields.length} fields`);
      }
    }

    console.log("\n🎉 Connection verified! You're ready to run optimizations.\n");
    console.log("Next steps:");
    console.log("  1. Open http://localhost:5173");
    console.log("  2. Enter your API keys in the Connect panel");
    console.log("  3. Select a collection and run a dry-run optimization");
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error("❌ API Error:", err.response?.data ?? err.message);
    } else {
      console.error("❌ Error:", (err as Error).message);
    }
    process.exit(1);
  }
}

main();
