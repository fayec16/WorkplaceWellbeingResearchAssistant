// Source 2: Oxford Wellbeing Research Centre publications feed.
// No public API, so this scrapes the public listing + detail pages. There's
// no per-page ToS-blocking like Google Scholar, but the HTML structure could
// change — if this source silently returns nothing, check the regexes below
// against a fresh `curl` of the listing page.

const LISTING_URL = "https://wellbeing.hmc.ox.ac.uk/publications/";
const USER_AGENT = "Mozilla/5.0 (compatible; WellbeingBriefingBot/1.0)";

const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

export async function fetchOxfordPapers(config) {
  const html = await fetchText(LISTING_URL);
  const cards = parseListing(html).slice(0, config.maxResults.oxfordWellbeing);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - config.daysBack);
  cutoff.setHours(0, 0, 0, 0);

  const recent = cards.filter((c) => c.date && c.date >= cutoff);

  const papers = [];
  for (const card of recent) {
    try {
      const detail = await fetchDetail(card.url);
      papers.push({
        source: "Oxford Wellbeing Research Centre",
        title: card.title,
        abstract: detail.abstract || "(no abstract available — see linked article)",
        venue: card.venue,
        year: String(card.date.getFullYear()),
        url: detail.externalUrl || card.url,
      });
    } catch (err) {
      console.error(`Failed to fetch Oxford detail page ${card.url}:`, err.message);
    }
  }
  return papers;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Oxford Wellbeing fetch failed: ${res.status} (${url})`);
  return res.text();
}

function parseListing(html) {
  const cards = [];
  // Each entry is <a href="..." class="card card--type-4 ... publications">...</a>
  // containing a card__metadata (date), card__heading (title), card__text (venue).
  const entryRe = /<a href="([^"]+)" class="card card--type-4[^"]*">([\s\S]*?)<\/a>/g;

  for (const m of html.matchAll(entryRe)) {
    const [, url, block] = m;
    const dateStr = cleanHtml(matchOne(block, /card__metadata">([\s\S]*?)<\/p>/));
    const title = cleanHtml(matchOne(block, /card__heading">([\s\S]*?)<\/p>/));
    const venue = cleanHtml(matchOne(block, /card__text">([\s\S]*?)<\/p>/));
    const date = parseOxfordDate(dateStr);

    if (url && title) {
      cards.push({ url, title, venue: venue || "Wellbeing Research Centre", date });
    }
  }
  return cards;
}

async function fetchDetail(url) {
  const html = await fetchText(url);
  const authors = cleanHtml(matchOne(html, /hero__standfirst authors">\s*Authors:\s*([\s\S]*?)<\/p>/));
  const abstractBlock = matchOne(html, /<strong>Abstract<\/strong><\/h6>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/);
  const abstract = cleanHtml(abstractBlock);
  const externalUrl = matchOne(html, /href="([^"]+)"\s+class="btn btn-link"/);

  return {
    abstract: authors ? `Authors: ${authors}. ${abstract}` : abstract,
    externalUrl,
  };
}

function parseOxfordDate(str) {
  if (!str) return null;
  const m = str.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (month === undefined) return null;
  return new Date(Number(m[3]), month, Number(m[1]));
}

function matchOne(str, regex) {
  const m = str.match(regex);
  return m ? m[1] : null;
}

function cleanHtml(str) {
  if (!str) return "";
  return str
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
