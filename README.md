# 🚀 Webflow AI Content Optimizer

> **ML-driven content generation, intelligent SEO rewrites, and one-click auto-bulk updates for any Webflow site.**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/webflow-ai-content-optimizer)

![Dashboard Preview](docs/dashboard-preview.png)

---

## ✨ Features

- **🔗 Webflow Integration** — Connect any Webflow site via API key, browse all CMS collections and items
- **✍️ AI Content Generation** — GPT-4o powered content creation with tone, keyword, and template controls
- **🔍 SEO Rewrite Engine** — Analyze & optimize titles, meta descriptions, readability scores, keyword density, and E-E-A-T signals
- **⚡ Auto Bulk Updates** — Process 100+ items in parallel with real-time progress, dry-run preview, and instant rollback
- **📊 Live Dashboard** — Real-time logs, SEO score improvements, time-saved metrics, downloadable CSV reports
- **🔐 Secure Auth** — API-key authentication with per-route rate limiting

---

## 🏗️ Architecture

```
webflow-ai-content-optimizer/
├── backend/                  # Node.js 20 + Express + TypeScript API
│   ├── src/
│   │   ├── index.ts          # Server entry point
│   │   ├── config.ts         # Environment config
│   │   ├── middleware/       # Auth, rate limiting, error handling
│   │   ├── routes/           # webflow, ai, jobs endpoints
│   │   ├── services/         # WebflowService, OpenAIService, SEOService, JobService
│   │   ├── types/            # TypeScript interfaces
│   │   └── utils/            # Helpers, CSV export, logger
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # React 18 + Vite + Tailwind + shadcn/ui
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/            # Dashboard, Collections, Jobs
│   │   ├── components/       # UI components
│   │   ├── hooks/            # useWebflow, useJob, useSSE
│   │   ├── store/            # Zustand state
│   │   └── lib/              # API client, utils
│   ├── package.json
│   └── vite.config.ts
├── scripts/                  # Dev utilities
├── docker-compose.yml
├── render.yaml
└── vercel.json
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- OpenAI API key
- Webflow API key (site token)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/webflow-ai-content-optimizer
cd webflow-ai-content-optimizer

# Install all dependencies
npm run install:all
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

Required environment variables:

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `APP_API_KEY` | Secret key to protect your API |
| `PORT` | Backend port (default: 3001) |
| `FRONTEND_URL` | Frontend URL for CORS |

### 3. Run Development Servers

```bash
# Run both frontend + backend concurrently
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api/docs

---

## 📡 API Reference

### Authentication

All API requests require the `X-API-Key` header:

```
X-API-Key: your-secret-app-api-key
```

### Endpoints

#### Webflow

```
GET  /api/webflow/sites              → List connected sites
GET  /api/webflow/collections        → List collections for a site
GET  /api/webflow/collections/:id/items → List items (with pagination)
```

#### AI Operations

```
POST /api/ai/generate                → Generate new content
POST /api/ai/seo-rewrite             → SEO-optimize existing content
POST /api/ai/analyze                 → Analyze SEO score of text
```

#### Bulk Jobs

```
POST /api/jobs                       → Create bulk job (dry-run or live)
GET  /api/jobs/:id                   → Get job status + progress
GET  /api/jobs/:id/stream            → SSE stream for real-time logs
POST /api/jobs/:id/rollback          → Rollback a completed job
GET  /api/jobs/:id/report            → Download CSV report
```

---

## 🔧 Configuration

### Bulk Job Options

```typescript
{
  mode: "generate" | "seo-rewrite" | "auto-bulk",
  collectionId: string,
  itemIds?: string[],          // empty = all items
  dryRun: boolean,             // preview without writing
  concurrency: number,         // parallel requests (default: 5)
  options: {
    tone: "professional" | "casual" | "technical" | "friendly",
    targetKeywords: string[],
    promptTemplate?: string,
    preserveFields: string[],  // fields to never overwrite
    maxTokens: number
  }
}
```

### SEO Analysis Scoring

The SEO engine scores content across 5 dimensions (0–100 each):

| Dimension | Weight | Description |
|---|---|---|
| Title optimization | 25% | Length, keyword placement, click-through appeal |
| Meta description | 20% | Length, keyword usage, CTA presence |
| Readability | 20% | Flesch-Kincaid grade, sentence length |
| Keyword density | 15% | Target keyword frequency (1.5–3% ideal) |
| E-E-A-T signals | 20% | Expertise, authority, trustworthiness indicators |

---

## 🚢 Deployment

### Render (Backend)

```bash
# One-click deploy via render.yaml
# Or manual:
render up
```

The `render.yaml` configures:
- Web service (backend API)
- Environment variables (set in Render dashboard)

### Vercel (Frontend)

```bash
cd frontend
vercel --prod
```

The `vercel.json` configures:
- Static build output
- API proxy rewrites to Render backend

### Docker

```bash
docker-compose up --build
```

---

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# E2E tests
npm run test:e2e
```

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/amazing-feature`
3. Commit: `git commit -m 'feat: add amazing feature'`
4. Push: `git push origin feat/amazing-feature`
5. Open a Pull Request

---

*Built with ❤️ using Node.js, OpenAI GPT-4o, and the Webflow CMS API*
