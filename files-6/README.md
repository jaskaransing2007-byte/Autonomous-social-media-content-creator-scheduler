# Signal — Autonomous Social Media Content Creator & Scheduler

A college-level Generative AI systems project demonstrating **six autonomous AI agents** collaborating in a pipeline to research, write, tag, review, score, and schedule social media content — with a full SaaS-style front end (landing page, dashboard, content generator, agent monitor, and drag-and-drop content calendar).

> **Note on AI output:** This build uses simulated ("mock") agent logic so it runs instantly with no API keys, no backend, and no install step beyond opening a file in a browser. The architecture is written so every mock function can be swapped for a real LLM call — see [Going from mock to real APIs](#going-from-mock-to-real-apis) below.

---

## 1. What this project demonstrates

- A **multi-agent pipeline** where each agent has one responsibility and hands its output to the next agent — Research → Writer → Hashtag → Review → Engagement → Scheduler.
- A **visual, live representation** of agents working (the pulse animation on the landing page and the Agent Monitor page).
- A **realistic product UI**: landing page, dashboard with charts, a working content generator, and an interactive content calendar with drag-and-drop.
- **Beginner-friendly code**: no build tools, no framework, no npm install — plain HTML, CSS, and JavaScript, fully commented.

---

## 2. Folder structure

```
social-ai-scheduler/
├── index.html              # All pages (landing + app shell) in one HTML file
├── style.css                # Design tokens, layout, components, animations
├── mockData.js              # All simulated data (topics, hashtags, testimonials, calendar seed data)
├── agents.js                # The 6 agent functions + pipeline orchestrator
├── charts.js                # Chart.js dashboard chart setup
├── app.js                    # Navigation + DOM rendering + event handling
├── ARCHITECTURE.md          # Architecture diagram + agent data-flow explanation
└── README.md
```

**Everything lives in one flat folder — intentionally.** All files sit next to `index.html` with no `css/`, `js/`, or `docs/` subfolders. This is a deliberate, beginner-proof choice: if the project is ever shared as loose downloaded files (rather than a zip), a subfolder structure is very easy to lose by accident, which silently breaks every `<link>`/`<script>` path and makes the whole page render unstyled. A flat structure has nothing to lose.

There is no `src/`, no bundler config, and no `node_modules` — every file is used exactly as written, directly by the browser.

---

## 3. How to run it

**Option A — just open it (fastest):**
1. Download / unzip the project folder.
2. Double-click `index.html`. It opens in your default browser and works fully offline except for two CDN links (Google Fonts and Chart.js).

**Option B — local server (recommended, avoids any browser file-access restrictions):**
```bash
cd social-ai-scheduler
python3 -m http.server 8080
# then visit http://localhost:8080 in your browser
```
Any static server works (VS Code "Live Server" extension, `npx serve`, etc.) — there is nothing to install or build.

**Deploying it:** because it's a static site, it can be dropped as-is onto GitHub Pages, Netlify, Vercel, or any static host with no configuration.

---

## 4. Pages

| Page | Purpose |
|---|---|
| **Landing page** | Marketing page: hero, features, workflow visualization, benefits, demo preview, testimonials, footer. |
| **Dashboard** | Stat cards (posts generated, scheduled, engagement, active agents), engagement trend chart, platform distribution chart, trending topics, agent activity, upcoming content. |
| **Content Generator** | Form (niche, audience, platform, tone) → runs the live 6-agent pipeline → renders the generated post, hashtags, quality notes, engagement scores + reasoning, and recommended posting time. |
| **Agent Monitor** | Visual pipeline + a status card per agent (idle / working / done) with the agent's live output, triggered by "Run pipeline." |
| **Content Calendar** | A drafts list and a month grid. Drag a draft card onto any day to schedule it; pre-seeded scheduled/upcoming posts are shown with a color legend. |

---

## 5. The six AI agents

Each agent is a plain JavaScript function in `agents.js`. `runPipeline()` awaits them in order and reports progress back to the UI via a callback, so you can watch each stage light up on the pipeline visualization.

1. **Trend Research Agent** — analyzes the niche and returns trending topics with a relevance score.
2. **Content Generation Agent** — writes a platform-specific post: hook, body, and call-to-action, shaped by the chosen tone.
3. **Hashtag Agent** — blends trending platform hashtags with niche hashtags for discoverability.
4. **Quality Review Agent** — checks length, tone, and structure, returning a quality score and any issues found.
5. **Engagement Prediction Agent** — estimates reach, engagement, and virality (0–100 each) plus a plain-language reasoning sentence explaining the score.
6. **Scheduler Agent** — recommends a posting time based on typical activity peaks for the selected platform (boosted to the platform's top slot when the Engagement agent's score is ≥80), and includes an **"Add to Content Calendar"** button on the Content Generator result panel that places the generated post directly onto the matching day in the Content Calendar.

See `ARCHITECTURE.md` for the full data-flow diagram between agents. As of this build, every agent that's meant to consume a prior agent's output actually does — the Hashtag Agent reads the Writer agent's draft to prioritize tags that appear in the post, and the Scheduler Agent reads the Engagement agent's score to choose the slot.

---

## 5.1 Persistence

Calendar events (including anything scheduled via drag-and-drop or the Generator's "Add to Content Calendar" button) and the live dashboard counters (`Total generated posts`, `Scheduled posts`, `Avg. engagement score`) are saved to the browser's `localStorage` under the key `signal_app_state_v1`, so a page reload keeps your session's activity instead of resetting to the seed data. If `localStorage` isn't available (e.g. a locked-down preview sandbox), the app falls back to in-memory state for that session with a console warning — everything still works, it just won't survive a reload.

---

## 6. Design system

Colors, type, and layout follow a consistent token system defined at the top of `style.css`:

| Token | Hex | Use |
|---|---|---|
| Primary | `#4F46E5` | Buttons, gradients, active states |
| Secondary | `#7C3AED` | Gradients, accents |
| Accent | `#06B6D4` | Highlights, active pipeline nodes, charts |
| Background | `#0F172A` | Page background |
| Card | `#1E293B` | Panels, cards |
| Text | `#F8FAFC` | Primary text |

Typography: **Space Grotesk** for headings (a geometric, technical display face fitting an "agents/signal" theme), **Inter** for body copy, and **JetBrains Mono** for data, tags, and timestamps — reinforcing the idea of a technical, data-driven product.

The signature visual element is the **pipeline pulse**: an animated line with six nodes representing the agent chain, reused on the landing hero and the Agent Monitor page, so the core idea of the product — "your content moves through a chain of specialist agents" — is visible before you read a single word of copy.

---

## 7. Going from mock to real APIs

Every mock function in `agents.js` is written to be replaced independently:

| Mock function | Real-world replacement |
|---|---|
| `runResearchAgent()` | Call a trends API (e.g. Google Trends, X/Twitter API, a news API) or prompt an LLM with retrieval/browsing tools. |
| `runWriterAgent()` | Call an LLM API (e.g. the Anthropic Messages API) with a prompt built from the brief + research output. |
| `runHashtagAgent()` | Call an LLM or a hashtag-analytics API, or ask an LLM to generate tags conditioned on the post content. |
| `runReviewAgent()` | Call a grammar/readability API (e.g. LanguageTool) or ask an LLM to critique its own draft. |
| `runEngagementAgent()` | Train or call a lightweight ML model on historical post performance, or ask an LLM to reason over the content and platform norms. |
| `runSchedulerAgent()` | Pull real audience-activity analytics from the target platform's API and/or write to a real calendar/database. |

Because `runPipeline()` only depends on each function returning a Promise with the same shape, you can swap one mock function for a real API call at a time without touching the UI code in `app.js`.

---

## 8. Future scope

- Real API integrations (LLM, trends, platform analytics) as outlined above.
- User accounts and a real database (e.g. Postgres) instead of in-memory mock state.
- Direct publishing to LinkedIn/Instagram/X via their official APIs.
- A/B testing of generated variants with real engagement feedback loops.
- Team collaboration: comments, approvals, and role-based permissions before a post ships.
- Multi-language content generation and localization.

---

## 9. Tech stack

Plain **HTML5 / CSS3 / vanilla JavaScript (ES6+)**, [Chart.js](https://www.chartjs.org/) via CDN for charts, and Google Fonts via CDN. No frameworks, no build step — chosen deliberately so the codebase is approachable for a beginner-to-intermediate audience and can be graded/reviewed by simply reading the files.
