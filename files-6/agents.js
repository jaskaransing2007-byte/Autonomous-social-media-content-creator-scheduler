/**
 * agents.js
 * ---------
 * Simulates the eight-agent autonomous pipeline:
 *   1. Trend Research Agent
 *   2. Content Planning Agent   (weekly-only)
 *   3. Content Writer Agent     (LinkedIn + Instagram + X, per topic)
 *   4. Image Generation Agent
 *   5. Hashtag Agent
 *   6. Quality Review Agent
 *   7. Engagement Prediction Agent
 *   8. Scheduler Agent
 *
 * Each function represents one autonomous agent. In this college-project
 * build the "intelligence" is template-based mock logic so the app runs
 * with zero external API keys — see README "Going from mock to real APIs"
 * for how each function maps to a real LLM/image-gen API call.
 *
 * Two orchestrators are exposed:
 *   - runPipeline(brief, onStep)          → single-topic, 7-agent run
 *     (skips Planning, since there's only one topic, not a week of them).
 *     Used by the Content Generator page and the Agent Monitor "Run pipeline"
 *     quick demo.
 *   - runCampaignPipeline(brief, onStep)  → full 8-agent run producing a
 *     complete 7-day campaign. Used by "Run Autonomous Campaign".
 *
 * Both call the exact same underlying agent functions — the campaign
 * pipeline just runs Writer/Image/Hashtag/Review/Engagement/Scheduler once
 * per planned day instead of once total, which is what makes it a genuine
 * multi-agent *campaign* system instead of a single-post generator.
 */

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fill(template, { niche, audience }) {
  return template.replaceAll("{niche}", niche).replaceAll("{audience}", audience);
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/* =========================================================
   AGENT 1 — Trend Research Agent
   Discovers trending topics, scores niche relevance, and
   recommends the single strongest content opportunity.
========================================================= */
async function runResearchAgent(brief) {
  await wait(500);
  const topics = [...TRENDING_TOPICS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 5)
    .map(t => ({ ...t, relevance: clamp(t.relevance + Math.floor(Math.random() * 6), 0, 99) }))
    .sort((a, b) => b.relevance - a.relevance);
  const recommended = topics[0];
  return {
    topics,
    recommended,
    summary: `Found ${topics.length} trending angles for "${brief.niche}" — recommending "${recommended.topic}" (${recommended.relevance}% relevance).`,
  };
}

/* =========================================================
   AGENT 2 — Content Planning Agent
   Builds a full 7-day content strategy: one topic + one
   content "angle" per day of the week, drawing on the Trend
   Research Agent's top 5 topics so planning is genuinely
   informed by research rather than invented independently.
========================================================= */
async function runPlannerAgent(brief, research) {
  await wait(600);
  const pool = research.topics.length ? research.topics : TRENDING_TOPICS;
  const week = WEEKLY_DAYS.map((day, i) => {
    const t = pool[i % pool.length];
    return {
      day,
      topic: t.topic,
      relevance: t.relevance,
      angle: WEEKLY_ANGLES[i % WEEKLY_ANGLES.length],
    };
  });
  return {
    week,
    summary: `Built a 7-day content strategy across ${new Set(week.map(w => w.topic)).size} distinct topics, opening Monday with "${week[0].topic}" (${week[0].angle}).`,
  };
}

/* =========================================================
   AGENT 3 — Content Writer Agent
   Drafts a LinkedIn post, an Instagram caption, and an X/Twitter
   post for a given topic — all three platform versions, not just
   one, per the brief's tone.
========================================================= */
function craftPlatformVariants(brief, topicText, angle) {
  const hook = fill(pick(HOOKS[brief.tone]), brief);
  const body = fill(BODIES[brief.tone], brief);
  const cta = fill(CTAS[brief.tone], brief);
  const topicLine = topicText ? `Today's focus: ${topicText}${angle ? ` (${angle})` : ""}.` : "";

  const linkedinContent = `${hook}\n\n${topicLine ? topicLine + "\n\n" : ""}${body}\n\n${cta}`;

  const instagramContent = `${hook} ✨\n${topicLine}\n\n${body}\n\n${cta} 👇`;

  let twitterContent = `${hook}${topicLine ? " " + topicLine : ""}`.trim();
  if (twitterContent.length > 220) twitterContent = twitterContent.slice(0, 217) + "...";
  twitterContent += `\n\n${cta}`;
  if (twitterContent.length > 280) twitterContent = twitterContent.slice(0, 277) + "...";

  const wc = s => s.trim().split(/\s+/).length;
  return {
    linkedin: { content: linkedinContent, wordCount: wc(linkedinContent) },
    instagram: { content: instagramContent, wordCount: wc(instagramContent) },
    twitter: { content: twitterContent, wordCount: wc(twitterContent) },
  };
}

async function runWriterAgent(brief, topicText, angle) {
  await wait(300);
  const variants = craftPlatformVariants(brief, topicText, angle);
  return {
    ...variants,
    summary: `Drafted LinkedIn, Instagram, and X/Twitter versions${topicText ? ` around "${topicText}"` : ""}.`,
  };
}

/* =========================================================
   AGENT 4 — Image Generation Agent
   For every post, produces an image concept, an AI image prompt,
   a suggested visual style, and a thumbnail-preview placeholder
   (a seeded gradient + icon, since no external image-gen API is
   available in this offline build — see README).
========================================================= */
async function runImageAgent(brief, topicText) {
  await wait(350);
  const style = pick(IMAGE_STYLES);
  const mood = pick(IMAGE_MOODS);
  const subject = topicText || brief.niche;
  const prompt = IMAGE_PROMPT_TEMPLATE
    .replace("{style}", style)
    .replace("{topic_or_niche}", subject.toLowerCase())
    .replace("{mood}", mood);
  const seed = Math.floor(Math.random() * IMAGE_THUMB_GRADIENTS.length);
  return {
    concept: `A ${style.toLowerCase()} representing "${subject}" for ${brief.audience}.`,
    prompt,
    style,
    thumbGradient: IMAGE_THUMB_GRADIENTS[seed],
    thumbIcon: IMAGE_THUMB_ICONS[seed],
    summary: `Generated an image concept + prompt in a "${style}" style for "${subject}".`,
  };
}

/* =========================================================
   AGENT 5 — Hashtag Agent
   Combines trending + niche + high-engagement banks to
   guarantee at least 15 hashtags per post.
========================================================= */
async function runHashtagAgent(brief, writer) {
  await wait(250);
  const trendingPool = TRENDING_HASHTAG_BANK[brief.platform] || TRENDING_HASHTAG_BANK.LinkedIn;
  const draftText = (writer?.content || writer?.linkedin?.content || "").toLowerCase();

  const mentioned = NICHE_HASHTAG_BANK.filter(tag => draftText.includes(tag.toLowerCase()));
  const unmentionedNiche = NICHE_HASHTAG_BANK.filter(tag => !mentioned.includes(tag));
  const nichePool = [...mentioned, ...[...unmentionedNiche].sort(() => Math.random() - 0.5)];

  const highPool = [...HIGH_ENGAGEMENT_HASHTAG_BANK].sort(() => Math.random() - 0.5);

  // Priority order: trending, then niche, then high-engagement — but since
  // the same word can legitimately appear in more than one bank (e.g. a
  // niche tag that's also currently trending), we dedupe case-insensitively
  // and backfill from whatever's left until we reach at least 15 unique
  // tags, guaranteeing the "minimum 15 hashtags" requirement regardless of
  // overlap between banks.
  const categorized = [
    ...trendingPool.map(t => ({ tag: t, cat: "trending" })),
    ...nichePool.map(t => ({ tag: t, cat: "niche" })),
    ...highPool.map(t => ({ tag: t, cat: "high-engagement" })),
  ];

  const tags = [];
  const counts = { trending: 0, niche: 0, "high-engagement": 0 };
  const seen = new Set();
  for (const { tag, cat } of categorized) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(`#${tag}`);
    counts[cat] += 1;
    if (tags.length >= 15) break;
  }

  return {
    tags,
    summary: `Selected ${tags.length} hashtags — ${counts.trending} trending, ${counts.niche} niche, ${counts["high-engagement"]} high-engagement.`,
  };
}

