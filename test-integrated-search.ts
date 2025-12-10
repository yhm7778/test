
import * as cheerio from 'cheerio';

async function testIntegratedSearch() {
    const keyword = '안양 맛집';
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query=${encodedKeyword}`;

    console.log(`Fetching ${url}...`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            }
        });

        if (!response.ok) {
            console.error(`Failed to fetch: ${response.status} ${response.statusText}`);
            return;
        }

        const html = await response.text();
        console.log(`Fetched ${html.length} chars.`);

        if (html.includes('동해오징어보쌈')) {
            console.log("SUCCESS: Found '동해오징어보쌈' in Integrated Search HTML");
            
            // Try to find the rank
            const $ = cheerio.load(html);
            // The structure is usually <ul> <li> ...
            // Use a broad search for the element
            
            // This is just a test, so simple string find is enough for now.
        } else {
            console.log("FAIL: '동해오징어보쌈' NOT found in Integrated Search HTML");
        }
        
        // Save for inspection
        const fs = require('fs');
        fs.writeFileSync('debug-search.html', html);

    } catch (error) {
        console.error("Error:", error);
    }
}

testIntegratedSearch();
