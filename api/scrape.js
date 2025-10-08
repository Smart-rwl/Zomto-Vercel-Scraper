const puppeteer = require('puppeteer-core');
const chrome = require('@sparticuz/chromium');

export default async function handler(request, response) {
  const { url } = request.query;

  if (!url) {
    return response.status(400).json({ error: 'URL is required' });
  }

  let browser = null;
  
  try {
    browser = await puppeteer.launch({
      args: chrome.args,
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath(),
      headless: chrome.headless,
      ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();

    // --- OPTIMIZATION START ---
    // Intercept network requests
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      // Block requests for images, fonts, and stylesheets to speed up loading
      if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });
    // --- OPTIMIZATION END ---
    
    const networkUrl = url.endsWith('/network') ? url : `${url.split('?')[0]}/network`;
    // Use 'domcontentloaded' which is faster than 'networkidle2'
    await page.goto(networkUrl, { waitUntil: 'domcontentloaded' });

    // Wait for the specific element we need to appear on the page.
    // This is more reliable than waiting for the whole network to be idle.
    await page.waitForSelector('a.sc-1l2s06c-1', { timeout: 10000 }); // Wait up to 10 seconds

    const followerLinks = await page.evaluate(() => {
        const links = new Set();
        const linkElements = document.querySelectorAll('a.sc-1l2s06c-1'); 
        linkElements.forEach(el => {
            if (el.href) {
                links.add(el.href);
            }
        });
        return Array.from(links); 
    });

    return response.status(200).json({ followers: followerLinks });

  } catch (error) {
    console.error(error);
    // Send a proper JSON error back to the frontend
    return response.status(500).json({ error: 'Failed to scrape the page.', details: error.message });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