/* =========================================================
   AGENT 6 — Quality Review Agent
   Scores grammar, clarity, readability, and tone consistency.
========================================================= */
async function runReviewAgent(draft) {
  await wait(300);
  const content = draft.content || draft.linkedin?.content || "";
  const wordCount = content.split(/\s+/).length;
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLen = sentences.length ? wordCount / sentences.length : wordCount;

  const readability = clamp(70 + Math.floor(wordCount / 4), 0, 98);
  const grammar = clamp(94 + Math.floor(Math.random() * 6), 0, 100);
  const clarity = clamp(100 - Math.floor(avgSentenceLen / 2), 60, 98);
  const tone = clamp(88 + Math.floor(Math.random() * 10), 0, 100);

  const issues = [];
  if (wordCount > 90) issues.push("Consider trimming for platform attention spans.");
  if (!content.includes("?") && !content.toLowerCase().includes("comment")) {
    issues.push("Add a direct question to invite replies.");
  }

  const qualityScore = Math.round((grammar + clarity + readability + tone) / 4);
  return {
    qualityScore, grammar, clarity, readability, tone,
    issues: issues.length ? issues : ["No issues found — grammar, tone, and readability all check out."],
    summary: `Quality score ${qualityScore}/100 (grammar ${grammar}, clarity ${clarity}, readability ${readability}, tone ${tone}).`,
  };
}

