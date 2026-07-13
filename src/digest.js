export function formatDigest(results, config) {
  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (results.length === 0) {
    return `# Wellbeing Research Briefing — ${dateStr}\n\nNo new relevant papers found in the last ${config.daysBack} days.\n`;
  }

  let md = `# Wellbeing Research Briefing — ${dateStr}\n\n${results.length} relevant paper(s) found.\n\n`;

  results.forEach((r, i) => {
    md += `## ${i + 1}. ${r.title}\n`;
    md += `*${r.venue}${r.year ? `, ${r.year}` : ""}* — via ${r.source} — [Link](${r.url})\n\n`;
    md += `**Summary:** ${r.summary}\n\n`;
    md += `**Try this today:** ${r.action_item}\n\n---\n\n`;
  });

  return md;
}
