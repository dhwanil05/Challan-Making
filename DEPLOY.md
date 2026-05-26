# Deploy to Vercel

Deploy **frontend (Next.js)** on Vercel and **API (Express)** on Railway or Render.

## 1. Database (required)

Vercel does not include PostgreSQL. Create a free database first:

1. [Neon](https://neon.tech) or [Supabase](https://supabase.com) → create project
2. Copy the **PostgreSQL connection string**

On your machine (once):

```bash
cd backend
DATABASE_URL="your-neon-url" npx prisma db push
DATABASE_URL="your-neon-url" npm run db:seed
```

## 2. Deploy with Vercel CLI

```bash
npm install -g vercel
cd /path/to/challan
git init
git add .
git commit -m "Prepare for Vercel deployment"
vercel login
vercel
```

Follow prompts (link to your Vercel account, project name).

## 3. Environment variables (Vercel Dashboard)

Project → **Settings** → **Environment Variables**:

| Name | Value | Notes |
|------|--------|--------|
| `NEXT_PUBLIC_API_URL` | `https://your-api.railway.app/api` | Backend URL (required) |

Backend (Railway/Render) needs: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` = your Vercel URL, `NODE_ENV` = `production`.

After adding variables, redeploy: **Deployments** → **Redeploy**.

## 4. Deploy from GitHub (recommended)

1. Push repo to GitHub
2. [vercel.com/new](https://vercel.com/new) → Import **Challan-Making** repository
3. **Root Directory:** set to `frontend` (required — Next.js lives here)
4. Framework: **Next.js** (auto-detected from `frontend/package.json`)
5. Add environment variables (step 3 below + API URL)
6. Deploy

### Vercel project settings (important)

| Setting | Value |
|---------|--------|
| Root Directory | `frontend` |
| Framework Preset | Next.js |
| Build Command | `npm run build` (default) |
| Output Directory | `.next` (default) |

If you see *"No Next.js version detected"*, the Root Directory is wrong — it must be **`frontend`**, not the repo root.

## 5. Production checklist

- [ ] `DATABASE_URL` set and `prisma db push` + seed run on production DB
- [ ] `JWT_SECRET` changed from dev default
- [ ] `FRONTEND_URL` matches your live Vercel URL
- [ ] Login works at `https://your-app.vercel.app/login`
- [ ] Create challan + print PDF

## Troubleshooting

- **API 500:** Check Vercel → Functions → logs; usually missing `DATABASE_URL` or Prisma not migrated
- **CORS / login fails:** Set `FRONTEND_URL` to exact Vercel URL (no trailing slash)
- **Cold start:** First request after idle may take a few seconds (serverless)
