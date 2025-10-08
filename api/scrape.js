const puppeteer = require('puppeteer-core');
const chrome = require('@sparticuz/chromium');

// This line is for Vercel's Pro plan. It allows the function to run longer.
// On the free Hobby plan, the limit is still around 10-15 seconds.
export const maxDuration = 60;

// This function is executed in the browser to perform intelligent, observer-based scraping
const scrapeWithObserver = () => {
    return new Promise((resolve, reject) => {
        const followerLinks = new Set();
        const maxIdleTime = 5000; // 5 seconds
        let idleTimer = setTimeout(() => {
            // If no new content is loaded for 5 seconds, we assume we're done
            observer.disconnect();
            resolve(Array.from(followerLinks));
        }, maxIdleTime);

        const observer = new MutationObserver((mutations) => {
            // Reset the idle timer because new content has just been loaded
            clearTimeout(idleTimer);

            // Scrape for new links that were just added
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // It's an element
                        const links = node.querySelectorAll('a[href*="/users/"]');
                        links.forEach(el => {
                            if (el.href) {
                                const cleanUrl = el.href.split('?')[0];
                                followerLinks.add(cleanUrl);
                            }
                        });
                    }
                });
            });
            
            // Set the timer again to wait for the next batch of content
            idleTimer = setTimeout(() => {
                observer.disconnect();
                resolve(Array.from(followerLinks));
            }, maxIdleTime);
        });

        // Find the main container where followers are loaded. This might need adjustment.
        // We'll start by observing the whole body.
        const targetNode = document.body;
        if (!targetNode) {
            return reject('Could not find target node to observe.');
        }

        // Start observing for changes (i.e., new followers being loaded)
        observer.observe(targetNode, { childList: true, subtree: true });

        // Start the scrolling process
        let lastHeight = 0;
        const scrollInterval = setInterval(() => {
            const currentHeight = document.documentElement.scrollHeight;
            if (currentHeight > lastHeight) {
                lastHeight = currentHeight;
                window.scrollTo(0, currentHeight);
            }
        }, 500); // Scroll down every half a second
        
        // Also add a safety timeout for the whole process
        setTimeout(() => {
             clearInterval(scrollInterval);
             observer.disconnect();
             resolve(Array.from(followerLinks));
        }, 25000); // Max 25 seconds for the whole process
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
    await page.waitForSelector('a[href*="/users/"]', { timeout: 15000 });

    // Execute the advanced observer-based scraping logic
    const allFollowers = await page.evaluate(scrapeWithObserver);
    
    // Filter out the original profile URL from the results
    const originalProfileUrl = url.split('?')[0];
    const filteredFollowers = allFollowers.filter(link => !link.includes(originalProfileUrl));

    return response.status(200).json({ followers: filteredFollowers });

  } catch (error) {
    console.error('Error during scraping:', error);
    return response.status(500).json({ error: 'Failed to scrape the page. The profile might be private or Zomato changed their layout.', details: error.message });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}

