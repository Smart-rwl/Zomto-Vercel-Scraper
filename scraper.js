<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zomato Follower Link Scraper</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
        }
        .spinner {
            border-top-color: #3498db;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body class="bg-gray-900 text-white flex items-center justify-center min-h-screen">

    <div class="w-full max-w-2xl mx-auto p-6 md:p-8 bg-gray-800 rounded-2xl shadow-2xl">
        
        <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-white">Zomato Follower Scraper</h1>
            <p class="text-gray-400 mt-2">Paste a profile URL to get a list of their followers' profiles.</p>
        </div>

        <!-- Input Section -->
        <div class="space-y-4">
            <div>
                <label for="zomato-url" class="block text-sm font-medium text-gray-300 mb-2">Zomato Profile URL</label>
                <div class="flex flex-col sm:flex-row gap-3">
                    <input type="url" id="zomato-url" placeholder="https://www.zomato.com/users/..." class="flex-grow bg-gray-700 text-white border-gray-600 rounded-lg w-full px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-200" required>
                    <button id="scrape-btn" class="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 w-full sm:w-auto">
                        <i class="fas fa-search mr-2"></i>
                        <span>Scrape Followers</span>
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Status/Result Section -->
        <div id="status-container" class="mt-6 text-center h-6"></div>

        <div id="results-container" class="hidden mt-4">
            <div class="flex justify-between items-center mb-2">
                <label for="follower-links" class="text-sm font-medium text-gray-300">Scraped Follower Links</label>
                <button id="copy-btn" class="bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-4 rounded-lg transition duration-200 text-sm flex items-center">
                    <i class="fas fa-copy mr-2"></i>
                    <span id="copy-text">Copy All</span>
                </button>
            </div>
            <textarea id="follower-links" readonly class="w-full h-64 bg-gray-900 text-gray-300 border border-gray-700 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"></textarea>
        </div>

    </div>

    <script>
        const scrapeBtn = document.getElementById('scrape-btn');
        const copyBtn = document.getElementById('copy-btn');
        const urlInput = document.getElementById('zomato-url');
        const resultsContainer = document.getElementById('results-container');
        const followerLinksTextarea = document.getElementById('follower-links');
        const statusContainer = document.getElementById('status-container');
        const copyText = document.getElementById('copy-text');

        scrapeBtn.addEventListener('click', handleScrape);
        copyBtn.addEventListener('click', copyToClipboard);

        async function handleScrape() {
            const url = urlInput.value.trim();
            if (!isValidZomatoUrl(url)) {
                showStatus('Please enter a valid Zomato user profile URL.', 'error');
                return;
            }

            // --- UI state update ---
            setLoading(true);
            resultsContainer.classList.add('hidden');
            followerLinksTextarea.value = '';

            try {
                // IMPORTANT: This is a MOCK function.
                // In a real Vercel app, you would replace this with:
                // const response = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
                // if (!response.ok) throw new Error('Scraping failed');
                // const data = await response.json();
                // const followers = data.followers;
                
                const followers = await mockScrapingFunction(url);
                
                if (followers.length > 0) {
                    followerLinksTextarea.value = followers.join('\n');
                    resultsContainer.classList.remove('hidden');
                    showStatus(`Successfully scraped ${followers.length} follower links.`, 'success');
                } else {
                    showStatus('No followers found or the profile is private.', 'warning');
                }

            } catch (error) {
                console.error('Scraping error:', error);
                // This error will trigger if your Vercel function fails.
                showStatus('Failed to scrape followers. The profile might be private or Zomato blocked the request.', 'error');
            } finally {
                setLoading(false);
            }
        }
        
        /**
         * MOCK SCRAPING FUNCTION - Simulates a real backend call.
         * In your Vercel project, you would create a file at `/api/scrape.js`
         * to handle the scraping logic using a library like Puppeteer or Cheerio.
         * This function is just for demonstration purposes.
         */
        function mockScrapingFunction(url) {
            console.log(`Simulating scraping for: ${url}`);
            return new Promise(resolve => {
                setTimeout(() => {
                    // This is placeholder data for demonstration.
                    // A real backend would scrape the actual followers from the provided URL.
                    const mockData = [
                        'https://www.zomato.com/users/foodie-delhi-12345',
                        'https://www.zomato.com/users/mumbai-eats-67890',
                        'https://www.zomato.com/users/bangalore-blogger-54321',
                        'https://www.zomato.com/users/chennai-food-lover-98765',
                        'https://www.zomato.com/users/kolkata-explorer-24680',
                        'https://www.zomato.com/users/hyderabad-hunger-13579',
                        'https://www.zomato.com/users/pune-bites-11223',
                        'https://www.zomato.com/users/jaipur-foodie-44556',
                        'https://www.zomato.com/users/goa-grills-55667',
                        'https://www.zomato.com/users/ahmedabad-eats-77889',
                        'https://www.zomato.com/users/surat-snacks-10101'
                    ];
                    resolve(mockData);
                }, 2000); // Simulate network delay
            });
        }

        function copyToClipboard() {
            if (!followerLinksTextarea.value) return;

            // Using document.execCommand for better compatibility inside iFrames
            followerLinksTextarea.select();
            followerLinksTextarea.setSelectionRange(0, 99999); // For mobile devices
            try {
                document.execCommand('copy');
                copyText.textContent = 'Copied!';
                setTimeout(() => {
                    copyText.textContent = 'Copy All';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy: ', err);
                copyText.textContent = 'Failed!';
                 setTimeout(() => {
                    copyText.textContent = 'Copy All';
                }, 2000);
            }
            window.getSelection().removeAllRanges();
        }

        function isValidZomatoUrl(url) {
            // Basic validation - you can make this more robust
            try {
                const urlObject = new URL(url);
                return urlObject.hostname.includes('zomato.com') && urlObject.pathname.includes('/users/');
            } catch (error) {
                return false;
            }
        }
        
        function setLoading(isLoading) {
            if (isLoading) {
                scrapeBtn.disabled = true;
                scrapeBtn.innerHTML = `<div class="spinner w-5 h-5 border-2 border-white border-solid rounded-full"></div> <span class="ml-2">Scraping...</span>`;
                statusContainer.innerHTML = '';
            } else {
                scrapeBtn.disabled = false;
                scrapeBtn.innerHTML = `<i class="fas fa-search mr-2"></i> <span>Scrape Followers</span>`;
            }
        }

        function showStatus(message, type = 'info') {
            let colorClass = 'text-gray-400';
            if (type === 'success') colorClass = 'text-green-400';
            if (type === 'error') colorClass = 'text-red-400';
            if (type === 'warning') colorClass = 'text-yellow-400';
            statusContainer.innerHTML = `<p class="${colorClass} transition-opacity duration-300">${message}</p>`;
        }

    </script>

</body>
</html>