/* =========================================================
   AGENT 7 — Engagement Prediction Agent
   Predicts Reach, Engagement, Virality, and CTR, plus an
   overall score and plain-language reasoning.
========================================================= */
async function runEngagementAgent(brief, review) {
  await wait(350);
  const base = 60 + Math.floor(review.qualityScore / 5);
  const reach = clamp(base + Math.floor(Math.random() * 15), 0, 99);
  const engagement = clamp(base + Math.floor(Math.random() * 20) - 5, 0, 99);
  const virality = clamp(Math.floor((reach + engagement) / 2) - 10 + Math.floor(Math.random() * 10), 0, 99);
  const ctr = clamp(Math.floor((engagement + review.qualityScore) / 2) - 5 + Math.floor(Math.random() * 10), 0, 99);
  const overall = Math.round((reach + engagement + virality + ctr) / 4);
  const reasoning = `Reach is driven by the ${brief.platform} audience size for "${brief.niche}" content; engagement benefits from the ${brief.tone.toLowerCase()} tone matching ${brief.audience}; CTR tracks the quality score (${review.qualityScore}/100); virality stays realistic for single-post content rather than a series.`;
  return { reach, engagement, virality, ctr, overall, reasoning, summary: `Predicted engagement: ${overall}/100 (reach ${reach}, engagement ${engagement}, virality ${virality}, CTR ${ctr}).` };
}

/* =========================================================
   AGENT 8 — Scheduler Agent
   Recommends posting day + time and writes a scheduling
   rationale. In campaign mode `forcedDay` comes from the
   Content Planning Agent (so the week stays coherent); in
   single-post mode it's left undefined and the agent picks
   the platform's best day itself, same as before.
========================================================= */
async function runSchedulerAgent(brief, engagement, forcedDay) {
  await wait(250);
  const timeSlots = {
    LinkedIn: ["10:30 AM", "8:00 AM", "12:15 PM"],
    Instagram: ["6:00 PM", "11:00 AM", "7:30 PM"],
    "X/Twitter": ["9:00 AM", "1:00 PM", "4:45 PM"],
  };
  const defaultDays = {
    LinkedIn: ["Tue", "Wed", "Thu"],
    Instagram: ["Fri", "Sat", "Wed"],
    "X/Twitter": ["Mon", "Thu", "Fri"],
  };
  const times = timeSlots[brief.platform] || timeSlots.LinkedIn;
  const days = defaultDays[brief.platform] || defaultDays.LinkedIn;
  const overall = engagement?.overall ?? 0;

  const dayShort = forcedDay ? (WEEKLY_DAY_SHORT[forcedDay] || forcedDay) : (overall >= 80 ? days[0] : pick(days));
  const time = overall >= 80 ? times[0] : pick(times);
  const slot = `${dayShort} · ${time}`;

  const rationale = forcedDay
    ? `Locked to ${forcedDay} per the weekly content plan; ${time} is a peak ${brief.platform} activity window${overall >= 80 ? `, reinforced by a strong ${overall}/100 predicted engagement score` : ""}.`
    : (overall >= 80
      ? `Boosted to the top ${brief.platform} slot because predicted engagement (${overall}/100) is strong.`
      : `Standard ${brief.platform} activity peak for this content's predicted engagement (${overall}/100).`);

  return { day: forcedDay || dayShort, time, slot, rationale, summary: `Recommended send time: ${slot}. ${rationale}` };
}

