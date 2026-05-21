# U VITA ERP

**E-Challan & Delivery Challan / Invoice Management** for Surat textile businesses — fabric traders, wholesalers, and manufacturers.

![Stack](https://img.shields.io/badge/Next.js-15-black) ![Stack](https://img.shields.io/badge/Express-5-green) ![Stack](https://img.shields.io/badge/PostgreSQL-16-blue)

## Features

- JWT authentication with Admin / Staff / Accountant roles
- Dashboard with sales analytics, low-stock alerts, top customers
- Customer & product management with Excel import/export
- **Traditional Surat-style delivery challan** print layout (A4 + thermal)
- Auto GST calculation (CGST/SGST/IGST)
- Challan → Invoice conversion with payment tracking
- Inventory stock in/out with roll tracking
- GST, sales, daily, and P&L reports
- WhatsApp share, print preview, duplicate challan
- Dark/light mode, mobile-responsive UI

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL) or local PostgreSQL

### 1. Start Database

```bash
docker compose up -d
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 4. Setup Database

```bash
cd backend
npx prisma generate
npx prisma db push
npm run db:seed
```

### 5. Run Development

From project root:

```bash
npm run dev
```

- **Frontend:** http://localhost:3000
- **API:** http://localhost:4000/api

### Demo Login

| Role  | Email            | Password  |
|-------|------------------|-----------|
| Admin | admin@uvita.com  | admin123  |
| Staff | staff@uvita.com  | staff123  |

### Create account (multi-tenant)

New businesses can self-register at **http://localhost:3000/register** (or your deployed URL). Each signup creates a **company** plus an **Admin** user. Required fields include firm name, GSTIN, full address, city, state, PIN, business email, business phone, and your personal details for login.

- **API:** `POST /api/auth/signup` (rate-limited: 20 requests / hour / IP)
- **Disable signups (production):** set `PUBLIC_SIGNUP_DISABLED=true` in `backend/.env`

## Project Structure

```
challan/
├── backend/          # Express + Prisma API
│   ├── prisma/       # Schema & seed
│   └── src/
│       ├── routes/   # REST endpoints
│       └── middleware/
├── frontend/         # Next.js 15 App Router
│   └── src/
│       ├── app/      # Pages
│       ├── components/
│       └── stores/   # Zustand
└── docker-compose.yml
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/signup` | Public registration (company + admin) |
| GET | `/api/dashboard` | Dashboard stats |
| CRUD | `/api/customers` | Customers |
| CRUD | `/api/products` | Products |
| CRUD | `/api/challans` | Challans |
| POST | `/api/challans/:id/duplicate` | Duplicate |
| POST | `/api/invoices/from-challan/:id` | Convert to invoice |
| GET | `/api/reports/*` | Reports |
| GET | `/api/export/*` | Excel export |

## Print Challan

1. Create challan at **Challans → New Challan**
2. Open challan detail → **Print** (browser print, Ctrl+P)
3. Toggle **Thermal** for 80mm receipt printers
4. Use **WhatsApp** to share challan summary

## Deployment

### Backend (Railway / Render / VPS)

```bash
cd backend
npm run build
npx prisma migrate deploy
npm start
```

Set env: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `NODE_ENV=production`

### Frontend (Vercel)

```bash
cd frontend
npm run build
```

Set env: `NEXT_PUBLIC_API_URL=https://your-api.com/api`

### Production Checklist

- [ ] Change `JWT_SECRET` to a long random string
- [ ] Use managed PostgreSQL
- [ ] Enable HTTPS
- [ ] Set `FRONTEND_URL` for CORS
- [ ] Run `prisma migrate deploy`

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Shadcn-style UI |
| State | Zustand |
| Validation | Zod |
| Charts | Recharts |
| Excel | SheetJS (xlsx) |
| Backend | Node.js, Express 5 |
| ORM | Prisma + PostgreSQL |
| Auth | JWT + RBAC |

## License

Proprietary — U VITA ERP
