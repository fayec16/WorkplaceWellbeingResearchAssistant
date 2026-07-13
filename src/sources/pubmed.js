// Source 1: PubMed (NCBI E-utilities). Official free API, no key required.

export async function fetchPubmedPapers(config) {
  const pmids = await searchPubmed(config);
  if (pmids.length === 0) return [];
  return fetchAbstracts(pmids);
}

async function searchPubmed(config) {
  const dateFilter = `("last ${config.daysBack} days"[dp])`;
  const keywordFilter =
    "(" + config.keywords.map((k) => `"${k}"[Title/Abstract]`).join(" OR ") + ")";
  const term = `${keywordFilter} AND ${dateFilter}`;

  const url =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi" +
    `?db=pubmed&retmode=json&retmax=${config.maxResults.pubmed}&term=${encodeURIComponent(term)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`PubMed esearch failed: ${res.status}`);
  const data = await res.json();
  return data.esearchresult.idlist || [];
}

async function fetchAbstracts(pmids) {
  const url =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi" +
    `?db=pubmed&rettype=abstract&retmode=xml&id=${pmids.join(",")}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`PubMed efetch failed: ${res.status}`);
  const xml = await res.text();
  return parsePubmedXml(xml);
}

// Minimal XML parsing without external deps — pulls out the fields we need.
function parsePubmedXml(xml) {
  const articles = [];
  const articleBlocks = xml.split("<PubmedArticle>").slice(1);

  for (const block of articleBlocks) {
    const pmid = matchOne(block, /<PMID[^>]*>(\d+)<\/PMID>/);
    const title = cleanXmlText(matchOne(block, /<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/));
    const abstractParts = [...block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map(
      (m) => cleanXmlText(m[1])
    );
    const journal = cleanXmlText(matchOne(block, /<Title>([\s\S]*?)<\/Title>/));
    const year = matchOne(block, /<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);

    if (pmid && title) {
      articles.push({
        source: "PubMed",
        title,
        abstract: abstractParts.join(" ") || "(no abstract available)",
        venue: journal || "Unknown journal",
        year: year || "",
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      });
    }
  }
  return articles;
}

function matchOne(str, regex) {
  const m = str.match(regex);
  return m ? m[1] : null;
}

function cleanXmlText(str) {
  if (!str) return "";
  return str
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x[0-9a-f]+;/gi, "")
    .trim();
}
