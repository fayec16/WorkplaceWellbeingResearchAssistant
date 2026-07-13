// Source 3: Google Scholar — BEST EFFORT ONLY.
//
// Google Scholar has no official API and directly scraping it violates its
// ToS and gets blocked almost immediately from shared IPs like GitHub Actions
// runners. This uses SerpApi (https://serpapi.com), a third-party service
// that provides Google Scholar results legitimately, as an *optional* source.
//
// Scholar also has no day-level date filter (only year-level), so this can't
// be restricted to "papers from the last N days" the way PubMed can — it's a
// supplementary "recent-ish, sorted by date" scan. Claude still gets the
// final say on relevance during analysis.
//
// If SERPAPI_API_KEY isn't set, this source is skipped entirely.

export async function fetchGoogleScholarPapers(config) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    console.log("Skipping Google Scholar (no SERPAPI_API_KEY set).");
    return [];
  }

  const query = config.keywords.slice(0, 3).join(" OR ");
  const year = new Date().getFullYear();
  const url =
    "https://serpapi.com/search.json" +
    `?engine=google_scholar&q=${encodeURIComponent(query)}` +
    `&as_ylo=${year}&scisbd=1&num=${config.maxResults.googleScholar}&api_key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`SerpApi Google Scholar request failed: ${res.status}`);
    return [];
  }
  const data = await res.json();
  const results = data.organic_results || [];

  return results.map((r) => ({
    source: "Google Scholar",
    title: r.title,
    abstract: r.snippet || "(no snippet available)",
    venue: r.publication_info?.summary || "Unknown venue",
    year: String(year),
    url: r.link,
  }));
}
