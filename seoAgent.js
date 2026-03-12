const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generateReport(scrapedData) {
  const prompt = `
You are an expert SEO Analyst. Please review the following scraped SEO data for a website and generate a comprehensive SEO Audit Report.

Website Data:
${JSON.stringify(scrapedData, null, 2)}

The report MUST include the following sections exactly as requested:
- SEO AUDIT REPORT
- Overall SEO Score (0–100) (Calculate this based on the data provided)
- On-Page SEO Analysis
- Off-Page SEO Analysis (Make assumptions based on external links and missing data context)
- Issues Found (Categorize as Critical / Warning / Minor)
- Role-Based Action Plan (Specific tasks for Developer, Content Team, Marketing Team, and Business Owner)

Format the report using Markdown for readability in Slack and PDF but avoid using excessive nested formatting. Keep the tone professional, actionable, and clear. Do not wrap the entire response in a code block.
`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      system: "You are an expert technical SEO analyst that provides concrete actionable feedback based on website data.",
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    return response.content[0].text;
  } catch (error) {
    console.error("Error calling Anthropic AI API:", error);
    throw new Error("Failed to generate AI SEO report due to API error.");
  }
}

module.exports = { generateReport };
