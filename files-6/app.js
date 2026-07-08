/**
 * app.js
 * ------
 * Wires up navigation between the landing page and the four app pages,
 * and renders all dynamic content (pipeline visuals, dashboard lists,
 * generator results, agent monitor, calendar). No framework/build step —
 * plain DOM APIs so the project stays beginner-friendly to read.
 */

const PAGES = ["landing", "dashboard", "generator", "agents", "calendar"];

/* ---------------------------------------------------------
   Local storage persistence
   ---------------------------------------------------------
   Persists calendar events/drafts and the running dashboard
   stat deltas so a reload doesn't lose everything the user did
   in this session. Falls back gracefully (in-memory only) if
   localStorage is unavailable — e.g. when this file is opened
   inside a sandboxed preview rather than a real browser tab.
--------------------------------------------------------- */
const STORAGE_KEY = "signal_app_state_v1";
let storageAvailable = true;

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    storageAvailable = false;
    console.warn("Signal: localStorage unavailable, running in-memory only.", e);
    return null;
  }
}

function persistState() {
  if (!storageAvailable) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      calendarEvents,
      scheduledDraftIds: Array.from(scheduledDraftIds),
      generatedDrafts,
      appStats,
      agentStatusMap,
      agentActivityLog,
      lastResearch,
      lastCampaign,
    }));
  } catch (e) {
    storageAvailable = false;
    console.warn("Signal: could not save state to localStorage.", e);
  }
}

// Running dashboard stats — starts at zero and increments as the user
// generates and schedules content so the dashboard reflects real activity.
let appStats = {
  totalGenerated: 0,
  totalScheduled: 0,
  engagementSum: 0,
  engagementCount: 0,
  imagesGenerated: 0,
};

// Extra drafts created by the Content Generator (separate from the seeded
// CALENDAR_SEED_DRAFTS) so a freshly generated post can also be scheduled
// straight onto the Content Calendar.
let generatedDrafts = [];
// IDs (seed or generated) that have already been placed on the calendar.
let scheduledDraftIds = new Set();

// Live status per agent (id -> "idle" | "working" | "done"), used to render
// the Dashboard's "Content pipeline status" panel from whichever pipeline
// ran most recently (quick single-post run or full autonomous campaign).
let agentStatusMap = Object.fromEntries(AGENT_DEFS.map(a => [a.id, "idle"]));
// Rolling log of agent completions (newest first), used for the Dashboard's
// "Agent activity" panel — falls back to the static AGENT_ACTIVITY seed
// until at least one real pipeline run has happened.
let agentActivityLog = [];
// Most recent Trend Research Agent output (from either pipeline), and the
// most recent full campaign (research + weekly plan + 7 days), both
// persisted so the Dashboard keeps showing them across reloads/navigation.
let lastResearch = null;
let lastCampaign = null;

function logAgentActivity(agentId, status, summary) {
  const def = AGENT_DEFS.find(a => a.id === agentId);
  agentActivityLog.unshift({
    title: def ? `${def.icon} ${def.name}` : agentId,
    sub: summary || (status === "working" ? "In progress…" : "Completed"),
    pill: status === "working" ? "pill-purple" : "pill-cyan",
    pillText: status === "working" ? "Working" : "Done",
  });
  agentActivityLog = agentActivityLog.slice(0, 12);
}

/* ---------------------------------------------------------
   Navigation
--------------------------------------------------------- */
function navigateTo(page) {
  const isLanding = page === "landing";
  document.getElementById("page-landing").classList.toggle("hidden", !isLanding);
  document.getElementById("appShell").classList.toggle("hidden", isLanding);

  document.getElementById("marketingLinks").classList.toggle("hidden", !isLanding);
  document.getElementById("appLinks").classList.toggle("hidden", isLanding);
  document.getElementById("launchBtn").classList.toggle("hidden", !isLanding);

  if (!isLanding) {
    document.querySelectorAll(".app-page").forEach(el => el.classList.add("hidden"));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.remove("hidden");

    document.querySelectorAll(".side-link[data-nav]").forEach(el => {
      el.classList.toggle("active", el.dataset.nav === page);
    });
    document.querySelectorAll(".app-link[data-nav]").forEach(el => {
      el.classList.toggle("active", el.dataset.nav === page);
    });
  }
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function bindNav() {
  document.querySelectorAll("[data-nav]").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(el.dataset.nav);
      closeMobileNav();
    });
  });
}

/* ---------------------------------------------------------
   Mobile nav (hamburger toggle for marketing links + sidebar)
--------------------------------------------------------- */
function closeMobileNav() {
  document.getElementById("marketingLinks")?.classList.remove("mobile-open");
  document.getElementById("appShell")?.classList.remove("sidebar-open");
  document.getElementById("navToggle")?.setAttribute("aria-expanded", "false");
  document.getElementById("mobileBackdrop")?.classList.remove("visible");
}

function bindMobileNav() {
  const toggle = document.getElementById("navToggle");
  const backdrop = document.getElementById("mobileBackdrop");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeMobileNav();
      return;
    }
    toggle.setAttribute("aria-expanded", "true");
    backdrop.classList.add("visible");
    const onLanding = !document.getElementById("page-landing").classList.contains("hidden");
    if (onLanding) {
      document.getElementById("marketingLinks").classList.add("mobile-open");
    } else {
      document.getElementById("appShell").classList.add("sidebar-open");
    }
  });

  backdrop.addEventListener("click", closeMobileNav);
  document.querySelectorAll("#marketingLinks a").forEach(a => {
    a.addEventListener("click", closeMobileNav);
  });
}

