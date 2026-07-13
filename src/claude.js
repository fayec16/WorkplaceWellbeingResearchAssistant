// Sends all candidate papers to Claude in one batched call to:
//  - filter for genuine relevance to workplace burnout/wellbeing
//  - summarize each relevant paper in plain language
//  - generate one concrete daily/weekly action item per paper

export async function analyzeWithClaude(papers, config) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY environment variable.");
  if (papers.length === 0) return [];

  const paperList = papers
    .map(
      (p, i) =>
        `[${i}] Source: ${p.source}\nTitle: ${p.title}\nVenue: ${p.venue} (${p.year})\nAbstract: ${p.abstract}`
    )
    .join("\n\n---\n\n");

  const prompt = `You are helping build a daily research briefing for a knowledge worker interested in burnout, workplace wellbeing, and organizational psychology.

Below are candidate papers/articles pulled from PubMed, the Oxford Wellbeing Research Centre, and (optionally) Google Scholar in the last ${config.daysBack} days. Some may be irrelevant (wrong topic, animal studies, unrelated clinical burnout like caregiver burnout in medicine unless clearly workplace-relevant, general happiness-economics pieces with no work angle, etc).

For each paper, decide if it's genuinely relevant to WORKPLACE burnout / employee wellbeing / occupational mental health. Only include papers that are truly relevant.

For each relevant paper, provide:
- A 2-3 sentence plain-language summary of the finding
- One concrete, specific action item a knowledge worker could try today or this week based on the finding

Respond ONLY with valid JSON, no markdown fences, no preamble, in this exact shape:
{
  "relevant_papers": [
    {
      "index": <number matching the [i] above>,
      "summary": "...",
      "action_item": "..."
    }
  ]
}

If NONE of the papers are relevant, return {"relevant_papers": []}.

Papers:

${paperList}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.claudeModel,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.content.map((b) => (b.type === "text" ? b.text : "")).join("");

  let parsed;
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse Claude response as JSON:\n", text);
    return [];
  }

  return (parsed.relevant_papers || []).map((rp) => ({
    ...papers[rp.index],
    summary: rp.summary,
    action_item: rp.action_item,
  }));
}
