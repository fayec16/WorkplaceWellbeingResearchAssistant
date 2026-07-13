import fs from "fs";
import { CONFIG } from "./config.js";
import { fetchPubmedPapers } from "./sources/pubmed.js";
import { fetchOxfordPapers } from "./sources/oxfordWellbeing.js";
import { fetchGoogleScholarPapers } from "./sources/googleScholar.js";
import { analyzeWithClaude } from "./claude.js";
import { formatDigest } from "./digest.js";
import { sendEmail } from "./email.js";

async function main() {
  console.log(`Searching sources for papers from the last ${CONFIG.daysBack} day(s)...`);

  const [pubmed, oxford, scholar] = await Promise.all([
    fetchPubmedPapers(CONFIG).catch((err) => {
      console.error("PubMed source failed:", err.message);
      return [];
    }),
    fetchOxfordPapers(CONFIG).catch((err) => {
      console.error("Oxford Wellbeing source failed:", err.message);
      return [];
    }),
    fetchGoogleScholarPapers(CONFIG).catch((err) => {
      console.error("Google Scholar source failed:", err.message);
      return [];
    }),
  ]);

  console.log(`PubMed: ${pubmed.length}, Oxford Wellbeing: ${oxford.length}, Google Scholar: ${scholar.length}`);

  const papers = dedupe([...pubmed, ...oxford, ...scholar]);
  console.log(`${papers.length} candidate paper(s) after dedupe.`);

  console.log("Analyzing with Claude...");
  const results = await analyzeWithClaude(papers, CONFIG);

  const digest = formatDigest(results, CONFIG);
  console.log("\n" + digest);

  fs.mkdirSync("briefings", { recursive: true });
  const filename = `briefings/${new Date().toISOString().slice(0, 10)}.md`;
  fs.writeFileSync(filename, digest);
  console.log(`Saved to ${filename}`);

  await sendEmail(digest);
}

function dedupe(papers) {
  const seen = new Set();
  return papers.filter((p) => {
    const key = p.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

main().catch((err) => {
  console.error("Agent failed:", err);
  process.exit(1);
});
