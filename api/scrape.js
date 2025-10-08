const puppeteer = require('puppeteer-core');
const chrome = require('@sparticuz/chromium');

// This line is for Vercel's Pro plan. It allows the function to run longer.
// On the free Hobby plan, the limit is still around 10-15 seconds.
export const maxDuration = 60; 

// This function will be executed in the browser's context to perform the scraping
const scrapeInBrowser = async () => {
    const followerLinks = new Set();
    let lastHeight = 0;
    let loops = 0;
    const maxLoopsWithoutChange = 5; // Stop after 5 loops with no new content

    return new Promise((resolve) => {
        const interval = setInterval(() => {
            const scrollableElement = document.documentElement;
            const currentHeight = scrollableElement.scrollHeight;

            // --- IMPROVED SELECTOR ---
            // Instead of a fragile class name, we look for any link containing '/users/'
            // This is much more reliable.
            const linkElements = document.querySelectorAll('a[href*="/users/"]');
            linkElements.forEach(el => {
                if (el.href) {
                    // We clean the URL to remove any tracking parameters
                    const cleanUrl = el.href.split('?')[0];
                    followerLinks.add(cleanUrl);
                }
            });

            // If we've stopped finding new content, end the process.
            if (currentHeight === lastHeight && loops > maxLoopsWithoutChange) {
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
        }, 750); // Scroll every 0.75 seconds (slightly faster)
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
    
    // Wait for the initial set of followers to load using the new, reliable selector
    await page.waitForSelector('a[href*="/users/"]', { timeout: 15000 });

    // Execute the advanced scrolling and scraping logic
    const allFollowers = await page.evaluate(scrapeInBrowser);
    
    // Filter out the original profile URL from the results, if present
    const originalProfileUrl = url.split('?')[0];
    const filteredFollowers = allFollowers.filter(link => !link.includes(originalProfileUrl));


    return response.status(200).json({ followers: filteredFollowers });

  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Failed to scrape the page. The profile might be private or Zomato changed their layout.', details: error.message });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}

