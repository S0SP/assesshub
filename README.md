# AssessHub 🎯

> **Assess. Evaluate. Improve.** — A full-stack assessment platform for objective and subjective evaluations.

[![Next.js](https://img.shields.io/badge/Next.js-14.2.30-black?logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)](https://neon.tech)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com)

**Live Demo:** [https://assesshub.vercel.app](https://assesshub.vercel.app)  
**Documentation:** [`DOCUMENTATION.pdf`](https://drive.google.com/file/d/1F4mrlCsfUSp4BddE3xQTxYMkXUIJZ1yl/view?usp=sharing)

---

## Table of Contents

1. [Quick Setup](#1-quick-setup)
2. [Demo Credentials](#2-demo-credentials)
3. [Feature Status](#3-feature-status)
4. [Architecture Overview](#4-architecture-overview)
5. [Database Schema](#5-database-schema)
6. [Evaluation Engine](#6-evaluation-engine)
7. [API Reference](#7-api-reference)
8. [Timer — Server Sync](#8-timer--server-sync)
9. [AI Features & Voice Input](#9-ai-features--voice-input)
10. [Future Scope](#10-future-scope)

---

## 1. Quick Setup

### Prerequisites
- Node.js 18+
- [Neon](https://neon.tech) account (free PostgreSQL, no credit card)
- [Google AI Studio](https://aistudio.google.com/app/apikey) Gemini API key (free)

```bash
git clone https://github.com/YOUR_USERNAME/assesshub.git
cd assesshub
npm install
cp .env.example .env        # fill in all 6 values
npx prisma db push
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
npm run dev                 # → http://localhost:3000
```

### Environment Variables

| Variable | Where to Get | Notes |
|---|---|---|
| `DATABASE_URL` | Neon → New Project → Connection String **(pooled)** | Used by API routes |
| `DIRECT_URL` | Same project → Direct connection string | Used by Prisma migrations |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Must be random and secret |
| `NEXTAUTH_URL` | Your app URL | `http://localhost:3000` locally |
| `GEMINI_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | AI features degrade gracefully without it |
| `NEXT_PUBLIC_APP_URL` | Same as `NEXTAUTH_URL` | Used for share links |

### Deploy to Vercel

```bash
# 1. Import repo at vercel.com → New Project
# 2. Add all 6 env vars in Vercel Dashboard → Settings → Environment Variables
# 3. After first deploy, run once:
npx prisma db push
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

> `NEXTAUTH_URL` must exactly match your Vercel deployment URL.

---

## 2. Demo Credentials

| Role | Email | Password | Dashboard |
|---|---|---|---|
| **Super Admin** | admin@assesshub.com | Admin@123 | `/admin` |
| **Teacher** | Create via admin invite code | 8+ chars, 1 uppercase, 1 number | `/teacher` |
| **Student** | Register at `/register` | 8+ chars, 1 uppercase, 1 number | `/dashboard` |

**Teacher onboarding:** Login as Super Admin → Invite Teacher → copy code → open `/register` → Teacher tab → paste code → register.

---

## 3. Feature Status

### ✅ Core Requirements — All 18 Implemented

#### Authentication & Roles
- Email + password registration and login, bcrypt (12 rounds)
- NextAuth v5 JWT sessions (httpOnly cookie, 24h)
- 3 roles: **SUPER_ADMIN**, **TEACHER**, **TEST_TAKER**
- Edge middleware enforces role-based routing (zero DB calls)

#### Super Admin
- Platform stats, teacher invite codes (`TCH-YEAR-XXXXXX`, 7-day, single-use)
- View / revoke invites, enable / disable teacher accounts

#### Teacher — Test Creation
- 3-step wizard: Details → Questions → Review with **live preview panel**
- Access types: PUBLIC / INVITE_ONLY / PASSWORD_PROTECTED
- Advanced settings: multiple attempts, show results immediately, randomise questions, **negative marking** (fully wired), **AI grading** (fully wired)

#### Teacher — Question Editor
- **MCQ:** 2–6 options, correct answer, topic tags, points, explanation
- **Short / Long Answer:** keyword list with weights, model answer reference
- **🎤 Voice Input** — Web Speech API, no server call
- **✨ AI Enhance** — Gemini rewrites question + 2 variants
- **🤖 AI Keywords** — Gemini extracts weighted keywords
- **Drag-and-drop reorder** — @dnd-kit, order persisted to DB

#### Teacher — Results
- Per-test stats (avg / highest / lowest), **score distribution chart**
- **Paginated** (20/page, cursor-based) with **server-side search + sort**
- Drill-down modal: MCQ ✅/❌ with negative marking shown, Subjective keyword breakdown + AI reasoning
- **Manual score override** + teacher feedback → displayed to student
- **Auto-releases results** when teacher opens Review modal

#### Student — Test Taking
- Browse tests with **search + category filter** (paginated, 12/page)
- Distraction-free UI, **server-synced countdown timer** (60s periodic re-sync)
- Navigation grid (answered / flagged / current / unanswered), flag questions
- **Auto-save every 30s** + on navigation, submit confirmation modal
- **Auto-submit on timer expiry**, resume in-progress on page reload
- **Re-attempt button** when multiple attempts are enabled

#### Student — Results
- Score card (circular SVG chart), MCQ / Subjective breakdown
- Per-question detail, keyword breakdown, AI reasoning, teacher feedback
- **Results gated** — hidden until teacher review when `show_results_immediately = OFF`

---

### ✅ Bonus Features — All Implemented

| Bonus | Status | Notes |
|---|---|---|
| Strict role-based access control | ✅ | Middleware + every API route checks role independently |
| Partial auto-save | ✅ | Every 30s + on every question navigation |
| Server-synced timer | ✅ | 60s poll → `/api/student/attempts/[id]/remaining`, WiFi status icon |
| Pagination | ✅ | Cursor-based: 12/page student browse, 20/page teacher results |
| AI-assisted grading | ✅ | Gemini: 40% keyword + 60% AI, confidence capped, reasoning shown |
| Negative marking | ✅ | Configurable fraction, total score clamped ≥ 0 |
| Multiple attempts | ✅ | Per-test toggle, Re-attempt button on dashboard |
| Voice input | ✅ | Browser Web Speech API, no server call |
| Score distribution chart | ✅ | Four-band bar chart in teacher results |
| Teacher-controlled result release | ✅ | Reviewing an attempt auto-releases results to student |

---

### ❌ Known Gaps

| Feature | Reason |
|---|---|
| Forgot password / reset | Needs SMTP (Resend / Nodemailer) — not scoped |
| Email verification | Same |
| INVITE_ONLY on student dashboard | Access control works; browse only shows PUBLIC + PASSWORD tests |
| Analytics charts | Data model supports it; recharts UI not built |
| CSV export | Not prioritised |
| QR code sharing | `shareCode` generated; `qrcode` library not integrated |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  BROWSER / CLIENT                       │
│  Landing · Auth · Admin · Teacher · Student             │
│  Server Components (SSR) | Client Components (hooks)   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│         NEXT.JS 14 — VERCEL (Edge + Node.js)            │
│                                                         │
│  middleware.ts → JWT decode + role check (no DB)        │
│  Server Components → Prisma queries at request time     │
│  Client Components → fetch() calls to /api/**           │
│  API Routes: auth() → role → Prisma → response         │
│  NextAuth v5 → JWT sessions, httpOnly cookies           │
└──────────────────┬──────────────────┬───────────────────┘
                   │ Prisma ORM        │ HTTPS
      ┌────────────▼────────┐  ┌──────▼──────────────┐
      │  Neon PostgreSQL    │  │  Google Gemini API  │
      │  users · tests      │  │  enhance · keywords │
      │  questions          │  │  ai-grade-subj.     │
      │  test_attempts      │  └─────────────────────┘
      │  invite codes       │
      └─────────────────────┘
```

> Full architecture diagram with all data flows → [`DOCUMENTATION.pdf`](./DOCUMENTATION.pdf) — Section 01.

---

## 5. Database Schema

| Decision | Rationale |
|---|---|
| **Single `users` table** | Role enum drives all access control — no cross-table joins for auth |
| **Polymorphic `questions`** | MCQ + Subjective in one table; `options` and `keywords` are nullable JSON |
| **Denormalised `totalPoints`** | Updated on every question change — O(1) read vs aggregate query |
| **JSON for answers + evaluation** | Self-contained per attempt, no join table needed for results |
| **No `@@unique([testId, userId])`** | Removed to support `allow_multiple_attempts` |
| **`_released` in evaluation JSON** | Avoids schema migration for teacher-controlled result visibility |

> Full ER diagram and table definitions → [`DOCUMENTATION.pdf`](./DOCUMENTATION.pdf) — Section 02.
> 
### Admin Panel Design Note

The system currently distinguishes between SUPER_ADMIN and TEACHER roles.

The admin panel is designed to be extensible for multiple test moderators (teachers), where:
- Each teacher independently manages their own tests and results
- Role-based access control is enforced via middleware and API-level checks
- The architecture supports horizontal scaling to multiple moderators without shared-state conflicts

This ensures the platform is not limited to a single administrator but supports a generalized multi-moderator system, aligning with real-world assessment platforms.
---

## 6. Evaluation Engine

```
MCQ:
  score = selected === correct ? points : 0
  if (negative_marking && wrong): score = -(points × negative_marks_value)
  total = max(0, Σ all scores)

Subjective (keyword-weight):
  matched_weight = Σ keyword.weight  for keywords found in answer (case-insensitive)
  score = (matched_weight / total_weight) × max_points

AI-Assisted (optional toggle per test):
  final = (keyword_score × 0.4) + (gemini_score × 0.6)
  // Falls back to keyword-only if Gemini unavailable
```

---

## 7. API Reference

### Auth
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register with optional invite code |
| POST | `/api/auth/callback/credentials` | Public | NextAuth login |

### Admin
| Method | Route | Description |
|---|---|---|
| GET | `/api/admin/dashboard` | Platform stats |
| GET/POST | `/api/admin/teachers` | List teachers |
| PUT | `/api/admin/teachers/[id]/toggle` | Enable / disable account |
| POST | `/api/admin/invite-teacher` | Generate invite code |
| PUT | `/api/admin/invites/[code]/revoke` | Revoke invite |

### Teacher
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/teacher/tests` | List / create tests |
| GET/PUT/DELETE | `/api/teacher/tests/[id]` | Get / update / delete |
| POST | `/api/teacher/tests/[id]/publish` | Publish (requires ≥1 question) |
| POST | `/api/teacher/tests/[id]/duplicate` | Duplicate as draft |
| GET | `/api/teacher/tests/[id]/results` | Paginated results + stats |
| POST | `/api/teacher/tests/[id]/questions` | Add question |
| PUT/DELETE | `/api/teacher/tests/[id]/questions/[qid]` | Edit / delete question |
| PUT | `/api/teacher/tests/[id]/questions/reorder` | Update DnD order |
| GET | `/api/teacher/results/[attemptId]` | Get attempt (auto-releases results) |
| PUT | `/api/teacher/results/[attemptId]/override/[qid]` | Manual score override |

### Student
| Method | Route | Description |
|---|---|---|
| GET | `/api/student/tests` | Browse tests (paginated + searchable) |
| POST | `/api/student/tests/[id]/start` | Start or resume attempt |
| POST | `/api/student/attempts/[id]/save` | Auto-save answers |
| POST | `/api/student/attempts/[id]/submit` | Submit and evaluate |
| GET | `/api/student/attempts/[id]/remaining` | Server-synced timer |
| GET | `/api/student/results/[id]` | View results (gated by settings) |

### AI
| Method | Route | Description |
|---|---|---|
| POST | `/api/ai/enhance-question` | Gemini: rewrite + 2 variants |
| POST | `/api/ai/generate-keywords` | Gemini: extract weighted keywords |

---

## 8. Timer — Server Sync

| Check | Status | Detail |
|---|---|---|
| `startedAt` stored in DB on start | ✅ | `DateTime @default(now())` |
| Timer initialised from server | ✅ | `remaining = startedAt + duration - Date.now()` |
| Page refresh preserves time | ✅ | SessionStorage stores `startedAt` |
| **Periodic re-sync every 60s** | ✅ | `GET /api/student/attempts/[id]/remaining` |
| **Self-corrects drift > 5s** | ✅ | Client updates from server value |
| **Sync status indicator** | ✅ | WiFi icon: 🟢 synced / 🟡 syncing / 🔴 error |
| Server rejects late submits | ✅ | 30s grace period in submit route |
| Auto-submit on expiry | ✅ | `handleAutoSubmit()` fires at `timeLeft === 0` |

---

## 9. AI Features & Voice Input

### 🎤 Voice Input
Pure browser — no AI, no server call.
```typescript
const rec = new SpeechRecognition();
rec.onresult = (e) => setEditingQ(q => ({ ...q, text: e.results[0][0].transcript }));
rec.start();
```
| Browser | Support |
|---|---|
| Chrome / Edge | ✅ Full |
| Safari | ⚠️ Partial (iOS 14.5+) |
| Firefox | ❌ Not supported |

### ✨ Gemini AI (lib/ai.ts — gemini-1.5-flash, free tier 15 RPM)
| Feature | Trigger | Output |
|---|---|---|
| Enhance Question | ✨ button | Rewrites for clarity + 2 variant phrasings |
| Generate Keywords | 🤖 button | [{keyword, weight}] array |
| Grade Subjective | Auto on submit (if enabled) | {score, reasoning, confidence} blended with keywords |

---

## 10. Future Scope

**Immediate:** Email verification, forgot password, INVITE_ONLY test browsing  
**Short-term:** Analytics charts, CSV export, QR code sharing  
**Medium-term:** Question bank, rich text (KaTeX), image upload, bulk operations  
**Long-term:** Test scheduling, student cohorts, OAuth login, proctoring, leaderboard

---

## Project Structure

```
assesshub/
├── app/
│   ├── (auth)/           # Login, Register
│   ├── (admin)/          # Super Admin dashboard
│   ├── (teacher)/        # Dashboard, test wizard, results, share
│   ├── (student)/        # Dashboard, test-taking, results
│   ├── api/              # 28 API routes across admin/teacher/student/public/ai
│   └── join/[code]/      # Universal invite code handler
├── components/
│   ├── shared/           # SessionProvider, AdminDashboardClient
│   ├── teacher/          # TestCreateClient, TestResultsClient, TestShareClient
│   └── student/          # StudentDashboardClient, PublicTestLandingClient
├── lib/
│   ├── evaluate.ts       # MCQ + keyword + AI grading engine
│   ├── ai.ts             # Google Gemini integration
│   ├── prisma.ts         # Singleton Prisma client
│   └── utils.ts          # Code generators, formatTime
├── prisma/
│   ├── schema.prisma     # 7 models, 7 enums
│   └── seed.ts           # Super admin seeder
├── auth.ts               # NextAuth v5 config
├── middleware.ts          # Edge Runtime role guards
├── DOCUMENTATION.pdf     # Full technical documentation
└── DEPLOY.md             # Step-by-step Vercel guide
```

---

## AI Tool Usage

Built with the help of Claude (Anthropic) for debugging and reoeated task . Per assignment requirements:
- Every line of code has been reviewed, understood, and tested by me
- I can walk through any part of the codebase during review

---

