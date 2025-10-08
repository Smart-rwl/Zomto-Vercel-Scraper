```javascript:Zomato Scraper Backend:api/scrape.js
const puppeteer = require('puppeteer-core');
const chrome = require('@sparticuz/chromium');

// This is the main serverless function
export default async function handler(request, response) {
  // Get the Zomato URL from the request
  const { url } = request.query;

  if (!url) {
    return response.status(400).json({ error: 'URL is required' });
  }

  let browser = null;
  
  try {
    // Launch a new browser instance on the server
    browser = await puppeteer.launch({
      args: chrome.args,
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath(),
      headless: chrome.headless,
      ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();
    
    // Go to the Zomato network/followers page
    // We append '/network' to ensure we are on the followers list
    const networkUrl = url.endsWith('/network') ? url : `${url.split('?')[0]}/network`;
    await page.goto(networkUrl, { waitUntil: 'networkidle2' });

    // This is the core scraping logic. It tells the browser:
    // "Find all the links that have a specific class name Zomato uses for profiles"
    // NOTE: This class name might be changed by Zomato in the future, which would break the scraper.
    const followerLinks = await page.evaluate(() => {
        const links = new Set(); // Use a Set to automatically handle duplicates
        // Zomato's structure for follower links. This class is on the <a> tag.
        const linkElements = document.querySelectorAll('a.sc-1l2s06c-1'); 
        linkElements.forEach(el => {
            if (el.href) {
                links.add(el.href);
            }
        });
        return Array.from(links); 
    });

    // Send the scraped links back to the frontend
    return response.status(200).json({ followers: followerLinks });

  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Failed to scrape the page.', details: error.message });
  } finally {
    // Ensure the browser is closed
    if (browser !== null) {
      await browser.close();
    }
  }
}
