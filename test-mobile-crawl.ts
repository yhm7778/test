
import * as cheerio from 'cheerio';

async function testMobileCrawl() {
    const keyword = '안양 맛집';
    const encodedKeyword = encodeURIComponent(keyword);
    // Trying the mobile place search URL
    const url = `https://m.place.naver.com/place/list?query=${encodedKeyword}`;

    console.log(`Fetching ${url}...`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        if (!response.ok) {
            console.error(`Failed to fetch: ${response.status} ${response.statusText}`);
            return;
        }

        const html = await response.text();
        console.log(`Fetched ${html.length} chars.`);

        // Save to file for inspection
        const fs = await import('fs');
        fs.writeFileSync('debug-mobile.html', html);

        const $ = cheerio.load(html);
        
        // Check for script tags that might contain data
        $('script').each((i, el) => {
            const content = $(el).html() || '';
            if (content.includes('window.__APOLLO_STATE__') || content.includes('__INITIAL_STATE__') || content.includes('__PLACE_STATE__')) {
                console.log(`Found state script at index ${i}`);
                
                // Save this script content to a file
                const fs = require('fs');
                fs.writeFileSync(`debug-script-${i}.js`, content);
                console.log(`Saved script content to debug-script-${i}.js`);
                
                // Try to parse the JSON inside
                try {
                     if (content.includes('__INITIAL_STATE__')) {
                        const jsonStr = content.match(/window\.__INITIAL_STATE__\s*=\s*({.*});/)?.[1];
                         if (jsonStr) {
                             const data = JSON.parse(jsonStr);
                             console.log("Parsed __INITIAL_STATE__");
                             // Search for our target
                             const dataStr = JSON.stringify(data);
                             if (dataStr.includes('동해오징어보쌈')) {
                                 console.log("SUCCESS: Found '동해오징어보쌈' in __INITIAL_STATE__");
                             } else {
                                 console.log("FAIL: '동해오징어보쌈' NOT found in __INITIAL_STATE__");
                             }
                         }
                     }
                } catch (e) {
                    console.error("Error parsing script content", e);
                }
            }
        });

        // Also check plain HTML text just in case
        if (html.includes('동해오징어보쌈')) {
            console.log("Found '동해오징어보쌈' in raw HTML body");
        } else {
            console.log("'동해오징어보쌈' NOT found in raw HTML body");
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

testMobileCrawl();