/* ---------------------------------------------------------
   Pipeline visual (shared by hero + agent monitor)
--------------------------------------------------------- */
function buildPipelineSvg(nodesGroupId, labelsContainerId) {
  const group = document.getElementById(nodesGroupId);
  if (!group) return;
  const n = AGENT_DEFS.length;
  const startX = 70, endX = 910, y = 80, r = 26;
  const step = (endX - startX) / (n - 1);

  group.innerHTML = AGENT_DEFS.map((agent, i) => {
    const x = startX + step * i;
    return `
      <circle class="pipeline-node" id="node-${nodesGroupId}-${agent.id}" cx="${x}" cy="${y}" r="${r}"></circle>
      <text class="pipeline-node-icon" x="${x}" y="${y}">${agent.icon}</text>
    `;
  }).join("");

  if (labelsContainerId) {
    const labels = document.getElementById(labelsContainerId);
    if (labels) {
      labels.innerHTML = AGENT_DEFS.map(a => `<span>${a.name.replace(" Agent", "")}</span>`).join("");
    }
  }
}

function setPipelineNodeState(nodesGroupId, agentId, state) {
  const node = document.getElementById(`node-${nodesGroupId}-${agentId}`);
  if (!node) return;
  node.classList.remove("active", "done");
  if (state) node.classList.add(state);
}

function setPipelineProgress(progressLineId, fraction) {
  const line = document.getElementById(progressLineId);
  if (!line) return;
  const total = 840; // matches stroke-dasharray in CSS
  line.style.strokeDashoffset = String(total - total * fraction);
}

function animateHeroPipelineLoop() {
  const order = AGENT_DEFS.map(a => a.id);
  let i = 0;
  function step() {
    order.forEach((id, idx) => {
      setPipelineNodeState("pipelineNodes", id, idx < i ? "done" : idx === i ? "active" : null);
    });
    setPipelineProgress("pipelineProgress", i / (order.length - 1));
    i = (i + 1) % (order.length + 2);
    setTimeout(step, 900);
  }
  step();
}

/* ---------------------------------------------------------
   Landing page dynamic sections
--------------------------------------------------------- */
function renderWorkflowChain() {
  const el = document.getElementById("workflowChain");
  if (!el) return;
  el.innerHTML = AGENT_DEFS.map((a, i) => `
    <div class="chain-step">
      <div class="chain-icon">${a.icon}</div>
      <h4>${a.name}</h4>
      <p>${a.desc}</p>
    </div>
    ${i < AGENT_DEFS.length - 1 ? '<div class="chain-arrow">→</div>' : ''}
  `).join("");
}

function renderTestimonials() {
  const el = document.getElementById("testimonialGrid");
  if (!el) return;
  el.innerHTML = TESTIMONIALS.map(t => `
    <div class="t-card">
      <p class="t-quote">"${t.quote}"</p>
      <div class="t-person">
        <div class="t-avatar">${t.name.split(" ").map(w => w[0]).join("")}</div>
        <div>
          <div class="t-name">${t.name}</div>
          <div class="t-role">${t.role}</div>
        </div>
      </div>
    </div>
  `).join("");
}

/* ---------------------------------------------------------
   Dashboard
--------------------------------------------------------- */
function renderDashboard() {
  const statGrid = document.getElementById("statGrid");
  if (statGrid) {
    const avgEngagement = Math.round(appStats.engagementSum / Math.max(1, appStats.engagementCount));
    const liveStats = [
      { label: "Total generated posts", value: appStats.totalGenerated, delta: "Live session count", dir: "up" },
      { label: "Scheduled posts", value: appStats.totalScheduled, delta: "Live session count", dir: "up" },
      { label: "Avg. engagement score", value: avgEngagement, delta: `${appStats.engagementCount} post${appStats.engagementCount === 1 ? "" : "s"} counted`, dir: "up" },
      { label: "Active agents", value: AGENT_DEFS.length, delta: "All operational", dir: "up" },
    ];
    statGrid.innerHTML = liveStats.map(s => `
      <div class="stat-card">
        <div class="stat-value">${s.value}</div>
        <div class="stat-label">${s.label}</div>
        <div class="stat-delta ${s.dir}">${s.delta}</div>
      </div>
    `).join("");
  }

  const trendingList = document.getElementById("trendingList");
  if (trendingList) {
    trendingList.innerHTML = TRENDING_TOPICS.map(t => `
      <div class="mini-item">
        <div><div class="mi-title">${t.topic}</div></div>
        <span class="pill pill-cyan">${t.relevance}%</span>
      </div>
    `).join("");
  }

  const agentActivityList = document.getElementById("agentActivityList");
  if (agentActivityList) {
    if (agentActivityLog.length) {
      agentActivityList.innerHTML = agentActivityLog.map(a => `
        <div class="mini-item">
          <div><div class="mi-title">${a.title}</div><div class="mi-sub">${a.sub}</div></div>
          <span class="pill ${a.pill}">${a.pillText}</span>
        </div>
      `).join("");
    } else {
      agentActivityList.innerHTML = `<p style="font-size:.85rem;color:var(--text-dim);margin:1rem 0;">No recent agent activity. Generate a post to see agents work in real-time.</p>`;
    }
  }

  const upcomingList = document.getElementById("upcomingList");
  if (upcomingList) {
    const scheduled = calendarEvents.filter(e => e.status === "scheduled").slice(0, 5); // top 5
    if (scheduled.length) {
      upcomingList.innerHTML = scheduled.map(u => `
        <div class="mini-item">
          <div>
            <div class="mi-title">${(u.title || "Scheduled Post").slice(0,35)}${(u.title||"").length>35?"…":""}</div>
            <div class="mi-sub">${u.platform} · ${u.slot ? u.slot.split(" · ")[1] || "" : ""}</div>
          </div>
          <span class="pill pill-cyan">Scheduled</span>
        </div>
      `).join("");
    } else {
      upcomingList.innerHTML = `<p style="font-size:.85rem;color:var(--text-dim);margin:1rem 0;">No upcoming scheduled posts. Add some from the calendar!</p>`;
    }
  }

  renderCampaignOverview();
  renderDashTrendPanel();
  renderPipelineStatusList();
  renderWeeklyPlanPanel();
  renderWeeklyCalendarPreview();
  if (typeof renderCampaignChart === "function") {
    renderCampaignChart(lastCampaign ? lastCampaign.days : null);
  }
}

