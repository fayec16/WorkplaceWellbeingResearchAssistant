# Workplace Wellbeing Research Briefing

A small agent that runs daily, finds newly published peer-reviewed
papers/articles about burnout and workplace wellbeing, and produces a
Markdown digest with a plain-language summary and one concrete action item
per paper — saved to `briefings/` and (optionally) emailed to you.

## How it works

1. **Search** three sources for recent items:
   - **PubMed** (official [E-utilities](https://www.ncbi.nlm.nih.gov/books/NBK25501/) API, free, no key) — the primary, most reliable source. Supports precise date filtering.
   - **Oxford Wellbeing Research Centre** publications feed (scraped — no public API exists). Sorted newest-first, so recent items are easy to isolate.
   - **Google Scholar** — *optional, best-effort*. See [limitations](#google-scholar-limitations) below.
2. **Fetch** abstracts/details for each candidate.
3. **Analyze with Claude** in one batched call: filters out irrelevant papers (e.g. clinical/caregiver burnout, unrelated happiness-economics pieces), writes a 2–3 sentence summary, and generates one concrete action item per relevant paper.
4. **Output** a Markdown digest to `briefings/YYYY-MM-DD.md`, and email it if email env vars are set.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your keys
```

Required:
- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)

Optional (email delivery):
- `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `EMAIL_TO` — for Gmail, create an [app password](https://myaccount.google.com/apppasswords) (requires 2-Step Verification). Any SMTP-based nodemailer service works too; edit `src/email.js` if you're not using Gmail.

Optional (Google Scholar):
- `SERPAPI_API_KEY` — from [serpapi.com](https://serpapi.com). If unset, this source is silently skipped.

### Run locally

```bash
set -a; source .env; set +a
npm start
```

This writes `briefings/<today>.md` and prints it to the console.

## Running it daily via GitHub Actions

1. Push this repo to GitHub.
2. Go to **Settings → Secrets and variables → Actions** and add repo secrets:
   - `ANTHROPIC_API_KEY` (required)
   - `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `EMAIL_TO` (optional, for email)
   - `SERPAPI_API_KEY` (optional, for Google Scholar)
3. (Optional) Add a repo **variable** `DAYS_BACK` to change the default 2-day lookback window.
4. The workflow in [`.github/workflows/daily-briefing.yml`](.github/workflows/daily-briefing.yml) runs daily at 07:00 UTC, commits the new `briefings/*.md` file back to the repo, and emails the digest if configured. You can also trigger it manually from the Actions tab (`workflow_dispatch`).

Make sure **Settings → Actions → General → Workflow permissions** is set to "Read and write permissions" so the workflow can push the commit.

## Configuration

Edit [`src/config.js`](src/config.js) to change:
- `daysBack` (or set `DAYS_BACK` env var) — lookback window, default 2 days
- `keywords` — PubMed search terms
- `maxResults` — cap on raw hits per source before Claude filtering (cost control)

## Google Scholar limitations

Google Scholar has no official API, and direct scraping violates its Terms
of Service and gets blocked quickly from shared IPs (like GitHub Actions
runners). This project instead uses [SerpApi](https://serpapi.com), a paid
third-party service, as an opt-in source — set `SERPAPI_API_KEY` to enable
it, or leave it unset to skip it entirely.

Even via SerpApi, Scholar only supports **year-level** date filtering, not
day-level like PubMed. So this source is best-effort: it pulls recent
results sorted by date and lets the Claude analysis step decide what's
actually relevant, rather than guaranteeing "last N days" precision.

## Notes on the Oxford scraper

`src/sources/oxfordWellbeing.js` parses the public HTML of
[wellbeing.hmc.ox.ac.uk/publications](https://wellbeing.hmc.ox.ac.uk/publications/)
since there's no API. If this source starts returning nothing, the site's
markup structure likely changed — `curl` the listing page and compare
against the regexes in that file.
