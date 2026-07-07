/**
 * mockData.js
 * -----------
 * All simulated data lives here. In a production build, TRENDING_TOPICS,
 * TESTIMONIALS, and the hashtag/hook banks would instead come from real
 * APIs (e.g. a trends API, a CMS, a customer database). Keeping mocks in
 * one file makes it obvious what to swap out later — see README "Going
 * from mock to real APIs".
 */

const TRENDING_TOPICS = [
  { topic: "AI-assisted small business tools", relevance: 92 },
  { topic: "Short-form video repurposing", relevance: 88 },
  { topic: "Sustainable/eco-friendly branding", relevance: 84 },
  { topic: "Founder-led thought leadership", relevance: 81 },
  { topic: "Community-driven marketing", relevance: 77 },
  { topic: "Personal branding for creators", relevance: 74 },
];

const HOOKS = {
  Professional: [
    "Most teams don't have a {niche} problem. They have a consistency problem.",
    "Here's what three months of working with {audience} taught us about {niche}.",
    "The best {niche} brands aren't the loudest — they're the most consistent.",
  ],
  Casual: [
    "Okay real talk about {niche} for a sec —",
    "Nobody tells you this about {niche} until you're already in it:",
    "We tried something new with {audience} this week and honestly? Wild results.",
  ],
  Educational: [
    "3 things every {audience} should know about {niche} before they start:",
    "A quick breakdown of how {niche} actually works, for {audience}:",
    "Here's the framework we use to think about {niche}, explained simply.",
  ],
  Promotional: [
    "We built something for {audience} who are tired of guessing at {niche}.",
    "New drop: everything {audience} need to get {niche} right, in one place.",
    "This is your sign to finally fix your {niche} strategy.",
  ],
};

const BODIES = {
  Professional: "In our experience, {audience} succeed with {niche} when they focus on repeatable systems over one-off wins. Small, consistent actions compound faster than any single viral moment.",
  Casual: "So we've been testing a few things around {niche} lately, and honestly the results surprised us. Turns out {audience} respond way better to real talk than polished perfection.",
  Educational: "Step one: understand your audience's actual pain point around {niche}. Step two: solve it in public. Step three: repeat. That's most of what {audience} need to hear.",
  Promotional: "If you're part of {audience} and still figuring out {niche} the hard way, there's a better path — and we built it specifically with you in mind.",
};

const CTAS = {
  Professional: "What's one system you've built that quietly compounds for your business?",
  Casual: "Anyone else dealing with this? Drop your take below 👇",
  Educational: "Save this if it was helpful — more breakdowns like this every week.",
  Promotional: "Link in bio to see how it works for {audience}.",
};

const NICHE_HASHTAG_BANK = ["Strategy", "Growth", "SmallBusiness", "Founders", "Brand", "Marketing", "Startup", "ContentCreator"];
const TRENDING_HASHTAG_BANK = {
  LinkedIn: ["B2BMarketing", "ThoughtLeadership", "FutureOfWork", "AIagents"],
  Instagram: ["ReelsStrategy", "ContentCreator", "SmallBizTips", "CreatorEconomy"],
  "X/Twitter": ["BuildInPublic", "MarketingTwitter", "GrowthHacks", "IndieHackers"],
};
// High-engagement bank: generic "performs well regardless of niche" tags,
// combined with the trending + niche banks to guarantee 15+ hashtags per post.
const HIGH_ENGAGEMENT_HASHTAG_BANK = ["Viral", "MustSee", "GameChanger", "LevelUp", "Breakthrough", "GoViral", "TrendingNow", "WorthTheRead"];

/* ---------------------------------------------------------
   Image Generation Agent banks
--------------------------------------------------------- */
const IMAGE_STYLES = ["Modern flat illustration", "Cinematic 3D render", "Minimalist line art", "Vibrant gradient poster", "Photorealistic studio shot", "Retro-futuristic collage"];
const IMAGE_MOODS = ["blue neon lighting", "warm golden-hour tones", "clean studio lighting", "bold high-contrast colors", "soft pastel palette", "moody dramatic shadows"];
// Filled with {niche} / {topic}; produces the "AI image prompt" text.
const IMAGE_PROMPT_TEMPLATE = "{style} of {topic_or_niche}, {mood}, professional digital illustration, social-media ready composition.";
// CSS gradients used to render a thumbnail PLACEHOLDER (no real image gen available offline).
const IMAGE_THUMB_GRADIENTS = [
  "linear-gradient(135deg,#4F46E5,#06B6D4)",
  "linear-gradient(135deg,#7C3AED,#4F46E5)",
  "linear-gradient(135deg,#06B6D4,#7C3AED)",
  "linear-gradient(135deg,#4F46E5,#7C3AED)",
  "linear-gradient(135deg,#0EA5E9,#4F46E5)",
  "linear-gradient(135deg,#7C3AED,#06B6D4)",
];
const IMAGE_THUMB_ICONS = ["🖼️", "📷", "🎨", "✨", "🌆", "📸"];

/* ---------------------------------------------------------
   Weekly Content Planning Agent data
--------------------------------------------------------- */
const WEEKLY_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKLY_DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };
// Rotating content "angle" so each day of the week feels distinct even when
// pulling from the same trend pool.
const WEEKLY_ANGLES = ["Educational deep-dive", "Behind-the-scenes look", "Customer story", "Quick actionable tip", "Data & stats breakdown", "Community Q&A", "Weekly recap & takeaways"];