// Campaign Overview stat cards — summarizes the most recent autonomous
// campaign run (7-day content + image + hashtag + schedule output).
function renderCampaignOverview() {
  const el = document.getElementById("campaignStatGrid");
  if (!el) return;
  if (!lastCampaign) {
    el.innerHTML = `<div class="stat-card" style="grid-column:1/-1;"><div class="stat-label">No campaign run yet — click "Run Autonomous Campaign" on the Agent Monitor page to populate this section.</div></div>`;
    return;
  }
  const days = lastCampaign.days;
  const avgOverall = Math.round(days.reduce((s, d) => s + d.engagement.overall, 0) / days.length);
  const totalHashtags = days.reduce((s, d) => s + d.hashtag.tags.length, 0);
  const cards = [
    { label: "Campaign days generated", value: days.length, delta: "Mon → Sun", dir: "up" },
    { label: "Generated images", value: days.length, delta: "1 per day", dir: "up" },
    { label: "Posts drafted (3 platforms × 7 days)", value: days.length * 3, delta: "LinkedIn + Instagram + X", dir: "up" },
    { label: "Avg. predicted engagement", value: avgOverall, delta: `${totalHashtags} hashtags total`, dir: "up" },
  ];
  el.innerHTML = cards.map(s => `
    <div class="stat-card">
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
      <div class="stat-delta ${s.dir}">${s.delta}</div>
    </div>
  `).join("");
}

// Trend Research Agent — top 5 topics + recommended topic, shown on the
// Dashboard (and mirrored on Agent Monitor via renderCampaignTrendDetail).
function renderDashTrendPanel() {
  const el = document.getElementById("dashTrendPanel");
  if (!el) return;
  const research = lastCampaign?.research || lastResearch;
  if (!research) {
    el.innerHTML = `<p style="font-size:.85rem;color:var(--text-dim);">Run the pipeline or an autonomous campaign to see live Trend Research Agent output here.</p>`;
    return;
  }
  el.innerHTML = research.topics.map(t => `
    <div class="mini-item">
      <div><div class="mi-title">${t.topic}${t.topic === research.recommended.topic ? ' <span class="pill pill-green" style="margin-left:.4rem;">Recommended</span>' : ""}</div></div>
      <span class="pill pill-cyan">${t.relevance}%</span>
    </div>
  `).join("");
}

// Content pipeline status — one row per agent, reflecting whichever
// pipeline (quick run or campaign) executed most recently.
function renderPipelineStatusList() {
  const el = document.getElementById("pipelineStatusList");
  if (!el) return;
  el.innerHTML = AGENT_DEFS.map(a => {
    const status = agentStatusMap[a.id] || "idle";
    const pill = status === "done" ? "pill-cyan" : status === "working" ? "pill-purple" : "pill-amber";
    const text = status === "done" ? "Done" : status === "working" ? "Working" : "Idle";
    return `
      <div class="mini-item">
        <div><div class="mi-title">${a.icon} ${a.name}</div></div>
        <span class="pill ${pill}">${text}</span>
      </div>
    `;
  }).join("");
}

// Weekly content plan — from the Content Planning Agent (campaign only).
function renderWeeklyPlanPanel() {
  const el = document.getElementById("weeklyPlanList");
  if (!el) return;
  if (!lastCampaign) {
    el.innerHTML = `<p style="font-size:.85rem;color:var(--text-dim);">Run an autonomous campaign to generate a 7-day content strategy.</p>`;
    return;
  }
  el.innerHTML = lastCampaign.planner.week.map(w => `
    <div class="mini-item">
      <div><div class="mi-title">${w.day} — ${w.topic}</div><div class="mi-sub">${w.angle}</div></div>
      <span class="pill pill-cyan">${w.relevance}%</span>
    </div>
  `).join("");
}

