// Central config for the briefing agent. Env vars let you override defaults
// without editing code (handy for GitHub Actions repo variables).

export const CONFIG = {
  // How many days back to search. 2 = "two-day delay" to avoid missing papers
  // due to indexing lag (PubMed/journal sites are sometimes a day or two behind).
  daysBack: Number(process.env.DAYS_BACK || 2),

  // Search terms, combined with OR, used against PubMed's Title/Abstract fields.
  keywords: [
    "burnout",
    "workplace wellbeing",
    "occupational wellbeing",
    "employee wellbeing",
    "work-related stress",
    "job satisfaction wellbeing",
  ],

  // Caps on raw hits per source before Claude filtering (keeps API costs sane).
  maxResults: {
    pubmed: 40,
    oxfordWellbeing: 12, // one listing page; site is sorted newest-first
    googleScholar: 10,
  },

  claudeModel: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
};
