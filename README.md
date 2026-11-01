# Bihar Board Padhai — बिहार बोर्ड पढ़ाई

Independent, mobile-first study website for BSEB Class 10 (Matric) and Class 12 (Inter)
students, in Hindi and English medium. Built by AR Group Ventures. **Not affiliated with
or endorsed by the Bihar School Examination Board.**

## Stack

Vite 8 · React 19 · TypeScript · Tailwind CSS 4 · React Router 7 · Lucide icons ·
vite-plugin-pwa · custom static pre-rendering (`react-dom/static`) · Vitest · Playwright.
Backend for the MVP: a dependency-free Node server (`server/`) with a JSON-file store
(swap for Supabase/Firebase via `server/db.ts`).

## Run

```bash
npm install
cp .env.example .env            # optional; defaults to TEST_MODE=true
npm run dev                     # site on http://localhost:5173
npm run server                  # API on http://localhost:8787 (TEST_MODE: OTPs shown on screen, payments simulated)
npm run content:syllabus        # regenerate content/syllabus.json from content/sources/bseb_syllabus.raw.json
```

Quality gates:

```bash
npm run lint && npm run typecheck && npm run content:check && npm test
npm run build                   # content:check → client build → SSR build → prerender 350+ pages → sitemap
npm run preview                 # serves dist on :4173 (proxies /api to :8787)
npm run test:e2e                # Playwright smoke at 360px (account tests run only if the API is up)
npm run lighthouse              # mobile Lighthouse for 4 key pages (needs preview running)
```

## Where things live

| What | Where |
|---|---|
| Identity, links, switches (`accents`, free-question limit) | `src/config/site.ts` |
| Plans and prices | `src/config/plans.ts` (server copy in `server/payments.ts`, kept in sync by a test) |
| Subject catalogue with BSEB codes | `src/data/subjects.ts` |
| UI strings | `src/i18n/hi.ts`, `src/i18n/en.ts` (typed: no key may be missing) |
| Study content | `content/` — see `CONTENT_GUIDE.md` |
| Exam dates | `content/exam-calendar.json` (`official` / `expected`) |
| Official syllabus (codes, marks, textbooks, chapter lists) | `content/syllabus.json`, generated from `content/sources/bseb_syllabus.raw.json` |
| Product docs | `docs/BSEB_master_prompt_v2.md`, `docs/BSEB_user_flows.md` |
| Papers list | `content/papers.json` |
| Routes | `src/routes.tsx` (route-level code splitting) |
| On-device state | `src/lib/prefs.ts`, `src/lib/progress.ts` (localStorage) |
| Plan locking | `src/lib/access.ts` |
| Backend | `server/index.ts`, `server/auth.ts` (WhatsApp OTP, sessions), `server/payments.ts` (PayU), `server/providers/whatsapp.ts` |

## Content status

Everything under `content/` is **sample** material written for demonstration and is
labelled so in the UI. Replace before launch; see the "Sample content to replace" list in
the delivery report and `CONTENT_GUIDE.md` for the writer → reviewer → publish flow.

## Accounts and payments (see docs/BSEB_user_flows.md)

- Login is by **WhatsApp OTP or email OTP**. One account per phone number or email address. WhatsApp accounts can add a receipt email; email accounts are asked for a mobile number only at checkout (PayU needs one) and never receive WhatsApp messages. No SMS fallback.
- OTP: 6 digits, hash stored, 5-minute TTL, 5 attempts per code, 3 sends per 10 min and 10 per day per number, IP limit, resend wait 30 → 60 → 120 s.
- Session: 60 days or exam end + 30 days, whichever is longer; slides forward on use. Logout and "log out of all phones".
- Payments: **PayU hosted checkout**, UPI first. The server computes the price and the sha512 request hash; the return URL and the S2S webhook are verified with the reverse hash and (in production) `verify_payment`; amount and txnid must match. Only that path activates a plan. Pending orders are polled every 5 s for 2 minutes.
- Duplicate payments are flagged and refunded through the PayU refund API; upgrades to All Access cost the difference; refund requests are accepted inside `REFUND_WINDOW_DAYS` for admin review.
- Not built yet: the admin review screen for refunds, the 24-hour background `verify_payment` job for stuck UPI payments, and the 7-day / 1-day expiry reminders (section 17C was not supplied).

## Admin panel (/admin)

Not linked from the student site and `noindex`. Login with the same WhatsApp OTP; only phones in the
admins table can enter. Owners come from `ADMIN_OWNER_PHONES`; owners add editors at `/admin/team`.
Sessions last 12 hours. Every create/edit/delete/publish is audit-logged (`/admin/audit`).

| Area | Editor | Owner |
|---|---|---|
| Dashboard (users, plans, tests, updates) | ✓ (no revenue) | ✓ |
| Test series, tests, question bank, CSV import, results, WhatsApp notify | ✓ | ✓ |
| Updates, exam calendar, posters | ✓ | ✓ |
| Users: search and detail (phone masked) | ✓ | ✓ |
| Users: show phone, grant/extend/revoke plan, refund state, block, delete, CSV export | – | ✓ |
| Payments list, reconcile, export | – | ✓ |
| Content files, syllabus, mistake-report inbox | ✓ | ✓ |
| Team (add/remove admins, roles) | – | ✓ |

Roles are enforced in `server/admin/routes.ts` on every endpoint; the UI only hides what it cannot use.
Student-facing additions: `/updates`, the homepage "Latest updates" strip and poster carousel,
`/tests` (admin-made test series with server-side scoring, schedules, leaderboards), in-app
"report a mistake", and the exam calendar served from the admin table (`/api/exam-calendar`).

## Credentials needed for production

- WhatsApp Business API: `WHATSAPP_PROVIDER` (meta | msg91), `WHATSAPP_API_KEY`, `WHATSAPP_SENDER`, approved `WHATSAPP_AUTH_TEMPLATE` and `WHATSAPP_UTILITY_TEMPLATE`.
- Optional receipts by email: `EMAIL_API_URL` / `EMAIL_API_KEY` / `EMAIL_FROM`.
- PayU: `PAYU_KEY`, `PAYU_SALT`, `PAYU_MODE=prod`; point the PayU dashboard webhook at `/api/payments/payu/webhook`.
- Analytics: `VITE_ANALYTICS_PROVIDER` (plausible | umami | cloudflare) + domain/script.
- Contact numbers and channel links in `src/config/site.ts`.
- `ADMIN_OWNER_PHONES` for the admin panel; approved WhatsApp utility template for broadcasts.
