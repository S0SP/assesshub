# AssessHub — Technical Documentation

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  Landing | Login | Register | Dashboard | Test UI | Results  │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼────────────────────────────────────┐
│              Next.js 14 (App Router) — Vercel                │
│                                                              │
│  Server Components (SSR)    Client Components (CSR)          │
│  ┌─────────────────────┐   ┌──────────────────────────────┐  │
│  │ /app/(admin)        │   │ AdminDashboardClient         │  │
│  │ /app/(teacher)      │   │ TestCreateClient (DnD+AI)    │  │
│  │ /app/(student)      │   │ TestAttemptPage (Timer)      │  │
│  │ /app/page.tsx       │   │ StudentDashboardClient       │  │
│  └─────────────────────┘   └──────────────────────────────┘  │
│                                                              │
│  API Routes (/app/api/)                                      │
│  ├── /auth/[...nextauth]  — NextAuth handlers               │
│  ├── /auth/register       — User registration               │
│  ├── /admin/*             — Super Admin endpoints           │
│  ├── /teacher/*           — Teacher CRUD endpoints          │
│  ├── /student/*           — Student test endpoints          │
│  ├── /public/*            — Public (no auth) endpoints      │
│  └── /ai/*               — Gemini AI endpoints             │
└──────────┬────────────────────────────────────┬─────────────┘
           │ Prisma ORM                         │ fetch()
┌──────────▼──────────────┐         ┌──────────▼─────────────┐
│   Neon PostgreSQL        │         │  Google Gemini API     │
│   (Serverless PG)        │         │  gemini-1.5-flash      │
│                          │         │                        │
│  users                   │         │  enhance-question      │
│  teacher_invites         │         │  generate-keywords     │
│  tests                   │         │  voice-to-text         │
│  questions               │         │  ai-grade-subjective   │
│  test_attempts           │         └────────────────────────┘
│  test_invite_codes       │
│  test_invite_usages      │
└──────────────────────────┘
```

## Data Flow — Test Submission

```
Student clicks "Confirm & Submit"
        │
        ▼
POST /api/student/attempts/[id]/submit
        │
        ▼
evaluateAttempt(questions, answers)
        │
    ┌───┴───┐
    │       │
  MCQ    Subjective
  evaluateMCQ()    evaluateSubjective()
  (exact match)    (keyword weight scoring)
    │       │
    └───┬───┘
        │
        ▼
prisma.testAttempt.update({
  status: "SUBMITTED",
  evaluation: {...},
  totalScore, maxScore, percentage,
  timeTakenSeconds, submittedAt
})
        │
        ▼
Return { percentage, totalScore }
        │
        ▼
Router.push(`/results/${attemptId}`)
```

## Database Design

### users
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| name | String | |
| email | String | Unique |
| passwordHash | String | bcrypt 12 rounds |
| role | Enum | SUPER_ADMIN, TEACHER, TEST_TAKER |
| department | String? | Teacher's dept |
| isActive | Boolean | For disabling accounts |

### tests
| Column | Type | Notes |
|---|---|---|
| shareCode | String | Unique slug for public URL |
| status | Enum | DRAFT, PUBLISHED, ARCHIVED |
| accessType | Enum | PUBLIC, INVITE_ONLY, PASSWORD_PROTECTED |
| settings | Json | Multiple attempts, randomize, etc. |
| totalPoints | Float | Computed from questions |

### questions
| Column | Type | Notes |
|---|---|---|
| type | Enum | MCQ, SHORT_ANSWER, LONG_ANSWER |
| options | Json? | [{id, text}] for MCQ |
| correctOption | String? | Option id for MCQ |
| keywords | Json? | [{keyword, weight}] for subjective |
| order | Int | For drag-and-drop reordering |

### test_attempts
| Column | Type | Notes |
|---|---|---|
| answers | Json | {questionId: {selected_option or answer}} |
| evaluation | Json | {questionId: {score, is_correct, keywords_matched...}} |
| totalScore, maxScore, percentage | Float | Computed on submit |
| @@unique([testId, userId]) | | One attempt per student per test |

## Evaluation Engine

### MCQ Scoring
```
score = selected_option === correct_option ? points : 0
```

### Subjective Scoring (Keyword Weight)
```
total_weight = sum(keyword.weight for all keywords)
matched_weight = sum(keyword.weight for matched keywords)
score = (matched_weight / total_weight) * max_points

Matching: case-insensitive substring match
```

## Technical Decisions

### Why Next.js App Router?
- Eliminates separate frontend/backend deployments
- Server Components for data fetching (no API calls from client for initial load)
- Route Groups for clean layout separation by role

### Why Neon PostgreSQL?
- Serverless, scales to zero — perfect for Vercel
- Standard PostgreSQL — Prisma supports it fully
- Free tier generous for development

### Why NextAuth v5 + Credentials?
- No external OAuth dependencies needed
- JWT strategy — stateless, no session DB needed
- Clean role-based access via middleware

### Why @dnd-kit for DnD?
- Accessibility-first (keyboard navigation)
- Works without HTML5 drag API quirks
- TypeScript-native

### Why Gemini Flash?
- 15 RPM free tier — sufficient for testing
- Very fast (< 1s typical)
- Supports all needed AI tasks

## Challenges & Resolutions

### 1. Server-Synced Timer
**Challenge:** Client timers can drift or be manipulated.
**Resolution:** Store `startedAt` in DB. Client calculates `deadline = startedAt + duration * 60000`. On each save, server can verify time hasn't expired.

### 2. Auto-Save Race Condition
**Challenge:** Multiple save requests could overwrite in-progress answers.
**Resolution:** Save intervals are client-side (30s), navigation triggers explicit save. Server updates entire `answers` JSON atomically.

### 3. Prisma Client in Edge Runtime
**Challenge:** Prisma doesn't work in Edge middleware.
**Resolution:** Middleware uses NextAuth token claims (role from JWT), no DB calls needed.

### 4. DnD with Sorted DB IDs
**Challenge:** New questions before save don't have DB IDs.
**Resolution:** Each question gets a `tempId` (timestamp-based) for DnD key. After save, real ID replaces it.

## Current Status

### ✅ Complete
- Full authentication (register, login, role-based routing)
- Super Admin: dashboard, teacher invites, toggle teachers
- Teacher: test creation wizard (DnD, live preview, AI enhance, voice input)
- Teacher: question management (MCQ + subjective with keywords)
- Teacher: publish/archive/duplicate/delete tests
- Teacher: results dashboard with score override
- Teacher: invite code management for test sharing
- Student: dashboard with test browsing
- Student: timed test-taking UI (auto-save, flag, navigation)
- Student: detailed results view with keyword breakdown
- Public: test landing page, join via code
- AI: question enhancement, keyword generation, voice-to-text
- Evaluation: MCQ auto-grade, keyword-weight subjective scoring

### ⚠️ Known Gaps (Would add with more time)
- Email verification
- Forgot password flow
- Analytics charts (performance over time)
- CSV export of results
- QR code generation for test sharing
- AI-assisted subjective grading (endpoint exists, not connected to evaluation flow)
- Pagination for large result sets
- Real-time notifications

## Deployment Checklist

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "Initial commit"
git remote add origin <your-github-repo>
git push -u origin main

# 2. Connect to Vercel
# Go to vercel.com → New Project → Import from GitHub

# 3. Set environment variables in Vercel:
# DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, GEMINI_API_KEY

# 4. After first deploy, run:
npx prisma db push
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```
