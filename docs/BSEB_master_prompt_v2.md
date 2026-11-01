# MASTER BUILD PROMPT v2: Bihar Board Class 10 & 12 Study Platform (Hindi + English)

Work as a senior frontend engineer, UI/UX designer and education product architect. Build a complete, working, responsive, mobile-first study website for Bihar School Examination Board (BSEB) students in **Class 10 (Matric)** and **Class 12 (Intermediate: Arts, Science, Commerce)**, in **हिंदी माध्यम** and **English Medium**.

Business goal (for your context only; don't show it to users): reach about 25% of each year's BSEB candidates, roughly 3.8 lakh Class 10 and 3.3 lakh Class 12 students (2026 base: 15.1 lakh Matric, 13.2 lakh Inter). Most will use a shared, low-end Android phone on a slow, expensive connection. They are mostly Hindi-medium, more than half are girls, and many are using a website for the first time. Every decision should favour **speed, simplicity and trust**.

Do not build a generic EdTech dashboard. Build something that feels like a familiar school textbook turned into a simple website.

## 0. TOP PRINCIPLE: SIMPLICITY FIRST (overrides every other section)
If any instruction below conflicts with simplicity, simplicity wins.
- **Minimal steps:** class → medium → subject → chapter. Four taps to start studying. Stream is asked only for Class 12 and only if needed; remember all choices so returning students land straight on their subjects.
- **Big buttons:** min 56px tall primary buttons, 48px touch targets, one main action per screen, full-width cards on mobile.
- **Plain words:** everyday Hindi/English ("पढ़ें", "अभ्यास करें", "आगे"), no jargon, no English-only labels in Hindi mode, short sentences, icons always paired with text.
- **No clutter:** max 4–6 choices per screen, no pop-ups, no banners, no carousels, no ads, no sign-up prompts (sign-in appears only when buying a plan or syncing progress), no tiny text links as primary actions; hide advanced options (timer, OMR view, filters) behind a simple "और विकल्प / More options".
- **Accents are tiny and optional:** neon glow only as a thin highlight on the selected/active item; the site must look complete with all accents turned off (`accents: false` in config).
- **Always findable:** a visible Back button and Home on every page; the current class/medium chip is always visible.
- Test rule: a first-time user must reach a chapter in ≤4 taps and under 30 seconds; if any screen needs explanation, simplify it.

## 1. Inspect first
- Look at the existing project: framework, dependencies, routing, components. Keep whatever already works and reuse the current stack.
- If the project is empty, use **Vite + React + TypeScript + Tailwind CSS + Lucide icons + React Router**, with **vite-plugin-pwa** and pre-rendering (e.g. vite-react-ssg) so every content page ships as static HTML for SEO. Don't add any other heavy dependencies.

## 2. Identity and trust
- Working name: **"Bihar Board Padhai"** (keep it configurable in one file). Subtitle: "कक्षा 10 और 12 की तैयारी | Class 10 & 12 Preparation". **Don't use the BSEB logo or any name, domain or wording that suggests the site is official.**
- Footer and About page, in both languages: "This is an independent study website by AR Group Ventures. It is not affiliated with or endorsed by the Bihar School Examination Board. For official notices, results and admit cards, always visit biharboardonline.bihar.gov.in."
- Never write "AI", "analytics", "algorithm" or similar jargon anywhere students can see it.

## 3. Visual system (about 95% textbook, ≤5% tiny optional glow; simplicity overrides styling)
- Base colours: dark blue ink #153B63, cream paper #F8F3E7, ink brown #8B6B42, notebook beige #E7E0D1, white #FFFFFF, light blue #E5EFF8. The cream background and dark-blue text always dominate.
- **Accent rule:** accent colours (#3B82F6 electric blue, #22D3EE cyan, #6366F1 indigo, #34D399 mint) are **never used for backgrounds, body text or large fills.** They appear only as:
  - the glow on the selected class, medium or option card: `box-shadow: 0 0 12px rgba(59,130,246,.18); border: 1px solid rgba(59,130,246,.55)`
  - a soft glow on hover or focus of subject cards and primary buttons, with `transition: 200ms ease`
  - the underline or dot on the active navigation item
  - progress bars (blue to cyan) and small icon highlights
  - correct answers in mint
- Default state: no glow. No dark or cyberpunk backgrounds, no glowing text, no glassmorphism, no big gradients, no heavy animation. Respect `prefers-reduced-motion`.
- Thin textbook-style borders, rounded rectangular cards, simple line-art icons, and a ruled-notebook or paper texture made **only with CSS** (no image files).
- Fonts: Noto Sans Devanagari for Hindi, Noto Sans or Inter for English. Self-host subset WOFF2 files with `font-display: swap`, keep the system fallback readable, and use a Hindi line-height of at least 1.7. Base text size is 16–18px.
- Touch targets are at least 48px. Colour contrast must meet WCAG AA.
- **Light pastel layer (polish, not decoration).** Use soft light tints that sit on the cream paper. All text on them is dark blue #153B63 (contrast 9.4–10.8:1) or deep brown #5C4A2E (7.0–8.0:1), so both pass WCAG AA and AAA for body text. Card border colour: the tint darkened about 15%.
  | Tint | Hex | Used for |
  |---|---|---|
  | Soft mint | #E3F4EC | Science group: Physics, Chemistry, Biology, Class 10 Science, Agriculture |
  | Sky | #E2F0FB | Maths group: Maths, Advanced Maths, Computer Science |
  | Peach | #FDE9DC | Languages: Hindi, English, Sanskrit, Urdu, Maithili and the other languages |
  | Lavender | #ECE7F8 | Arts / Social Science: History, Political Science, Geography, Sociology, Psychology, Philosophy |
  | Butter yellow | #FBF3D5 | Commerce: Accountancy, Business Studies, Economics, Entrepreneurship |
  | Rose | #FBE4E8 | Practical and others: Home Science, Music, Yoga, vocational subjects, sent-up/practical prep |
  - Section backgrounds alternate between cream #F8F3E7, warm white #FFF8EC and soft beige #F2EEE3. Never put tint on tint.
  - Quiz feedback: correct answers get a mint background #E3F4EC, a #2F855A border and a ✓; wrong answers get a soft red background #FDECEC, a #C53030 border and a ✗. Always show the icon and text as well as the colour.
- **Spacing scale (4px base):** 4, 8, 12, 16, 24, 32, 48. Card padding is 16px on mobile and 24px on desktop, gaps between sections are 32px, and gaps in grids are 12–16px. Page side margin is 16px.
- **Type scale:** 14 (meta), 16 (body, 17 for Hindi), 18 (card title), 22 (section heading), 28 (page title, 24 on mobile). Weights are 400 and 600 only. Line-height is 1.5 for English and 1.7 for Hindi.
- **Radius and shadow:** cards 12px, buttons 10px, chips 999px. Resting shadow `0 1px 2px rgba(21,59,99,.08)`, no more.
- **Subject card anatomy, top to bottom:** a 40px line icon in a white circle → title (18/600) → a one-line subtitle in the other language or a book name (14, ink brown) → "12 पाठ / 12 chapters" → a thin progress bar with "3/12". The whole card is one tap target, at least 96px tall, with the tint background.
- **Buttons:** all at least 56px tall, full width on mobile.
  - **Primary:** #153B63 background, white text 17/600.
  - **Secondary:** white background, 1.5px #153B63 border, dark-blue text.
  - **Ghost / link:** dark-blue text with an underline on focus.
  - **Locked:** beige #E7E0D1 background, ink-brown text, lock icon and "₹149 में खोलें / Unlock for ₹149". It opens the plans page and is never shown as disabled-grey.
  - **Disabled:** 50% opacity with `aria-disabled`, and the reason written next to it.
- **States:**
  - selected: 2px #153B63 border plus a tick and the tiny blue glow
  - hover/focus: a 3px light-blue focus ring #93C5FD
  - loading: skeleton blocks in #F2EEE3, with no spinners longer than 300ms
  - empty: a friendly line-art image with one sentence and one button ("अभी कोई सेव पाठ नहीं / No saved chapters yet → विषय चुनें")
  - error: a soft red box #FDECEC with plain words and a [फिर से कोशिश करें / Try again] button
  - offline: a beige banner reading "आप ऑफ़लाइन हैं, सेव पाठ पढ़ सकते हैं"
- **Header:** 56px tall on a white/cream background with a 1px beige bottom border. It holds the logo and name on the left and the language toggle plus the class/medium chip on the right. Nothing else goes in it on mobile.
- **Bottom nav:** 64px tall, white, with a top border. Four items, each with an icon and a label (12–13px). The active item gets dark-blue text and a 3px blue bar on top (the only glow). It respects the safe-area inset.
- **Chapter reading view:** content no wider than 680px, body 17–18px, line-height 1.7. Headings get a light-blue underline rule. "याद रखें / Remember" boxes are butter yellow with a left border; formula boxes are sky. A sticky bottom bar holds [← पिछला] [सेव] [अभ्यास करें →]. A text-size control offers A− / A+.
- **Quiz option states:** default is white with a beige border; selected is a dark-blue border; correct is mint; wrong is soft red, and the correct option is then also shown in mint. The explanation box below is sky. Options are at least 56px tall, with A/B/C/D shown in circles.
- **Plan and pricing cards:** three white cards, each with a pastel top strip (Matric peach, Inter sky, All Access lavender), the price in 28/600, the line "परीक्षा खत्म होने तक मान्य", a list of at most 4 ✓ features, and a primary button. The card matching the student's class gets the selected border. There are no strike-through prices, fake timers or "best value" badges.
- The site must look complete with `accents:false`. Accent glow stays below 5% of the screen.

## 4. First-visit flow (no registration needed to start; sign-in only for paid plans, see 17A)
Order: **choose class → choose medium → (Class 12 only) choose stream → home.**
1. **Choose class:** two large cards, "कक्षा 10 (मैट्रिक) / Class 10 (Matric)" and "कक्षा 12 (इंटर) / Class 12 (Inter)".
2. **Choose medium:** "आप किस माध्यम से पढ़ाई करना चाहते हैं? / Choose your study medium." Cards for हिंदी माध्यम / Hindi Medium and English Medium.
3. **Choose stream (Class 12):** कला (Arts), विज्ञान (Science), वाणिज्य (Commerce). Arts is the largest stream, so list it first or give it equal weight.
- Save all three choices in localStorage. Show a "बदलें / Change" chip in the header (e.g. "कक्षा 12 · हिंदी · विज्ञान") so students can change them at any time. If the site's interface language (the toggle) is different from the study medium, the medium controls the content and the toggle controls the labels. By default, both follow the medium.

## 5. Homepage, in this order
A. **Header:** open-book logo, name, nav (Home, Subjects, Mock Test, Papers), the हिंदी | English toggle, and the class and medium chip. Keep it compact.
B. **Hero (short):** "कक्षा 10 और 12 की पूरी तैयारी / Complete preparation for Class 10 & 12" and "बिहार बोर्ड की पढ़ाई अब और भी आसान / Making Bihar Board studies easier", with a small SVG textbook illustration.
C. **Exam countdown card:** "बोर्ड परीक्षा में __ दिन बाकी" for the selected class, read from `examCalendar.json`. Each date carries a status, `official` or `expected`. If it is expected, show "संभावित तिथि / Expected date".
D. If the class or medium hasn't been chosen yet, show those cards here.
E. **Subject grid** for the selected class and stream.
F. **Quick-start row (max 3 items, may be hidden for first-time users):** "आज के 10 ऑब्जेक्टिव प्रश्न / Today's 10 objective questions", "मॉडल पेपर", "पिछले साल के प्रश्न".
G. **Official links box**, labelled "आधिकारिक वेबसाइट (BSEB) / Official BSEB links": results, admit card, registration, notices. These are external links with an ↗ icon.
H. Footer with the disclaimer, About, Privacy, a report-an-error link, and the WhatsApp channel link.

## 6. Subject catalogue (configurable, nothing hard-coded in the UI)
`/src/data/subjects.ts`: each subject has id, BSEB subject code(s), class, stream(s), group (compulsory language, elective, additional), name in Hindi and English, an icon, the marks split (theory and practical), and the objective pattern (`given`/`attempt`, e.g. 100/50, or 70/35 for subjects with practicals).
- **Class 10:** Hindi (MIL), Sanskrit and other second languages (SIL), English, Mathematics, Science, Social Science, plus optional subjects such as Advanced Maths. Also Urdu, Maithili, Bangla, Bhojpuri, Arabic and Persian.
- **Class 12 Arts:** History, Political Science, Geography, Economics, Sociology, Psychology, Philosophy, Home Science, Music and others.
- **Class 12 Science:** Physics, Chemistry, Biology, Mathematics, Computer Science, Agriculture.
- **Class 12 Commerce:** Accountancy, Business Studies, Economics, Entrepreneurship.
- **Languages (Class 12):** Hindi, English, Urdu, Maithili, Sanskrit, Bhojpuri, Magahi, Prakrit, Pali, Arabic, Persian, Bangla.
- Seed the codes from BSEB's model-paper pages (biharboardonline.com/modelpaperinter.html, /modelpapermatric.html), and mark the subject list "verify against the current BSEB syllabus."

- **Load the subject catalogue and chapter lists from `/workspace/bseb/syllabus/bseb_syllabus.json`** (copy it to `/src/data/bseb_syllabus.json`). Generate the subject and chapter pages from it. Show subjects whose `status` starts with `gap` as "पाठ्यक्रम जल्द / Syllabus coming soon". Never fill gaps with invented chapters.

## 7. Subject page: six study cards
1. पाठ के नोट्स / Chapter Notes
2. ऑब्जेक्टिव प्रश्न / Objective Questions (chapter-wise MCQs). **This is the flagship feature, because half the paper is OMR MCQs.**
3. महत्वपूर्ण प्रश्न / Important Subjective Questions (short and long answers)
4. मॉडल पेपर व पिछले वर्ष के प्रश्न पत्र / Model Papers & Previous Year Papers
5. मॉक टेस्ट / Mock Test
6. पाठ्यक्रम / Syllabus (with the marks split and the textbook name, linked to the official NCERT or BSTBPC PDF)
Below the cards there is a chapter list, and each chapter shows a progress tick.

## 8. Chapter page
Readable notes (headings, key points, formulas, diagrams as optimised SVG or WebP that load only on scroll), "याद रखें / Remember" boxes, a short objective quiz at the end, an optional YouTube lesson (thumbnail first, and the iframe **loads only on tap**, with a data warning), buttons for Save for offline, Mark as done, and Share on WhatsApp, and Previous/Next chapter.

## 9. Practice and exams
- **Objective practice:** one question at a time, with large A–D option buttons. Show the answer and explanation instantly. Skip, bookmark, and retry wrong answers.
- **Mock test, BSEB pattern:** choose a full paper (e.g. 100 given, attempt any 50, or 70 given, attempt 35) or a quick 10/25-question set. There is an **OMR-style answer sheet view** (bubbles A–D, a counter of attempted questions, and a warning when the student goes over the limit) and an optional 3 h 15 min timer. The timer pauses if the student leaves the page, and the last answer is saved on every tap. The result screen shows the score, correct, wrong and skipped counts, a review of mistakes, and "practice these chapters again."
- **Subjective practice:** question, model answer outline, and a reveal button.
- **Sent-up and practical prep:** a section with a checklist and the important questions for the sent-up exam, plus a practical/viva question list for Physics, Chemistry and Biology.
- **Papers:** a list sorted by year and subject code. Each entry has a source label: `BSEB official model paper` (link or credited copy), `Previous year (source: …)`, or `Sample (हमारे द्वारा बनाया गया / made by us)`. Offer an in-browser PDF view, Download, and a file-size label (e.g. "1.2 MB").

## 10. My Study (all on the device)
Saved and offline chapters, completed chapters, bookmarked questions, mock test history, a simple streak ("लगातार 3 दिन"), and a per-subject progress bar. Add a "Reset" button and a short explanation that "everything is saved only on your phone."

## 11. Content model and accuracy (strict)
- All content lives in `/content/{class}/{medium}/{subject}/{chapter}.json` (or Markdown), separate from the UI. The schema includes `status: "sample" | "draft" | "reviewed" | "verified_official"`, `source`, `sourceUrl`, `lastReviewed` and `reviewer`.
- The UI shows a visible badge for `sample` ("नमूना प्रश्न / Sample, not an official board question"). **Never label anything official unless it comes from a BSEB source that is cited.** Never invent syllabus data, PYQs or dates.
- Don't copy textbook text. Link to official NCERT, BSTBPC and BSEB PDFs instead.
- Build a validation script (`npm run content:check`) that checks schema, missing translations, duplicate IDs and broken links.
- Structure the content so it can later move to a headless CMS (e.g. Decap or Sanity) or Google Sheets → JSON without changing the UI. Document the editorial workflow in `CONTENT_GUIDE.md`: writer → reviewer → publish.
- Every question and chapter gets a "गलती बताएं / Report a mistake" link that opens a prefilled WhatsApp or mailto message.

## 12. Translations
All UI text lives in `/src/i18n/hi.ts` and `/src/i18n/en.ts`. Typing must never show a missing key. Search works in Hindi, English and **Hinglish** ("bhautiki" finds भौतिकी) through an alias list for each subject and chapter.

## 13. Built for low-end phones and slow internet
- Target a ₹7k Android phone (2 GB RAM) on a slow 3G connection: initial JS under about 150 KB gzipped, Lighthouse mobile performance of 90 or more, LCP under 2.5 s, no layout shift, and route-level code splitting.
- **PWA:** installable ("होम स्क्रीन पर जोड़ें"), with an offline shell, offline saved chapters and quizzes, and an offline page. Never cache videos.
- A **"कम डेटा मोड / Low-data mode"** toggle hides images and video thumbnails and shows file sizes before any download.
- No horizontal overflow at 320px width. Test at 360, 768 and 1280px.

## 14. Reach and growth
- **SEO:** pre-rendered, crawlable pages with readable Hindi and English URLs (e.g. `/class-12/hindi/bhautiki/objective-question`), unique titles and meta tags matching real searches ("बिहार बोर्ड 12वीं भौतिकी ऑब्जेक्टिव प्रश्न 2027", "bihar board model paper 2027"), `hreflang` tags, sitemap.xml, robots.txt, Open Graph images, and FAQ/Quiz schema.
- **Sharing:** a WhatsApp share button on every question, quiz result and chapter (with prefilled Hindi text and a link), plus join links for the WhatsApp channel and Telegram group taken from config.
- **School or coaching code (optional):** `?ref=CODE` is saved locally and attached to anonymous events, so the founder can measure how well distribution partners perform.

## 15. Founder analytics (privacy-respecting, invisible to students)
Use cookieless analytics (Plausible, Umami or Cloudflare Web Analytics, set in config). Track events for class and medium selected, chapter opened, quiz completed, mock completed, share clicked and PWA installed. Analytics collects no personal data; account data (17A) stays separate from analytics. Write a privacy page in simple Hindi and English.

## 16. Doubts (simple, no backend required for the MVP)
An "अपना सवाल पूछें / Ask a doubt" form that opens WhatsApp with the subject, chapter and question pre-filled. Leave a clear backend hook for later.

## 17. Pricing and plans (one-time payment, valid till that class's board exam ends)
Free forever (no login needed): chapter notes, a limited set of objective questions per chapter, official BSEB model-paper links and the exam countdown.
Paid plans, each valid until the student's board exam ends (expiry date read from `examCalendar.json`, shown clearly as "परीक्षा खत्म होने तक मान्य / Valid till your exam ends"):
- **मैट्रिक प्लान / Matric Plan: ₹149**. Full Class 10 access: all objective questions, important questions, full BSEB-pattern mock tests, sent-up prep and PDF downloads.
- **इंटर प्लान / Intermediate Plan: ₹199**. The same full access for Class 12 (all streams).
- **सभी प्लान / All Access: ₹299**. Class 10 and Class 12 together.
- Prices, plan names and validity live in `/src/config/plans.ts`, never hard-coded in the UI. Show prices in plain words with no fake discounts, countdown pressure or pop-ups. One simple "प्लान देखें / See plans" page, reachable from the menu and from a locked item.
- Locked items show a small lock icon and one line: "पूरा अभ्यास ₹149 में / Full practice for ₹149". Never block free content.
- Payments: **PayU only**, using hosted checkout with UPI first (then cards and net banking). The order and price are created on the server, and the PayU hash is **generated and verified on the server** (the salt is never on the client). The plan unlocks only after the S2S webhook's reverse hash is verified, PayU's verify_payment API confirms the payment, and the amount and txnid match. The success/failure/pending return URLs never unlock anything by themselves. Handle pending UPI, retry, duplicate payments (auto-refund), refund requests and the upgrade to ₹299 (pay the difference). The full flow is in section 17D. Send a receipt on WhatsApp or email. Show no ads in the MVP.

## 17A. Sign-in and accounts (WhatsApp number + WhatsApp OTP only)
- Browsing free content never needs an account. Ask students to sign in only to buy a plan, sync progress across phones, use My Admit Card, or turn on WhatsApp reminders.
- **The only login method is a WhatsApp number and a 6-digit OTP**, sent with an approved WhatsApp Business API *authentication* template (Cloud API directly or through a BSP). **There is no SMS OTP and no email OTP.** If WhatsApp delivery fails, show a clear [दोबारा भेजें / Resend] button and a [मदद / Help] support contact, never SMS. Email is an optional profile field used only for receipts.
- OTPs are stored hashed, expire after 5 minutes, allow at most 5 attempts, and resend after 30 s, then 60 s, then 120 s. Rate limits: 3 sends per 10 minutes and 10 per day per number, plus an IP limit. Use big OTP boxes.
- One account per WhatsApp number, so a new or shared phone restores the plan. Sessions use a 60-day sliding refresh token (or until the exam end plus 30 days) and a 1-hour access token. Offer logout and "log out of all phones".
- Backend: Supabase, Firebase or the existing backend. Store only the WhatsApp number, an optional name, an optional email, class, medium, stream, plan and consents. Never ask for Aadhaar.
- After login, merge local progress into the account. On a shared phone, ask before merging, defaulting to No. My Study gets "मेरा प्लान / My plan", logout and delete-my-account.
- Update the privacy page in simple Hindi and English.

## 17B. मेरा एडमिट कार्ड / My Admit Card (logged-in students only)
1. Entry: My Study → "मेरा एडमिट कार्ड जोड़ें / Add my admit card". A consent screen explains, in plain words, what is read, that it is stored privately, never shared, and can be deleted at any time. Buttons: [मैं सहमत हूँ / I agree] and [नहीं / No].
2. Upload: [फ़ोटो लें / Take photo] or [PDF चुनें / Choose PDF]. The file is **compressed on the device** (images to at most 1600px, JPEG/WebP about 300 KB; PDF page 1 rendered to an image). Show tips for a good photo: flat, bright, all four corners visible.
3. Reading: OCR runs on the server or in a private function (e.g. Google Vision / Tesseract with the Hindi and English models). It extracts name, roll code, roll number, exam centre (name and code), subjects with codes, and exam dates with shifts. Show "पढ़ रहे हैं… / Reading…".
4. **Confirm screen:** every field is shown in an editable box with low-confidence fields highlighted, and a note: "हर जानकारी जाँचें और ज़रूरत हो तो सुधारें / Check every field and correct it if needed". Dates and shifts can also be filled automatically from `examCalendar.json` using the subject codes. Nothing is saved until the student taps [सही है, सेव करें / Correct, save].
5. Output: a clean digital admit card and a **personal exam timetable** (subject, date, shift, reporting time, centre), with a permanent red-bordered banner: **"यह आधिकारिक एडमिट कार्ड नहीं है / Not an official admit card – carry the original to the exam"**. It is not downloadable as an "admit card", only as "मेरी परीक्षा समय-सारिणी / My exam timetable". There is no BSEB logo.
6. Security: a private storage bucket with per-user access rules, encryption at rest, signed URLs that expire in 5 minutes, and no public links. The original image is deleted 30 days after it is confirmed, unless the student chooses to keep it. [एडमिट कार्ड हटाएँ / Delete admit card] removes the file, the extracted data and the scheduled reminders immediately. The data is never shared or used for marketing.
7. Errors:
   - "फ़ोटो साफ़ नहीं है, फिर से लें / Photo not clear, retake"
   - "यह BSEB एडमिट कार्ड नहीं लगता / This doesn't look like a BSEB admit card"
   - upload failure → Retry
   - file over 10 MB → compress or choose another file

## 17C. Personal WhatsApp notifications (opt-in only)
- Consent is a separate unticked checkbox at sign-up plus a toggle in Settings: "WhatsApp पर रिमाइंडर / WhatsApp reminders", with sub-toggles for exam reminders, practice nudges and plan reminders. Store each consent with a timestamp and source.
- Send only **approved WhatsApp Business API templates**, in Hindi or English according to the student's medium:
  - (a) **Exam reminder**: the day before at 7 PM IST and the morning of the paper at 6 AM IST, with subject, date, shift, centre and reporting time (taken from My Admit Card, or from `examCalendar.json` if no admit card has been added)
  - (b) **Practice nudge**: at most 2 a week, and none during the 3 days around an exam
  - (c) **Plan expiry**: 7 days and 1 day before `validTill`
  - (d) **Payment receipt**
- Opt-out: a reply of **STOP**, "बंद करें" or "UNSUBSCRIBE" is handled by the webhook. It turns off all marketing and nudge messages immediately and sends one confirmation. Receipts are still allowed, and the Settings toggle stays in sync. Keep a suppression list.
- Scheduler: a backend cron job, e.g. Supabase cron / Vercel Cron plus a queue, runs every 5 minutes. It computes due messages from the timetables, keeps an idempotency key per user, template and paper, and observes quiet hours from 9 PM to 6 AM IST (the 6 AM exam reminder is the only exception). It rate-limits per user (at most 3 a day) and globally per the WhatsApp tier, retries with backoff, and logs delivery status from the webhooks.
- **Tests (required):**
  - consent gating (no consent means no send)
  - STOP handling and toggle sync
  - correct day-before and morning send times in IST
  - no duplicate sends (idempotency)
  - quiet hours and per-user rate limits
  - template variables filled correctly in Hindi and English
  - reminders removed when the admit card is deleted
  - expiry reminders computed from `validTill`
  - PayU hash generation and verification, including a tampered hash
  - webhook idempotency, duplicate-payment refund, and the upgrade-difference amount
  - OTP expiry, attempt limit and rate limit

## 17D. Detailed user flows (account creation, login, PayU payment)
Implement exactly the screens, labels, backend steps, edge cases, error messages and mermaid flowcharts in **`/workspace/bseb/BSEB_user_flows.md`** (copy it to `/docs/user-flows.md`). Summary:
- (a) **Account creation:**
  - Triggered by buy, sync, admit card or reminders.
  - Screens: WhatsApp number → WhatsApp OTP → optional name, with class/medium/stream auto-filled and an optional email for receipts → separate WhatsApp-notification consent → merge local progress.
- (b) **Login:**
  - WhatsApp OTP only, with resend 30/60/120 s.
  - Separate messages for wrong OTP, expired OTP and rate limit.
  - If WhatsApp delivery fails: Resend plus Help.
  - New or shared phone: restore the account, and ask before merging local progress.
  - Logout and log out of all phones; 60-day sliding session.
- (c) **PayU payment:**
  - Main path: See plans → pick plan → log in if needed → order created on the server with a server-side hash → PayU hosted checkout, UPI first.
  - Return pages: surl, furl and pending, none of which unlock anything.
  - Unlocking: S2S webhook with reverse-hash check, verify_payment, and amount/txnid match → entitlement with validTill = exam end → WhatsApp/email receipt.
  - Edge cases: pending UPI polling, retry with a new txnid, duplicate payment auto-refunded, refund requests, upgrade ₹149/₹199 → ₹299 by paying the difference.

## 18. Pages and routes (every route must work, and unknown routes get a friendly 404)
`/` home · `/choose` (class, medium, stream) · `/subjects` · `/:class/:medium/:subject` · `/:class/:medium/:subject/:chapter` · `.../objective` · `.../important-questions` · `/papers` (with filters) · `/mock-test` and `/mock-test/:id` and the result page · `/syllabus/:subject` · `/exam-calendar` · `/sent-up-practical` · `/my-study` · `/about` · `/privacy` · `/disclaimer` · `/offline` · `/plans` · `/checkout/:orderId` · `/payment/success` · `/payment/failure` · `/payment/pending` · `/login` · `/my-plan` · `/admit-card` · `/my-timetable` · `/settings/notifications`. Backend endpoints: `/auth/otp/request`, `/auth/otp/verify`, `/me/merge`, `/orders`, `/payu/webhook`, `/admit-card/upload`, `/admit-card/confirm`, `/whatsapp/webhook`, plus the cron job `notifications:dispatch`.
Mobile bottom nav (fixed, 4 items, labels always shown): होम / Home · विषय / Subjects · टेस्ट / Tests · मेरी पढ़ाई / My Study. Papers is reached from Home and Subjects. On desktop the header nav has the same items plus Papers.

## 19. Seed data
For each class, include one subject in both mediums (e.g. Class 10 Science, Class 12 Physics, Class 12 History) with 2 chapters of **sample** notes, 20 **sample** MCQs and one sample mock test, all marked `sample`. Include real links to the official model-paper pages and the BSEB website. Add `examCalendar.json` with the 2027 dates marked `expected` and a comment saying "update from the official BSEB date sheet."

## 20. Quality and delivery
- Use semantic HTML, keyboard and screen-reader support, visible focus rings, alt text and `lang="hi"` on Hindi blocks.
- Run the dev server, lint, typecheck, `content:check` and build, and fix every error. Add Vitest tests for medium, class and stream persistence, the translation switch, the mock-test scoring and attempt limit, plan locking and expiry, OTP login flow (mocked), and routing. Smoke-test with Playwright: first visit → Class 12 → Hindi → Science → Physics → chapter → quiz → result, in both languages and at 360px.
- Finally, report what you built and the assumptions you made, list **all demo or sample content** still to replace, confirm WhatsApp OTP login, PayU hash/webhook, admit-card OCR confirm/delete, WhatsApp reminder scheduler and STOP opt-out and plan expiry work end to end in test mode, list what still needs real credentials (WhatsApp API, payment gateway keys), and give the Lighthouse scores.

**Final principle:** a first-time internet user on a shared phone should be able to open the site, pick a class, pick Hindi or English, pick a subject, open a chapter and start practising objective questions in under 30 seconds, without any technical knowledge.
