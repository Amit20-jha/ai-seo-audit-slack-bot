const axios = require('axios');
const cheerio = require('cheerio');

async function scrape(url) {
  try {
    const startTime = Date.now();
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'SEOAuditBot/1.0 (Mozilla/5.0; AI SEO Audit Bot)'
      },
      timeout: 15000
    });
    const responseTimeMs = Date.now() - startTime;
    
    const html = response.data;
    const $ = cheerio.load(html);

    // ─── Basic Meta Tags ───
    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
    const robots = $('meta[name="robots"]').attr('content') || '';
    const canonical = $('link[rel="canonical"]').attr('href') || null;
    const viewport = $('meta[name="viewport"]').attr('content') || null;
    const charset = $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type"]').attr('content') || '';
    const language = $('html').attr('lang') || '';

    // ─── Open Graph Tags ───
    const ogTags = {};
    $('meta[property^="og:"]').each((_, el) => {
      const prop = $(el).attr('property');
      ogTags[prop] = $(el).attr('content') || '';
    });

    // ─── Twitter Card Tags ───
    const twitterTags = {};
    $('meta[name^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name');
      twitterTags[name] = $(el).attr('content') || '';
    });

    // ─── Heading Structure ───
    const headings = {};
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
      const tags = [];
      $(tag).each((_, el) => tags.push($(el).text().trim().substring(0, 120)));
      headings[tag] = { count: tags.length, samples: tags.slice(0, 5) };
    });

    // ─── Images Analysis ───
    const images = $('img');
    const totalImages = images.length;
    let imagesWithoutAlt = 0;
    let imagesWithEmptyAlt = 0;
    let imagesWithoutSrc = 0;
    const largeSrcImages = [];
    images.each((_, el) => {
      const alt = $(el).attr('alt');
      const src = $(el).attr('src') || '';
      if (alt === undefined) imagesWithoutAlt++;
      else if (alt.trim() === '') imagesWithEmptyAlt++;
      if (!src) imagesWithoutSrc++;
    });

    // ─── Links Analysis ───
    const baseUrl = new URL(url).origin;
    let internalLinks = 0;
    let externalLinks = 0;
    let nofollowLinks = 0;
    const externalDomains = new Set();
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const rel = $(el).attr('rel') || '';
      if (rel.includes('nofollow')) nofollowLinks++;
      if (href) {
        if (href.startsWith('http') && !href.startsWith(baseUrl)) {
          externalLinks++;
          try { externalDomains.add(new URL(href).hostname); } catch(e) {}
        } else if (href.startsWith('/') || href.startsWith(baseUrl) || !href.startsWith('http')) {
          if (!href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
            internalLinks++;
          }
        }
      }
    });

    // ─── Content Analysis ───
    const textContent = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = textContent.split(' ').filter(w => w.length > 0).length;
    const contentSample = textContent.substring(0, 1500); // First 1500 chars for AI analysis

    // ─── Technical SEO ───
    const structuredDataScripts = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).html());
        structuredDataScripts.push(parsed['@type'] || 'Unknown');
      } catch (e) {
        structuredDataScripts.push('Invalid JSON-LD');
      }
    });

    const hreflangTags = [];
    $('link[rel="alternate"][hreflang]').each((_, el) => {
      hreflangTags.push({ lang: $(el).attr('hreflang'), href: $(el).attr('href') });
    });

    const favicon = $('link[rel="icon"], link[rel="shortcut icon"]').attr('href') || null;
    const hasInlineStyles = $('[style]').length;
    const iframeCount = $('iframe').length;
    const scriptCount = $('script').length;
    const styleSheetCount = $('link[rel="stylesheet"]').length;

    // ─── Page Size ───
    const pageSizeBytes = Buffer.byteLength(html, 'utf8');
    const pageSizeKB = (pageSizeBytes / 1024).toFixed(2);

    return {
      url,
      responseTimeMs,
      isHttps: url.startsWith('https'),
      pageSizeKB: parseFloat(pageSizeKB),

      // Meta
      title,
      titleLength: title.length,
      metaDescription,
      metaDescriptionLength: metaDescription.length,
      metaKeywords,
      robots,
      canonical: !!canonical,
      canonicalUrl: canonical,
      viewport: !!viewport,
      viewportContent: viewport,
      charset,
      language,

      // Social
      openGraph: ogTags,
      hasOpenGraph: Object.keys(ogTags).length > 0,
      twitterCards: twitterTags,
      hasTwitterCards: Object.keys(twitterTags).length > 0,

      // Headings
      headings,

      // Images
      images: {
        total: totalImages,
        withoutAlt: imagesWithoutAlt,
        withEmptyAlt: imagesWithEmptyAlt,
        withoutSrc: imagesWithoutSrc,
      },

      // Links
      links: {
        internal: internalLinks,
        external: externalLinks,
        nofollow: nofollowLinks,
        uniqueExternalDomains: externalDomains.size,
      },

      // Content
      wordCount,
      contentSample,

      // Technical
      structuredData: structuredDataScripts.length > 0,
      structuredDataTypes: structuredDataScripts,
      hreflangTags,
      favicon: !!favicon,
      inlineStylesCount: hasInlineStyles,
      iframeCount,
      scriptCount,
      styleSheetCount,
    };
  } catch (error) {
    if (error.response) {
      throw new Error(`Failed to fetch URL (Status ${error.response.status}). Ensure the URL is accessible.`);
    }
    throw new Error(`Failed to fetch URL. ${error.message}`);
  }
}

module.exports = { scrape };

