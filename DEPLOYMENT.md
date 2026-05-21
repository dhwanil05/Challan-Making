# U VITA ERP — Deployment Guide

## Option A: Docker Compose (Full Stack)

Add services to `docker-compose.yml` for API and frontend, or deploy separately.

### Database only (included)

```bash
docker compose up -d postgres
```

## Option B: Vercel + Railway

### Railway (Backend + PostgreSQL)

1. Create new project → Add PostgreSQL plugin
2. Deploy from `backend/` folder
3. Set environment variables:
   - `DATABASE_URL` (from Railway Postgres)
   - `JWT_SECRET` (generate 64-char random)
   - `FRONTEND_URL` = `https://your-app.vercel.app`
   - `PORT` = `4000`
4. Build command: `npm install && npx prisma generate && npm run build`
5. Start command: `npx prisma migrate deploy && node dist/index.js`

### Vercel (Frontend)

1. Import `frontend/` directory
2. Framework: Next.js
3. Environment: `NEXT_PUBLIC_API_URL=https://your-api.railway.app/api`
4. Deploy

## Option C: VPS (Ubuntu)

```bash
# Install Node 20, PostgreSQL, Nginx
sudo apt update && sudo apt install -y nodejs npm postgresql nginx

# Clone and setup
git clone <repo> /var/www/uvita
cd /var/www/uvita
npm install

# Backend
cd backend && cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET
npx prisma migrate deploy && npm run db:seed
npm run build

# PM2 for API
npm install -g pm2
pm2 start dist/index.js --name uvita-api

# Frontend
cd ../frontend && npm run build
pm2 start npm --name uvita-web -- start

# Nginx reverse proxy
# /api → localhost:4000
# / → localhost:3000
```

## SSL

Use Certbot with Nginx or platform-managed SSL (Vercel/Railway).

## Backups

```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

Schedule daily cron on VPS or use managed DB backups.

## Health Check

```bash
curl https://your-api.com/api/health
```

Expected: `{"success":true,"message":"U VITA ERP API is running"}`
