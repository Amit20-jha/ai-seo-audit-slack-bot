require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
const scraper = require('./scraper');
const seoAgent = require('./seoAgent');
const pdfGenerator = require('./pdfGenerator');
const fs = require('fs');

// ─── Validate required environment variables at startup ───
const requiredEnvVars = ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'ANTHROPIC_API_KEY'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`❌ FATAL: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('   Please set them in Render Dashboard → Environment tab.');
  process.exit(1);
}
console.log('✅ All required environment variables are set.');
console.log(`   SIGNING_SECRET length: ${process.env.SLACK_SIGNING_SECRET.length}`);
console.log(`   BOT_TOKEN starts with: ${process.env.SLACK_BOT_TOKEN.substring(0, 5)}...`);

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: '/slack/events',
  processBeforeResponse: true,
});

// ─── CRITICAL: Use receiver.app (not receiver.router) to log ALL requests ───
// This runs BEFORE Bolt's signature verification so we can see everything
receiver.app.use((req, res, next) => {
  console.log(`🌐 [${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// ─── Health check ───
receiver.app.get('/', (req, res) => {
  res.send('AI SEO Audit Slack Bot is running!');
});

// ─── Debug endpoint ───
receiver.app.get('/debug', (req, res) => {
  const status = {
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN ? `✅ Set (${process.env.SLACK_BOT_TOKEN.length} chars)` : '❌ MISSING',
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET ? `✅ Set (${process.env.SLACK_SIGNING_SECRET.length} chars)` : '❌ MISSING',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? `✅ Set (${process.env.ANTHROPIC_API_KEY.length} chars)` : '❌ MISSING',
    PORT: process.env.PORT || '3000 (default)',
    NODE_ENV: process.env.NODE_ENV || 'not set',
    slackEndpoint: '/slack/events',
    uptime: `${Math.floor(process.uptime())} seconds`,
  };
  res.json(status);
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

// ─── Global Bolt error handler ───
app.error(async (error) => {
  console.error('⚠️ Bolt global error:', error);
});

// Acknowledge the slash command and start the workflow
app.command('/seo-audit', async ({ command, ack, respond, client }) => {
  console.log('📥 Received /seo-audit command from user:', command.user_id);

  // Acknowledge within 3 seconds — this MUST happen first
  await ack();
  console.log('✅ Command acknowledged');

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
    try {
      await client.chat.postMessage({
        channel: command.channel_id,
        text: `<@${userId}> An error occurred while auditing \`${url}\`: ${error.message}`
      });
    } catch (postErr) {
      console.error("Failed to post error message to Slack:", postErr);
    }
  });
});

async function processAudit(url, channelId, userId, client) {
  let pdfPath = null;
  try {
    // 1. Scrape data
    console.log(`[1/5] Scraping ${url}...`);
    await client.chat.postMessage({ channel: channelId, text: `Scraping data from ${url}...` });
    const scrapedData = await scraper.scrape(url);

    // 2. Generate report using Claude
    console.log('[2/5] Generating AI report...');
    await client.chat.postMessage({ channel: channelId, text: `Data scraped. Generating AI SEO Report...` });
    const reportText = await seoAgent.generateReport(scrapedData);

    // 3. Post chunked report to Slack
    console.log('[3/5] Posting report to Slack...');
    const chunks = chunkText(`*SEO Audit Report for ${url}*\n\n` + reportText, 3000);
    for (const chunk of chunks) {
      await client.chat.postMessage({
        channel: channelId,
        text: chunk
      });
    }

    // 4. Generate PDF
    console.log('[4/5] Generating PDF...');
    await client.chat.postMessage({ channel: channelId, text: `Generating PDF download...` });
    pdfPath = await pdfGenerator.generatePDF(url, reportText);

    // 5. Upload PDF file
    console.log('[5/5] Uploading PDF...');
    await client.files.uploadV2({
      channel_id: channelId,
      initial_comment: `<@${userId}> Here is your downloadable SEO Audit Report for ${url}`,
      file: fs.createReadStream(pdfPath),
      filename: `SEO_Audit_Report_${new URL(url).hostname}.pdf`
    });

    console.log('✅ Audit completed successfully for', url);

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

(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`🤖 AI SEO Audit Slack Bot is running on port ${port}!`);
  console.log(`   Slack endpoint: POST /slack/events`);
  console.log(`   Health check:   GET  /`);
  console.log(`   Debug info:     GET  /debug`);
})();

