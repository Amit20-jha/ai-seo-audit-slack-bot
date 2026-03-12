const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generateReport(scrapedData) {
  const prompt = `
You are a world-class SEO Analyst performing a comprehensive audit. Analyze the following scraped website data and generate an in-depth, professional SEO Audit Report.

Website Data:
${JSON.stringify(scrapedData, null, 2)}

Generate a COMPREHENSIVE and DETAILED report with ALL of the following sections. Each section should contain thorough analysis, specific observations from the data, and actionable recommendations. DO NOT be brief — give thorough, expert-level analysis for each point.

## Required Sections:

### 1. 📊 EXECUTIVE SUMMARY
- Brief overview of the website's SEO health
- Top 3 strengths and top 3 weaknesses
- Overall SEO Score out of 100 (calculate this rigorously based on ALL the data points)

### 2. 🔍 ON-PAGE SEO ANALYSIS
- **Title Tag**: Analyze the title — length, keyword optimization, best practices. Current title length is ${scrapedData.titleLength} characters.
- **Meta Description**: Analyze the description — length, CTA presence, keyword usage. Current length is ${scrapedData.metaDescriptionLength} characters.
- **Heading Structure (H1-H6)**: Analyze the heading hierarchy, proper usage, keyword presence in headings.
- **Content Quality**: Analyze word count (${scrapedData.wordCount} words), content depth, readability estimate based on the content sample.
- **Image Optimization**: Analyze alt text coverage, missing alt tags, image SEO best practices.
- **Internal Linking**: Analyze the internal link structure and recommendations.
- **URL Structure**: Analyze the URL for SEO friendliness.

### 3. 🌐 TECHNICAL SEO ANALYSIS
- **Page Speed Indicators**: Response time (${scrapedData.responseTimeMs}ms), page size (${scrapedData.pageSizeKB}KB), script count, stylesheet count.
- **Mobile Friendliness**: Viewport meta tag analysis.
- **HTTPS Security**: SSL/HTTPS status.
- **Canonical Tags**: Proper implementation check.
- **Structured Data (Schema Markup)**: JSON-LD analysis and recommendations.
- **Robots Meta Tag**: Analysis of crawl directives.
- **Internationalization (hreflang)**: Multi-language support analysis.
- **Inline Styles**: Count and impact on performance.
- **Iframes**: Impact on SEO.

### 4. 📱 SOCIAL MEDIA SEO
- **Open Graph Tags**: Present/missing, completeness analysis.
- **Twitter Card Tags**: Present/missing, completeness analysis.
- Recommendations for social sharing optimization.

### 5. 🔗 OFF-PAGE SEO INDICATORS
- External links analysis (${scrapedData.links?.external || 0} external links to ${scrapedData.links?.uniqueExternalDomains || 0} unique domains).
- Nofollow links analysis.
- Recommendations for backlink strategy.

### 6. 🚨 ISSUES FOUND
Categorize ALL issues into three priority levels:
- **🔴 Critical Issues**: Must fix immediately (blocking SEO performance)
- **🟡 Warning Issues**: Should fix soon (impacting rankings)
- **🟢 Minor Issues**: Nice to fix (optimization opportunities)
For each issue, explain WHY it matters and HOW to fix it.

### 7. ✅ WHAT'S WORKING WELL
List everything that is properly implemented and following SEO best practices.

### 8. 📋 DETAILED ACTION PLAN
Provide a prioritized action plan with specific tasks organized by role:
- **For Developers**: Technical fixes, schema markup, performance optimization
- **For Content Team**: Content improvements, keyword optimization, meta tag updates
- **For Marketing Team**: Social media, link building, off-page strategy
- **For Business Owner**: Strategic priorities, ROI impact, timeline recommendations

### 9. 📈 COMPETITIVE EDGE RECOMMENDATIONS
Suggest advanced SEO strategies that could give this website a competitive advantage:
- Content gap opportunities
- Featured snippet optimization
- Core Web Vitals improvements
- E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) recommendations

### 10. 🏁 CONCLUSION
- Summary of the most impactful changes
- Expected impact if recommendations are implemented
- Suggested timeline for implementation (Quick Wins vs Long-term)

Format the report using Markdown for readability. Use tables where applicable. Use bold and italic for emphasis. Keep the tone professional, data-driven, and actionable. Do not wrap the entire response in a code block.
`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: "You are a world-class technical SEO analyst with 15+ years of experience. You provide extremely thorough, data-driven audits with specific, actionable recommendations. Your reports are known for their depth, clarity, and professional quality. Never be vague — always reference specific data points from the scraped data and give concrete recommendations with examples.",
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