// Weekly content calendar preview — day + scheduled slot for the latest
// campaign (the full Content Calendar page shows the actual month grid;
// this is a compact weekly summary of what the Scheduler Agent decided).
function renderWeeklyCalendarPreview() {
  const el = document.getElementById("weeklyCalendarPreview");
  if (!el) return;
  if (!lastCampaign) {
    el.innerHTML = `<p style="font-size:.85rem;color:var(--text-dim);">Run an autonomous campaign to see the week's posting schedule here.</p>`;
    return;
  }
  el.innerHTML = lastCampaign.days.map(d => `
    <div class="mini-item">
      <div><div class="mi-title">${d.dayName} — ${d.topic}</div><div class="mi-sub">${d.scheduler.rationale}</div></div>
      <span class="pill pill-green">${d.scheduler.slot}</span>
    </div>
  `).join("");
}

/* ---------------------------------------------------------
   Content Generator
--------------------------------------------------------- */
function renderPipelineMini() {
  const el = document.getElementById("pipelineMini");
  if (!el) return;
  el.innerHTML = AGENT_DEFS.map(a => `
    <div class="pmini-step" id="pmini-${a.id}"><span class="dot"></span>${a.name}</div>
  `).join("");
}

function setPmini(agentId, state) {
  const el = document.getElementById(`pmini-${agentId}`);
  if (!el) return;
  el.classList.remove("active", "done");
  if (state) el.classList.add(state);
}

// Maps a scheduler slot like "Tue · 10:30 AM" to a day-of-month number within
// the currently displayed calendar month, so the Scheduler Agent's
// recommendation can be placed directly onto the Content Calendar instead of
// only being shown as text.
function resolveSlotToDay(slot) {
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const shortDay = slot.split(" · ")[0];
  const targetDow = dow.indexOf(shortDay);
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  let day = today.getDate();
  for (let i = 0; i < daysInMonth + 1; i++) {
    if (new Date(today.getFullYear(), today.getMonth(), day).getDay() === targetDow) return day;
    day = day >= daysInMonth ? 1 : day + 1;
  }
  return today.getDate();
}

// Maps a full weekday name ("Monday") to a day-of-month within the
// currently displayed calendar month — used when placing autonomous
// campaign posts (which are scheduled by weekday, not a slot string).
function resolveWeekdayToDay(dayName) {
  const short = WEEKLY_DAY_SHORT[dayName] || dayName;
  return resolveSlotToDay(`${short} · 12:00 PM`);
}

