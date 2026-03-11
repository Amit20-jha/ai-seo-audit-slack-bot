const axios = require('axios');
const cheerio = require('cheerio');

async function scrape(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'SEOAuditBot/1.0 (Mozilla/5.0; AI SEO Audit Bot)'
      },
      timeout: 15000
    });
    
    const html = response.data;
    const $ = cheerio.load(html);

    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
    
    const h1Tags = [];
    $('h1').each((_, el) => h1Tags.push($(el).text().trim().substring(0, 100)));
    const h2Tags = [];
    $('h2').each((_, el) => h2Tags.push($(el).text().trim().substring(0, 100)));
    
    const images = $('img');
    const totalImages = images.length;
    let imagesWithoutAlt = 0;
    images.each((_, el) => {
      const alt = $(el).attr('alt');
      if (!alt || alt.trim() === '') {
        imagesWithoutAlt++;
      }
    });

    const baseUrl = new URL(url).origin;
    let internalLinks = 0;
    let externalLinks = 0;
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        if (href.startsWith('http') && !href.startsWith(baseUrl)) {
          externalLinks++;
        } else if (href.startsWith('/') || href.startsWith(baseUrl) || !href.startsWith('http')) {
          if (!href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
            internalLinks++;
          }
        }
      }
    });

    const textContent = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = textContent.split(' ').length;

    const canonical = $('link[rel="canonical"]').attr('href') || null;
    const structuredData = $('script[type="application/ld+json"]').length > 0;
    const viewport = $('meta[name="viewport"]').attr('content') || null;

    const pageSizeBytes = Buffer.byteLength(html, 'utf8');
    const pageSizeKB = (pageSizeBytes / 1024).toFixed(2);

    return {
      url,
      title,
      metaDescription,
      metaKeywords,
      h1Count: h1Tags.length,
      h1Tags: h1Tags.slice(0, 5), // limited slice for context
      h2Count: h2Tags.length,
      images: {
        total: totalImages,
        withoutAlt: imagesWithoutAlt
      },
      links: {
        internal: internalLinks,
        external: externalLinks
      },
      wordCount,
      canonical: !!canonical,
      canonicalUrl: canonical,
      structuredData: !!structuredData,
      viewport: !!viewport,
      pageSizeKB: parseFloat(pageSizeKB)
    };
  } catch (error) {
    if (error.response) {
      throw new Error(`Failed to fetch URL (Status ${error.response.status}). Ensure the URL is accessible.`);
    }
    throw new Error(`Failed to fetch URL. ${error.message}`);
  }
}

module.exports = { scrape };
