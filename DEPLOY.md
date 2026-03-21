# Production Deployment Guide — AssessHub

## Prerequisites

- GitHub account (for repo)
- Vercel account (free tier works)
- Neon account (free tier works — 0.5 GB storage)
- Google AI Studio account (free — 15 req/min Gemini)

---

## Step 1 — Set Up Neon PostgreSQL

1. Go to [neon.tech](https://neon.tech) → **New Project**
2. Name: `assesshub`, Region: closest to your users
3. Click **Create Project**
4. Under **Connection Details**, copy:
   - **Connection string (pooled)** → `DATABASE_URL`
   - **Direct connection** → `DIRECT_URL`
   
Both look like:
```
postgresql://user:password@ep-xxx-yyy.region.aws.neon.tech/assesshub?sslmode=require
```

---

## Step 2 — Get Gemini API Key

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **Create API Key** → copy it → this is `GEMINI_API_KEY`

Free tier: 15 requests/minute, 1 million tokens/day — plenty for production use.

---

## Step 3 — Push to GitHub

```bash
cd assesshub
git init
git add .
git commit -m "feat: initial AssessHub implementation"

# Create repo at github.com/new (make it PUBLIC for reviewer access)
git remote add origin https://github.com/YOUR_USERNAME/assesshub.git
git branch -M main
git push -u origin main
```

---

## Step 4 — Deploy to Vercel

### Option A: Vercel Dashboard (recommended)
1. Go to [vercel.com](https://vercel.com) → **New Project**
2. **Import from GitHub** → select your `assesshub` repo
3. Framework: **Next.js** (auto-detected)
4. Click **Environment Variables** → add all 6 variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your Neon pooled connection string |
| `DIRECT_URL` | Your Neon direct connection string |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` in terminal |
| `NEXTAUTH_URL` | `https://YOUR-PROJECT.vercel.app` |
| `GEMINI_API_KEY` | Your Google AI Studio key |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-PROJECT.vercel.app` |

5. Click **Deploy**

### Option B: Vercel CLI
```bash
npm i -g vercel
vercel

# Follow prompts, then add env vars:
vercel env add DATABASE_URL
vercel env add DIRECT_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add GEMINI_API_KEY
vercel env add NEXT_PUBLIC_APP_URL

# Redeploy with env vars
vercel --prod
```

---

## Step 5 — Initialize Database

After first deploy, run these **once**:

```bash
# Push schema to Neon
DATABASE_URL="your-neon-url" npx prisma db push

# Seed super admin (admin@assesshub.com / Admin@123)
DATABASE_URL="your-neon-url" npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

Or use Vercel's **Run Command** in dashboard after deploy.

---

## Step 6 — Verify Deployment

1. Visit `https://YOUR-PROJECT.vercel.app`
2. Login: `admin@assesshub.com` / `Admin@123`
3. Create a teacher invite → register as teacher → create & publish a test
4. Register as student → take the test

---

## Production Checklist

- [ ] All 6 environment variables set in Vercel
- [ ] `npx prisma db push` run after deploy
- [ ] Seed script run — super admin exists
- [ ] Custom domain configured (optional — Vercel Settings → Domains)
- [ ] `NEXTAUTH_URL` updated to match custom domain

---

## Local Development After Clone

```bash
git clone https://github.com/YOUR_USERNAME/assesshub.git
cd assesshub
npm install
cp .env.example .env
# Fill .env with your values
npx prisma db push
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
npm run dev
```

---

## Common Issues

### "NEXTAUTH_SECRET is not set"
→ Add `NEXTAUTH_SECRET` env var in Vercel. Generate with `openssl rand -base64 32`.

### "PrismaClientInitializationError"
→ Check `DATABASE_URL` is correct. Neon URLs must include `?sslmode=require`.

### "AI features not working"
→ Check `GEMINI_API_KEY` is set. AI features degrade gracefully if key is missing.

### "Cannot find module '@prisma/client'"
→ The `vercel.json` runs `npx prisma generate` before build. If still failing, add `"postinstall": "prisma generate"` to `package.json` scripts.

---

## Architecture Notes for Production

### Why Neon + Vercel?
- **Neon** is serverless PostgreSQL — auto-pauses when idle, scales on demand
- **Vercel** deploys Next.js with zero config, edge network, automatic SSL
- Combined cost for small-medium usage: **$0/month** on free tiers

### Prisma Connection Pooling
Neon handles connection pooling. Use the **pooled** URL for `DATABASE_URL` (used by API routes) and the **direct** URL for `DIRECT_URL` (used by Prisma migrations).

### Environment Variables Security
- `NEXTAUTH_SECRET` must be random and secret — never commit to git
- `DATABASE_URL` contains your DB password — never commit to git
- `.env` is in `.gitignore`
- `GEMINI_API_KEY` is server-side only — never exposed to browser

