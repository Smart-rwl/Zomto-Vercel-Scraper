const puppeteer = require('puppeteer-core');
const chrome = require('@sparticuz/chromium');

// This line is for Vercel's Pro plan. It allows the function to run longer.
// On the free Hobby plan, the timeout is typically 10-15 seconds regardless.
export const maxDuration = 60;

// This function scrolls, waits, and scrapes until no new content is loaded.
// It's a more reliable method for handling infinite scroll.
const scrapeInfiniteScroll = () => {
    return new Promise((resolve) => {
        const followerLinks = new Set();
        let lastHeight = 0;
        let stableCount = 0; // Counter to check if the page has stopped loading new content
        const maxStableCount = 4; // Stop after 4 scrolls with no new followers

        const interval = setInterval(() => {
            // Scrape all links currently visible on the page
            document.querySelectorAll('a[href*="/users/"]').forEach(el => {
                if (el.href) {
                    const cleanUrl = el.href.split('?')[0];
                    followerLinks.add(cleanUrl);
                }
            });

            const currentHeight = document.documentElement.scrollHeight;
            if (currentHeight > lastHeight) {
                window.scrollTo(0, currentHeight);
                lastHeight = currentHeight;
                stableCount = 0; // Reset counter because new content was loaded
            } else {
                stableCount++; // Increment counter if height is the same
            }

            // If we've scrolled and the height hasn't changed for a few cycles, we're done.
            if (stableCount >= maxStableCount) {
                clearInterval(interval);
                resolve(Array.from(followerLinks));
            }
        }, 1000); // Scroll every 1 second to give content time to load

        // A final safety timeout to ensure the function completes
        setTimeout(() => {
            clearInterval(interval);
            resolve(Array.from(followerLinks));
        }, 45000); // Max 45 seconds for the entire process
    });
};


export default async function handler(request, response) {
  const { url } = request.query;

  if (!url) {
    return response.status(400).json({ error: 'URL is required' });
  }

  let browser = null;
  
  try {
    console.log('Serverless function started. Launching browser...');
    browser = await puppeteer.launch({
      args: chrome.args,
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath(),
      headless: chrome.headless,
      ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();
    // Set a realistic user agent to avoid being blocked
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
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
    console.log(`Navigating to: ${networkUrl}`);
    await page.goto(networkUrl, { waitUntil: 'domcontentloaded' });
    
    console.log('Waiting for initial follower links to appear...');
    await page.waitForSelector('a[href*="/users/"]', { timeout: 20000 });

    console.log('Initial content loaded. Starting infinite scroll scrape...');
    const allFollowers = await page.evaluate(scrapeInfiniteScroll);
    console.log(`Scraping complete. Found ${allFollowers.length} total links.`);
    
    const originalProfileUrl = url.split('?')[0];
    const filteredFollowers = allFollowers.filter(link => !link.includes(originalProfileUrl));
    console.log(`Returning ${filteredFollowers.length} unique follower links.`);

    return response.status(200).json({ followers: filteredFollowers });

  } catch (error) {
    console.error('CRITICAL ERROR during scraping:', error);
    return response.status(500).json({ error: 'Failed to scrape the page. This could be due to a timeout, a private profile, or a change in Zomato\'s website structure.', details: error.message });
  } finally {
    if (browser !== null) {
      console.log('Closing browser.');
      await browser.close();
    }
  }
}

