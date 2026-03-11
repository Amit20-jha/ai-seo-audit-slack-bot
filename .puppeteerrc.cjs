const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer so it's preserved in Render's build cache
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