/**
 * Single-topic orchestrator (7 agents — no Planning, since there's only one
 * topic). Used by the Content Generator page and the Agent Monitor's quick
 * "Run pipeline" demo. `onStep(agentId, status, output)` fires before/after
 * each agent so the UI can animate progress.
 */
async function runPipeline(brief, onStep) {
  onStep("research", "working");
  const research = await runResearchAgent(brief);
  onStep("research", "done", research.summary);

  onStep("writer", "working");
  const writer = await runWriterAgent(brief, research.recommended.topic);
  onStep("writer", "done", writer.summary);

  onStep("image", "working");
  const image = await runImageAgent(brief, research.recommended.topic);
  onStep("image", "done", image.summary);

  onStep("hashtag", "working");
  const hashtag = await runHashtagAgent(brief, writer.linkedin);
  onStep("hashtag", "done", hashtag.summary);

  onStep("review", "working");
  const review = await runReviewAgent(writer.linkedin);
  onStep("review", "done", review.summary);

  onStep("engagement", "working");
  const engagement = await runEngagementAgent(brief, review);
  onStep("engagement", "done", engagement.summary);

  onStep("scheduler", "working");
  const scheduler = await runSchedulerAgent(brief, engagement);
  onStep("scheduler", "done", scheduler.summary);

  return { research, writer, image, hashtag, review, engagement, scheduler };
}

/**
 * Full 8-agent campaign orchestrator. Runs Research once, Planning once
 * (producing 7 day/topic assignments), then runs Writer → Image → Hashtag
 * → Review → Engagement → Scheduler as a "wave" across all 7 planned days —
 * i.e. each agent processes the *entire week* before handing off to the
 * next agent, exactly matching the requested
 * Research → Planning → Writing → Image → Hashtag → Review → Engagement →
 * Scheduling flow. `onStep(agentId, status, output)` fires once per agent
 * (not once per day), so the pipeline visualization animates agent-by-agent.
 */
async function runCampaignPipeline(brief, onStep) {
  onStep("research", "working");
  const research = await runResearchAgent(brief);
  onStep("research", "done", research.summary);

  onStep("planner", "working");
  const planner = await runPlannerAgent(brief, research);
  onStep("planner", "done", planner.summary);

  const days = planner.week.map(d => ({ dayName: d.day, topic: d.topic, angle: d.angle, relevance: d.relevance }));

  onStep("writer", "working");
  for (const d of days) d.writer = await runWriterAgent(brief, d.topic, d.angle);
  onStep("writer", "done", `Drafted ${days.length} days × 3 platform versions each (${days.length * 3} total posts).`);

  onStep("image", "working");
  for (const d of days) d.image = await runImageAgent(brief, d.topic);
  onStep("image", "done", `Generated ${days.length} image concepts, prompts, and visual styles.`);

  onStep("hashtag", "working");
  for (const d of days) d.hashtag = await runHashtagAgent(brief, d.writer.linkedin);
  onStep("hashtag", "done", `Selected 15+ hashtags for each of the ${days.length} days.`);

  onStep("review", "working");
  for (const d of days) d.review = await runReviewAgent(d.writer.linkedin);
  onStep("review", "done", `Reviewed all ${days.length} drafts for grammar, clarity, readability, and tone.`);

  onStep("engagement", "working");
  for (const d of days) d.engagement = await runEngagementAgent(brief, d.review);
  onStep("engagement", "done", `Predicted reach, engagement, virality, and CTR for all ${days.length} days.`);

  onStep("scheduler", "working");
  for (const d of days) d.scheduler = await runSchedulerAgent(brief, d.engagement, d.dayName);
  onStep("scheduler", "done", `Scheduled all ${days.length} posts across the week.`);

  return { research, planner, days };
}
