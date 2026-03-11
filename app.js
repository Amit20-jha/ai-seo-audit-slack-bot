require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
const scraper = require('./scraper');
const seoAgent = require('./seoAgent');
const pdfGenerator = require('./pdfGenerator');
const fs = require('fs');

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: '/slack/events', // Using /slack/events precisely as requested
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

// Acknowledge the slash command and start the workflow
app.command('/seo-audit', async ({ command, ack, respond, client }) => {
  // Acknowledge within 3 seconds
  await ack();

  const url = command.text.trim();
  const userId = command.user_id;

  // Basic URL Validation
  const urlRegex = /^(https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
  if (!urlRegex.test(url)) {
    await respond(`Invalid URL provided: \`${url}\`. Please provide a valid URL like \`https://example.com\`.`);
    return;
  }

  // Initial Progress Message
  await respond('SEO Audit Started... 🕵️‍♂️ Analyzing website structure and gathering data (this may take a minute).');

  // Fire and forget the heavy process to avoid Slack timeout
  processAudit(url, command.channel_id, userId, client).catch(async (error) => {
    console.error("Audit error:", error);
    await client.chat.postMessage({
      channel: command.channel_id,
      text: `<@${userId}> An error occurred while auditing \`${url}\`: ${error.message}`
    });
  });
});

async function processAudit(url, channelId, userId, client) {
  let pdfPath = null;
  try {
    // 1. Scrape data
    await client.chat.postMessage({ channel: channelId, text: `Scraping data from ${url}...` });
    const scrapedData = await scraper.scrape(url);

    // 2. Generate report using Claude
    await client.chat.postMessage({ channel: channelId, text: `Data scraped. Generating AI SEO Report...` });
    const reportText = await seoAgent.generateReport(scrapedData);

    // 3. Post chunked report to Slack
    const chunks = chunkText(`*SEO Audit Report for ${url}*\n\n` + reportText, 3000);
    for (const chunk of chunks) {
      await client.chat.postMessage({
        channel: channelId,
        text: chunk
      });
    }

    // 4. Generate PDF
    await client.chat.postMessage({ channel: channelId, text: `Generating PDF download...` });
    pdfPath = await pdfGenerator.generatePDF(url, reportText);

    // 5. Upload PDF file
    await client.files.uploadV2({
      channel_id: channelId,
      initial_comment: `<@${userId}> Here is your downloadable SEO Audit Report for ${url}`,
      file: fs.createReadStream(pdfPath),
      filename: `SEO_Audit_Report_${new URL(url).hostname}.pdf`
    });

  } catch (err) {
    console.error("Audit processing error:", err);
    throw err;
  } finally {
    // Temporary file cleanup
    if (pdfPath && fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
      console.log(`Cleaned up temp file: ${pdfPath}`);
    }
  }
}

// Split text to fit Slack message length limits safely
function chunkText(text, length = 3000) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + length));
    i += length;
  }
  return chunks;
}

// Minimal health check root route for Render / Railway
receiver.router.get('/', (req, res) => {
  res.send('AI SEO Audit Slack Bot is running!');
});

(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`🤖 AI SEO Audit Slack Bot is running on port ${port}!`);
})();
