const puppeteer = require('puppeteer');
const marked = require('marked');
const path = require('path');
const fs = require('fs');

async function generatePDF(url, reportText) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] // Required args for cloud environments like Render/Railway
  });

  try {
    const page = await browser.newPage();
    
    // Parse Markdown to HTML
    const contentHtml = await marked.parse(reportText);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>SEO Audit Report</title>
        <style>
          body { 
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
            color: #333; 
            line-height: 1.6; 
            padding: 40px; 
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #0056b3; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
          }
          .header h1 { color: #0056b3; margin: 0; }
          .header p { color: #666; font-size: 14px; }
          .content h1, .content h2, .content h3 { color: #2c3e50; border-bottom: 1px solid #eaeaea; padding-bottom: 5px; }
          .content h1 { font-size: 24px; }
          .content h2 { font-size: 20px; margin-top: 25px; }
          .content h3 { font-size: 18px; margin-top: 20px; }
          .content ul { margin-left: -20px; }
          .content li { margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SEO Audit Report</h1>
          <p>Target URL: <a href="${url}">${url}</a></p>
          <p>Date Generated: ${new Date().toLocaleString()}</p>
        </div>
        <div class="content">
          ${contentHtml}
        </div>
      </body>
      </html>
    `;

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Generate an absolute path in the current directory
    const tempFileName = `seo_report_${Date.now()}.pdf`;
    const tmpPath = path.resolve(__dirname, tempFileName);
    
    await page.pdf({
      path: tmpPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    return tmpPath;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { generatePDF };