const TESTIMONIALS = [
  { name: "Priya Nair", role: "Founder, Studio Loop", quote: "We went from a content meeting every Monday to a five-minute review. The agents genuinely think through tone before I do." },
  { name: "Marcus Ade", role: "Marketing Lead, GreenCart", quote: "The engagement score reasoning is what sold me. It's not just a number — it tells us why a post will or won't land." },
  { name: "Sana Iqbal", role: "Independent Creator", quote: "As a one-person team, having a research and scheduling agent do the boring parts means I actually post consistently now." },
];

// The full autonomous chain: Research → Planning → Writing → Image → Hashtag
// → Review → Engagement → Scheduling. Every UI element that visualizes the
// pipeline (landing hero, workflow chain, Agent Monitor cards) loops over
// this array, so extending it here automatically extends those views too.
const AGENT_DEFS = [
  { id: "research", name: "Trend Research Agent", icon: "📡", desc: "Discovers trending topics, scores niche relevance, and recommends the strongest content opportunity." },
  { id: "planner", name: "Content Planning Agent", icon: "🧭", desc: "Builds a full 7-day content strategy, assigning a topic and angle to every day of the week." },
  { id: "writer", name: "Content Writer Agent", icon: "✍️", desc: "Drafts a LinkedIn post, Instagram caption, and X/Twitter post for every planned topic." },
  { id: "image", name: "Image Generation Agent", icon: "🖼️", desc: "Creates an image concept, AI image prompt, and visual style direction for every post." },
  { id: "hashtag", name: "Hashtag Agent", icon: "#️⃣", desc: "Selects 15+ trending, niche, and high-engagement hashtags per post." },
  { id: "review", name: "Quality Review Agent", icon: "✅", desc: "Scores grammar, clarity, readability, and tone before anything ships." },
  { id: "engagement", name: "Engagement Prediction Agent", icon: "📈", desc: "Predicts reach, engagement, virality, and CTR, with plain-language reasoning." },
  { id: "scheduler", name: "Scheduler Agent", icon: "📅", desc: "Recommends posting day and time, writes the scheduling rationale, and queues content on the calendar." },
];

// Seed data for dashboard stat cards
const DASH_STATS = [
  { label: "Total generated posts", value: 248, delta: "+18 this week", dir: "up" },
  { label: "Scheduled posts", value: 34, delta: "+6 this week", dir: "up" },
  { label: "Avg. engagement score", value: 79, delta: "+4 pts", dir: "up" },
  { label: "Active agents", value: 8, delta: "All operational", dir: "up" },
];

// Seed data for dashboard "agent activity" mini list — used as a fallback
// until a real pipeline/campaign run produces a live activity log.
const AGENT_ACTIVITY = [
  { title: "Content Writer Agent", sub: "Finished 3 LinkedIn posts", pill: "pill-cyan", pillText: "Done" },
  { title: "Trend Research Agent", sub: "Scanning niche: SaaS marketing", pill: "pill-purple", pillText: "Working" },
  { title: "Scheduler Agent", sub: "Queued 2 posts for tomorrow", pill: "pill-green", pillText: "Done" },
  { title: "Quality Review Agent", sub: "Flagged 1 tone mismatch", pill: "pill-amber", pillText: "Review" },
];

// Seed data for upcoming content list
const UPCOMING_CONTENT = [
  { title: "\"3 signs your content strategy needs agents\"", sub: "LinkedIn · Tomorrow, 10:30 AM", pill: "pill-cyan", pillText: "Scheduled" },
  { title: "\"Behind the scenes: our Q3 rebrand\"", sub: "Instagram · Thu, 6:00 PM", pill: "pill-cyan", pillText: "Scheduled" },
  { title: "\"Hot take on AI in marketing\"", sub: "X/Twitter · Draft", pill: "pill-purple", pillText: "Draft" },
];

// Seed drafts for the calendar page (day offsets are relative to "today" at render time)
const CALENDAR_SEED_DRAFTS = [
  { id: "d1", title: "3 signs your strategy needs agents", platform: "LinkedIn", status: "draft" },
  { id: "d2", title: "Behind the scenes: Q3 rebrand", platform: "Instagram", status: "draft" },
  { id: "d3", title: "Hot take on AI in marketing", platform: "X/Twitter", status: "draft" },
  { id: "d4", title: "Customer story: GreenCart", platform: "LinkedIn", status: "draft" },
];

// Pre-placed events on the calendar, dayOffset is relative to the 1st of the displayed month
const CALENDAR_SEED_EVENTS = [
  { day: 4, title: "Founder AMA recap", platform: "LinkedIn", status: "scheduled" },
  { day: 9, title: "Product teaser reel", platform: "Instagram", status: "scheduled" },
  { day: 14, title: "Weekly tips thread", platform: "X/Twitter", status: "upcoming" },
  { day: 18, title: "Customer spotlight", platform: "Instagram", status: "upcoming" },
  { day: 22, title: "Industry trend recap", platform: "LinkedIn", status: "scheduled" },
];
