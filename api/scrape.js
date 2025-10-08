const puppeteer = require('puppeteer-core');
const chrome = require('@sparticuz/chromium');

// This function will be executed in the browser's context to perform the scraping
const scrapeInBrowser = async () => {
    const followerLinks = new Set();
    let lastHeight = 0;
    let loops = 0;

    return new Promise((resolve) => {
        const interval = setInterval(() => {
            const scrollableElement = document.documentElement; // Or a more specific scrollable div
            const currentHeight = scrollableElement.scrollHeight;

            // Scrape links currently on the page
            const linkElements = document.querySelectorAll('a.sc-1l2s06c-1');
            linkElements.forEach(el => {
                if (el.href) {
                    followerLinks.add(el.href);
                }
            });

            // If we haven't scrolled, or we've tried a few times without change, stop.
            if (currentHeight === lastHeight && loops > 3) {
                clearInterval(interval);
                resolve(Array.from(followerLinks));
            } else {
                 if (currentHeight === lastHeight) {
                    loops++;
                 } else {
                    loops = 0; // Reset loop counter if we see new content
                 }
                lastHeight = currentHeight;
                window.scrollTo(0, currentHeight);
            }
        }, 1000); // Scroll every 1 second
    });
};

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
    await page.setViewport({ width: 1280, height: 800 });

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    const networkUrl = url.endsWith('/network') ? url : `${url.split('?')[0]}/network`;
    await page.goto(networkUrl, { waitUntil: 'domcontentloaded' });
    
    // Wait for the initial set of followers to load
    await page.waitForSelector('a.sc-1l2s06c-1', { timeout: 15000 });

    // Execute the advanced scrolling and scraping logic
    const allFollowers = await page.evaluate(scrapeInBrowser);

    return response.status(200).json({ followers: allFollowers });

  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Failed to scrape the page. The profile might be private or Zomato changed their layout.', details: error.message });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}