function renderGeneratorResult(brief, result) {
  const panel = document.getElementById("resultPanel");
  const { writer, image, hashtag, review, engagement, scheduler } = result;
  const platforms = [
    { key: "linkedin", label: "LinkedIn Post" },
    { key: "instagram", label: "Instagram Caption" },
    { key: "twitter", label: "X / Twitter Post" },
  ];
  const primaryKey = brief.platform === "Instagram" ? "instagram" : brief.platform === "X/Twitter" ? "twitter" : "linkedin";

  panel.innerHTML = `
    <div class="result-post">
      <div class="result-block">
        <h4>✍️ Content Writer Agent — all platform versions</h4>
        <div class="campaign-platform-grid">
          ${platforms.map(p => `
            <div class="campaign-platform-block" style="${p.key === primaryKey ? "border-color:var(--accent);" : ""}">
              <h6>${p.label}${p.key === primaryKey ? " · selected platform" : ""}</h6>
              <p>${writer[p.key].content}</p>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="result-block">
        <h4>🖼️ Image Generation Agent</h4>
        <div class="image-card ${image.imageUrl ? 'has-real-image' : ''}">
          ${image.imageUrl ? `<img src="${image.imageUrl}" class="real-image-thumb" />` : `<div class="image-thumb" style="background:${image.thumbGradient};">${image.thumbIcon}</div>`}
          <div class="image-meta">
            <h5>${image.style}</h5>
            <p>${image.concept}</p>
            <div class="image-prompt">${image.prompt}</div>
          </div>
        </div>
      </div>

      <div class="result-block">
        <h4>#️⃣ Hashtag Agent (${hashtag.tags.length} tags)</h4>
        <div class="hashtag-row">${hashtag.tags.map(t => `<span class="tag tag-cyan">${t}</span>`).join("")}</div>
      </div>

      <div class="result-block">
        <h4>✅ Quality Review Agent</h4>
        <div class="score-row">
          <div class="score-box"><div class="score-num">${review.grammar}</div><div class="score-label">Grammar</div></div>
          <div class="score-box"><div class="score-num">${review.clarity}</div><div class="score-label">Clarity</div></div>
          <div class="score-box"><div class="score-num">${review.readability}</div><div class="score-label">Readability</div></div>
          <div class="score-box"><div class="score-num">${review.tone}</div><div class="score-label">Tone</div></div>
          <div class="score-box"><div class="score-num" style="color:var(--accent)">${review.qualityScore}</div><div class="score-label">Overall</div></div>
        </div>
        <p style="margin:.75rem 0 0;color:var(--text-dim);font-size:.88rem;">${review.issues.join(" ")}</p>
      </div>

      <div class="result-block">
        <h4>📈 Engagement Prediction Agent</h4>
        <div class="score-row">
          <div class="score-box"><div class="score-num">${engagement.reach}</div><div class="score-label">Reach</div></div>
          <div class="score-box"><div class="score-num">${engagement.engagement}</div><div class="score-label">Engagement</div></div>
          <div class="score-box"><div class="score-num">${engagement.virality}</div><div class="score-label">Virality</div></div>
          <div class="score-box"><div class="score-num">${engagement.ctr}</div><div class="score-label">CTR</div></div>
          <div class="score-box"><div class="score-num" style="color:var(--accent)">${engagement.overall}</div><div class="score-label">Overall</div></div>
        </div>
        <p class="reasoning">${engagement.reasoning}</p>
      </div>

      <div class="result-block">
        <h4>📅 Scheduler Agent</h4>
        <div class="demo-time">${scheduler.slot}</div>
        <p style="margin:.6rem 0 0;color:var(--text-dim);font-size:.85rem;">${scheduler.rationale}</p>
        <button type="button" class="btn btn-secondary btn-small" id="addToCalendarBtn" style="margin-top:.85rem;">
          🗓️ Add to Content Calendar
        </button>
      </div>
    </div>
  `;

  document.getElementById("addToCalendarBtn").addEventListener("click", (e) => {
    const btn = e.currentTarget;
    const day = resolveSlotToDay(scheduler.slot);
    const firstLine = writer[primaryKey].content.split("\n")[0].slice(0, 60);

    // Compute actual ISO date for DB persistence
    const today = new Date();
    const scheduledDate = new Date(today.getFullYear(), today.getMonth(), day);
    const isoDate = scheduledDate.toISOString().split("T")[0]; // "YYYY-MM-DD"

    calendarEvents.push({
      day,
      title: firstLine,
      platform: brief.platform,
      status: "scheduled",
      fromGenerator: true,
    });

    // Also notify backend with exact date
    fetch('http://localhost:5000/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        time: scheduler.slot,
        platform: brief.platform,
        topic: firstLine,
        post_id: writer.id || 0,
        scheduled_date: isoDate
      })
    }).catch(e => console.warn("Backend /schedule unreachable", e));

    appStats.totalScheduled += 1;
    persistState();
    renderCalendarGrid();
    renderDashboard();

    btn.textContent = "✓ Added to calendar";
    btn.disabled = true;
  });
}

function bindGeneratorForm() {
  const form = document.getElementById("generatorForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const brief = {
      niche: document.getElementById("inputNiche").value.trim() || "your business",
      audience: document.getElementById("inputAudience").value.trim() || "your audience",
      platform: document.getElementById("inputPlatform").value,
      tone: document.getElementById("inputTone").value,
      type: document.getElementById("inputType").value,
    };
    const btn = document.getElementById("generateBtn");
    btn.disabled = true;
    btn.textContent = "Running agents…";
    AGENT_DEFS.forEach(a => setPmini(a.id, null));
    document.getElementById("resultPanel").innerHTML = `
      <div class="empty-state"><div class="empty-icon">⏳</div><p>Agents are working through the pipeline…</p></div>
    `;

    const result = await runPipeline(brief, (agentId, status, output) => {
      setPmini(agentId, status === "working" ? "active" : "done");
      agentStatusMap[agentId] = status;
      if (status === "done") logAgentActivity(agentId, status, output);
    });

    lastResearch = result.research;
    appStats.totalGenerated += 1;
    appStats.imagesGenerated += 1;
    appStats.engagementSum += result.engagement.overall;
    appStats.engagementCount += 1;
    persistState();
    renderDashboard();

    renderGeneratorResult(brief, result);
    btn.disabled = false;
    btn.textContent = "Generate content";
  });
}

/* ---------------------------------------------------------
   Agent Monitor page
--------------------------------------------------------- */
function renderAgentGrid() {
  const el = document.getElementById("agentGrid");
  if (!el) return;
  el.innerHTML = AGENT_DEFS.map(a => `
    <div class="agent-card">
      <div class="agent-card-head">
        <h4>${a.icon} ${a.name}</h4>
        <span class="status-badge status-idle" id="status-${a.id}">Idle</span>
      </div>
      <p class="agent-desc">${a.desc}</p>
      <div class="agent-output" id="output-${a.id}">Waiting to run…</div>
    </div>
  `).join("");
}

function setAgentCardState(agentId, status, output) {
  const badge = document.getElementById(`status-${agentId}`);
  const outEl = document.getElementById(`output-${agentId}`);
  if (badge) {
    badge.className = `status-badge status-${status === "working" ? "working" : status === "done" ? "done" : "idle"}`;
    badge.textContent = status === "working" ? "Working…" : status === "done" ? "Done" : "Idle";
  }
  if (outEl && output) outEl.textContent = output;
}

function bindRunPipelineButton() {
  const btn = document.getElementById("runPipelineBtn");
  const campaignBtn = document.getElementById("runCampaignBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    if (campaignBtn) campaignBtn.disabled = true;
    btn.textContent = "Running…";
    AGENT_DEFS.forEach(a => {
      setPipelineNodeState("monitorNodes", a.id, null);
      setAgentCardState(a.id, "idle", "Waiting to run…");
    });
    setPipelineProgress("monitorProgress", 0);

    const brief = { niche: "a sustainable skincare brand", audience: "eco-conscious shoppers", platform: "Instagram", tone: "Casual" };
    const order = AGENT_DEFS.map(a => a.id);
    let idx = 0;
    const result = await runPipeline(brief, (agentId, status, output) => {
      setPipelineNodeState("monitorNodes", agentId, status === "working" ? "active" : "done");
      setAgentCardState(agentId, status, output);
      agentStatusMap[agentId] = status;
      if (status === "done") {
        logAgentActivity(agentId, status, output);
        idx = order.indexOf(agentId);
        setPipelineProgress("monitorProgress", idx / (order.length - 1));
      }
    });

    lastResearch = result.research;
    appStats.totalGenerated += 1;
    appStats.imagesGenerated += 1;
    appStats.engagementSum += result.engagement.overall;
    appStats.engagementCount += 1;
    persistState();
    renderDashboard();

    btn.disabled = false;
    if (campaignBtn) campaignBtn.disabled = false;
    btn.textContent = "Run pipeline (1 post)";
  });
}

/* ---------------------------------------------------------
   Autonomous Campaign (Agent Monitor page)
   ---------------------------------------------------------
   Runs the full 8-agent chain — Research → Planning → Writer →
   Image → Hashtag → Review → Engagement → Scheduler — producing
   a complete 7-day campaign, then renders the Research/Planning
   detail panels and one card per campaign day, updates the
   Dashboard, and schedules every day's post onto the Content
   Calendar automatically.
--------------------------------------------------------- */
function renderCampaignTrendDetail(research) {
  const el = document.getElementById("campaignTrendList");
  if (!el) return;
  el.innerHTML = research.topics.map(t => `
    <div class="mini-item">
      <div><div class="mi-title">${t.topic}${t.topic === research.recommended.topic ? ' <span class="pill pill-green" style="margin-left:.4rem;">Recommended</span>' : ""}</div></div>
      <span class="pill pill-cyan">${t.relevance}%</span>
    </div>
  `).join("");
}

function renderCampaignPlanDetail(planner) {
  const el = document.getElementById("campaignPlanList");
  if (!el) return;
  el.innerHTML = planner.week.map(w => `
    <div class="mini-item">
      <div><div class="mi-title">${w.day} — ${w.topic}</div><div class="mi-sub">${w.angle}</div></div>
      <span class="pill pill-cyan">${w.relevance}%</span>
    </div>
  `).join("");
}

function renderCampaignDays(days) {
  const el = document.getElementById("campaignDaysList");
  if (!el) return;
  el.innerHTML = days.map(d => `
    <div class="campaign-day-card">
      <div class="campaign-day-head">
        <h4>${d.dayName} — ${d.topic}</h4>
        <span class="pill pill-green">📅 ${d.scheduler.slot}</span>
      </div>
      <p style="margin:0 0 1rem;color:var(--text-dim);font-size:.85rem;">${d.angle} · ${d.scheduler.rationale}</p>

      <div class="campaign-platform-grid">
        <div class="campaign-platform-block"><h6>LinkedIn Post</h6><p>${d.writer.linkedin.content}</p></div>
        <div class="campaign-platform-block"><h6>Instagram Caption</h6><p>${d.writer.instagram.content}</p></div>
        <div class="campaign-platform-block"><h6>X / Twitter Post</h6><p>${d.writer.twitter.content}</p></div>
      </div>

      <div class="image-card ${d.image.imageUrl ? 'has-real-image' : ''}" style="margin-bottom:1rem;">
        ${d.image.imageUrl ? `<img src="${d.image.imageUrl}" class="real-image-thumb" />` : `<div class="image-thumb" style="background:${d.image.thumbGradient};">${d.image.thumbIcon}</div>`}
        <div class="image-meta">
          <h5>${d.image.style}</h5>
          <p>${d.image.concept}</p>
          <div class="image-prompt">${d.image.prompt}</div>
        </div>
      </div>

      <div class="hashtag-row" style="margin-bottom:1rem;">${d.hashtag.tags.map(t => `<span class="tag tag-cyan">${t}</span>`).join("")}</div>

      <div class="score-row" style="margin-bottom:.5rem;">
        <div class="score-box"><div class="score-num">${d.review.qualityScore}</div><div class="score-label">Quality</div></div>
        <div class="score-box"><div class="score-num">${d.engagement.reach}</div><div class="score-label">Reach</div></div>
        <div class="score-box"><div class="score-num">${d.engagement.engagement}</div><div class="score-label">Engagement</div></div>
        <div class="score-box"><div class="score-num">${d.engagement.virality}</div><div class="score-label">Virality</div></div>
        <div class="score-box"><div class="score-num">${d.engagement.ctr}</div><div class="score-label">CTR</div></div>
        <div class="score-box"><div class="score-num" style="color:var(--accent)">${d.engagement.overall}</div><div class="score-label">Overall</div></div>
      </div>
    </div>
  `).join("");
}

function bindRunCampaignButton() {
  const campaignBtn = document.getElementById("runCampaignBtn");
  const quickBtn = document.getElementById("runPipelineBtn");
  if (!campaignBtn) return;

  campaignBtn.addEventListener("click", async () => {
    campaignBtn.disabled = true;
    if (quickBtn) quickBtn.disabled = true;
    campaignBtn.textContent = "Running autonomous campaign…";

    document.getElementById("campaignSection")?.classList.add("hidden");
    AGENT_DEFS.forEach(a => {
      setPipelineNodeState("monitorNodes", a.id, null);
      setAgentCardState(a.id, "idle", "Waiting to run…");
    });
    setPipelineProgress("monitorProgress", 0);

    const brief = {
      niche: document.getElementById("inputNiche")?.value.trim() || "a sustainable skincare brand",
      audience: document.getElementById("inputAudience")?.value.trim() || "eco-conscious shoppers",
      platform: document.getElementById("inputPlatform")?.value || "Instagram",
      tone: document.getElementById("inputTone")?.value || "Casual",
      type: document.getElementById("inputType")?.value || "General Content",
    };

    const order = AGENT_DEFS.map(a => a.id);
    let idx = 0;
    const campaign = await runCampaignPipeline(brief, (agentId, status, output) => {
      setPipelineNodeState("monitorNodes", agentId, status === "working" ? "active" : "done");
      setAgentCardState(agentId, status, output);
      agentStatusMap[agentId] = status;
      if (status === "done") {
        logAgentActivity(agentId, status, output);
        idx = order.indexOf(agentId);
        setPipelineProgress("monitorProgress", idx / (order.length - 1));
      }
    });

    // Schedule every day's post onto the Content Calendar automatically —
    // this is what makes the Scheduler Agent's output more than just text.
    campaign.days.forEach(d => {
      const dayOfMonth = resolveWeekdayToDay(d.dayName);
      
      // Compute actual ISO date for DB persistence
      const today = new Date();
      const scheduledDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
      const isoDate = scheduledDate.toISOString().split("T")[0];

      calendarEvents.push({
        day: dayOfMonth,
        title: `${d.topic}`,
        platform: brief.platform,
        status: "scheduled",
        fromCampaign: true,
      });

      // Also notify backend with exact date
      fetch('http://localhost:5000/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time: d.scheduler.slot,
          platform: brief.platform,
          topic: d.topic,
          post_id: 0,
          scheduled_date: isoDate
        })
      }).catch(e => console.warn("Backend /schedule unreachable", e));
    });

    lastResearch = campaign.research;
    lastCampaign = { research: campaign.research, planner: campaign.planner, days: campaign.days, generatedAt: Date.now() };
    appStats.totalGenerated += campaign.days.length;
    appStats.totalScheduled += campaign.days.length;
    appStats.imagesGenerated += campaign.days.length;
    campaign.days.forEach(d => {
      appStats.engagementSum += d.engagement.overall;
      appStats.engagementCount += 1;
    });
    persistState();

    renderCalendarGrid();
    renderDrafts();
    renderDashboard();
    renderCampaignTrendDetail(campaign.research);
    renderCampaignPlanDetail(campaign.planner);
    renderCampaignDays(campaign.days);
    document.getElementById("campaignSection")?.classList.remove("hidden");

    campaignBtn.disabled = false;
    if (quickBtn) quickBtn.disabled = false;
    campaignBtn.textContent = "🚀 Run Autonomous Campaign";
  });
}

/* ---------------------------------------------------------
   Content Calendar (with native HTML5 drag & drop)
--------------------------------------------------------- */
let calendarEvents = [];

function renderDrafts() {
  const el = document.getElementById("draftsList");
  if (!el) return;
  const remaining = generatedDrafts.filter(d => !scheduledDraftIds.has(d.id));
  el.innerHTML = remaining.map(d => `
    <div class="draft-card" draggable="true" data-draft-id="${d.id}">
      <div class="draft-platform">${d.platform}</div>
      ${d.title}
    </div>
  `).join("") || `<p style="font-size:.85rem;">All drafts scheduled. Nice work.</p>`;

  el.querySelectorAll(".draft-card").forEach(card => {
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", card.dataset.draftId);
    });
  });
}

function renderCalendarGrid() {
  const grid = document.getElementById("calendarGrid");
  const monthLabel = document.getElementById("calendarMonthLabel");
  if (!grid) return;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  monthLabel.textContent = today.toLocaleString("default", { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let html = dow.map(d => `<div class="cal-dow">${d}</div>`).join("");

  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const eventsForDay = calendarEvents.filter(e => e.day === day);
    const isToday = day === today.getDate();
    html += `
      <div class="cal-day${isToday ? ' today' : ''}" data-day="${day}">
        <div class="cal-date">${day}</div>
        ${eventsForDay.map(e => {
          const timeStr = e.slot ? e.slot.split(" · ")[1] || "" : "";
          const label = (e.title || "Scheduled Post").slice(0, 25);
          return `<div class="cal-event ${e.status}" title="${(e.title || '').replace(/"/g, '&quot;')}">${timeStr ? timeStr + " · " : ""}${label}</div>`;
        }).join("")}
      </div>
    `;
  }
  grid.innerHTML = html;

  grid.querySelectorAll(".cal-day[data-day]").forEach(dayEl => {
    dayEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      dayEl.classList.add("drag-over");
    });
    dayEl.addEventListener("dragleave", () => dayEl.classList.remove("drag-over"));
    dayEl.addEventListener("drop", (e) => {
      e.preventDefault();
      dayEl.classList.remove("drag-over");
      const draftIdStr = e.dataTransfer.getData("text/plain");
      const draftId = Number(draftIdStr) || draftIdStr;
      const draft = generatedDrafts.find(d => d.id === draftId);
      if (!draft) return;
      
      const dayNum = Number(dayEl.dataset.day);
      const today = new Date();
      // Format dummy time string based on dropped day
      const targetDate = new Date(today.getFullYear(), today.getMonth(), dayNum);
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const slotStr = `${days[targetDate.getDay()]} · 12:00 PM`;

      calendarEvents.push({
        day: dayNum,
        title: draft.title,
        platform: draft.platform,
        status: "scheduled",
        fromDraftId: draft.id,
      });
      scheduledDraftIds.add(draft.id);
      
      // Notify backend with exact date
      const isoDate = targetDate.toISOString().split("T")[0];
      fetch('http://localhost:5000/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time: slotStr,
          platform: draft.platform,
          topic: draft.title,
          post_id: draft.id,
          scheduled_date: isoDate
        })
      }).catch(e => console.warn("Backend /schedule unreachable", e));

      appStats.totalScheduled += 1;
      persistState();
      renderCalendarGrid();
      renderDrafts();
      renderDashboard();
    });
  });
}

async function initCalendar() {
  const saved = loadPersistedState();
  if (saved) {
    if (saved.appStats) appStats = { imagesGenerated: 0, ...saved.appStats };
    if (saved.agentStatusMap) agentStatusMap = saved.agentStatusMap;
    if (saved.agentActivityLog) agentActivityLog = saved.agentActivityLog;
    if (saved.lastResearch) lastResearch = saved.lastResearch;
    if (saved.lastCampaign) lastCampaign = saved.lastCampaign;
  }
  
  try {
    const res = await fetch('http://localhost:5000/posts');
    if (res.ok) {
      const db = await res.json();
      
      // Parse drafts — content is stored as a JSON string of the variants object
      generatedDrafts = db.drafts.map(d => {
        let title = d.topic || "Untitled";
        try {
          if (d.content) {
            const parsed = JSON.parse(d.content);
            // Pick the first platform variant's content first line
            const firstVariant = parsed.linkedin || parsed.instagram || parsed.twitter;
            if (firstVariant && firstVariant.content) {
              title = firstVariant.content.split("\n")[0].slice(0, 60);
            }
          }
        } catch(e) {
          // content wasn't JSON, use it directly
          if (d.content) title = d.content.split("\n")[0].slice(0, 60);
        }
        return { id: d.id, title, platform: d.platform, status: d.status };
      });
      
      scheduledDraftIds = new Set(db.scheduled.map(s => s.post_id));
      
      // Map scheduled posts — use the stored scheduled_date for exact day placement
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      calendarEvents = db.scheduled
        .map(s => {
          let day = null;
          // If we have a stored ISO date, extract the day-of-month
          if (s.scheduled_date) {
            const d = new Date(s.scheduled_date + "T00:00:00");
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
              day = d.getDate();
            }
          }
          // Fallback: use resolveSlotToDay if no date stored (legacy entries)
          if (day === null && s.time) {
            day = resolveSlotToDay(s.time);
          }
          if (day === null) return null;
          
          return {
            id: s.id,
            day,
            title: s.topic || "Scheduled Post",
            platform: s.platform,
            status: "scheduled",
            fromDraftId: s.post_id,
            slot: s.time
          };
        })
        .filter(e => e !== null);
    } else {
      calendarEvents = [];
      scheduledDraftIds = new Set();
      generatedDrafts = [];
    }
  } catch(e) {
    console.error("Failed to load posts from DB", e);
    calendarEvents = [];
    scheduledDraftIds = new Set();
    generatedDrafts = [];
  }

  renderDrafts();
  renderCalendarGrid();
}

/* ---------------------------------------------------------
   Boot
--------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  bindNav();
  bindMobileNav();
  buildPipelineSvg("pipelineNodes", "pipelineLabels");
  buildPipelineSvg("monitorNodes");
  animateHeroPipelineLoop();
  renderWorkflowChain();
  renderTestimonials();
  initCalendar(); // loads persisted state (incl. appStats) before dashboard renders
  renderDashboard();
  initDashboardCharts();
  renderPipelineMini();
  bindGeneratorForm();
  renderAgentGrid();
  bindRunPipelineButton();
  bindRunCampaignButton();

  // Restore Agent Monitor's campaign detail panels if a campaign was run in
  // a previous session (persisted via localStorage).
  if (lastCampaign) {
    renderCampaignTrendDetail(lastCampaign.research);
    renderCampaignPlanDetail(lastCampaign.planner);
    renderCampaignDays(lastCampaign.days);
    document.getElementById("campaignSection")?.classList.remove("hidden");
  }
  // Restore each agent card/pipeline-node's last known status too.
  Object.entries(agentStatusMap).forEach(([id, status]) => {
    setAgentCardState(id, status, status === "done" ? "Completed in a previous run." : undefined);
    setPipelineNodeState("monitorNodes", id, status === "done" ? "done" : status === "working" ? "active" : null);
  });

  navigateTo("landing");
});
