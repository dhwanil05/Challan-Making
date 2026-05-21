# Deploy to Vercel

This project deploys **frontend (Next.js)** and **API (Express)** together on Vercel.

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
| `DATABASE_URL` | `postgresql://...` | From Neon/Supabase |
| `JWT_SECRET` | long random string | e.g. `openssl rand -base64 32` |
| `NODE_ENV` | `production` | |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Your Vercel URL after first deploy |
| `PUBLIC_SIGNUP_DISABLED` | `true` | Optional — block public sign-up |
| `JWT_EXPIRES_IN` | `7d` | Optional |

`NEXT_PUBLIC_API_URL` is **optional** — on Vercel the app uses `/api` on the same domain automatically.

After adding variables, redeploy: **Deployments** → **Redeploy**.

## 4. Deploy from GitHub (recommended)

1. Push repo to GitHub
2. [vercel.com/new](https://vercel.com/new) → Import repository
3. **Root Directory:** leave as `.` (repo root)
4. Framework: **Next.js** (auto from `vercel.json`)
5. Add environment variables (step 3)
6. Deploy

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
