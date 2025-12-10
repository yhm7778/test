'use server'

import { RecordWithTtl } from 'dns';

// Dynamic imports to handle different environments
// In production (Vercel), we use puppeteer-core + @sparticuz/chromium
// In development, we use standard puppeteer
const getBrowser = async () => {
    let browser;

    if (process.env.NODE_ENV === 'production') {
        try {
            const chromium = require('@sparticuz/chromium');
            const puppeteer = require('puppeteer-core');

            // Optional: load custom font if needed for Korean characters
            // await chromium.font('https://raw.githack.com/googlei18n/noto-cjk/master/NotoSansCJKkr-Regular.otf');

            browser = await puppeteer.launch({
                args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
                ignoreHTTPSErrors: true,
            });
        } catch (error) {
            console.error('Production Puppeteer Launch Error:', error);
            throw error;
        }
    } else {
        try {
            const puppeteer = require('puppeteer');
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        } catch (error) {
            console.error('Local Puppeteer Launch Error:', error);
            throw error;
        }
    }
    return browser;
};

export async function checkRank(keyword: string, placeName: string) {
    if (!keyword || !placeName) {
        return { error: '키워드와 업체명을 모두 입력해주세요.' }
    }

    let browser = null;
    try {
        browser = await getBrowser();
        const page = await browser.newPage();

        // Emulate Mobile
        await page.setViewport({ width: 375, height: 812 });
        // Use a generic recent iPhone User Agent
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');

        const encodedKeyword = encodeURIComponent(keyword);
        const url = `https://m.place.naver.com/place/list?query=${encodedKeyword}`;

        // Optimize timeout
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait specifically for the list to appear
        try {
            await page.waitForSelector('li', { timeout: 10000 });
        } catch (e) {
            console.log('List selector timeout, might be empty result or different structure');
        }

        // Clean user input for loose matching
        const searchNameClean = placeName.replace(/\s+/g, '').toLowerCase();

        let found = false;
        let rank = -1;
        let foundName = '';

        // Scroll limit: We limit to approx 100 items.
        // Mobile loads ~20 items per scroll. 6 scrolls = 120 items.
        const MAX_SCROLLS = 6;
        let retryCount = 0;
        const MAX_RETRIES = 3; // Retry scrolling if no new items appear

        let previousItemCount = 0;

        for (let i = 0; i < MAX_SCROLLS; i++) {
            // Check for target
            const checkResult = await page.evaluate((searchName: string, originalPlaceName: string) => {
                const listItems = document.querySelectorAll('li');

                for (let j = 0; j < listItems.length; j++) {
                    const el = listItems[j];
                    const text = el.innerText || '';

                    const lines = text.split('\n');
                    let matchedLine = '';
                    let isMatch = false;

                    // Helper to check if string is mostly numeric
                    const isNumeric = (s: string) => /^[\d.,]+$/.test(s);
                    const isSearchNumeric = isNumeric(searchName);

                    for (const line of lines) {
                        const lineClean = line.replace(/\s+/g, '').toLowerCase();
                        if (!lineClean) continue;

                        const isLineNumeric = isNumeric(lineClean);

                        // Safeguard: If user searches "98%", we don't want to match "9" (rank number).
                        // So if Search is NOT numeric, but Line IS numeric, we skip this match.
                        if (!isSearchNumeric && isLineNumeric) {
                            continue;
                        }

                        // Matching Logic:
                        // 1. Line contains Search (Strict) -> Always good. "Starbucks Gangnam" includes "Starbucks"
                        // 2. Search contains Line (Reverse) -> Good for "Starbucks" includes "Starbucks" (Map text), 
                        //    BUT mostly enabled to support "Starbucks Gangnam" (User) vs "Starbucks" (Map).
                        //    We re-enable this because valid names might be substrings of user input.
                        if (lineClean.includes(searchName) || searchName.includes(lineClean)) {
                            matchedLine = line.trim();
                            isMatch = true;
                            // If we find a non-numeric match, it's likely the title or a good keyword match.
                            // If we match a number (and search is numeric), we take it.
                            break;
                        }
                    }

                    if (isMatch) {
                        return { found: true, index: j + 1, text: matchedLine, count: listItems.length };
                    }
                }
                return { found: false, count: listItems.length };
            }, searchNameClean, placeName);

            if (checkResult.found) {
                found = true;
                rank = checkResult.index!
                foundName = checkResult.text!
                break;
            }

            const currentItemCount = checkResult.count || 0;

            // Log logic for retries
            if (currentItemCount === previousItemCount) {
                retryCount++;
                if (retryCount >= MAX_RETRIES) {
                    console.log('Max retries reached, assuming end of list.');
                    break;
                }
                // Small backoff if stuck
                await new Promise(r => setTimeout(r, 500));
            } else {
                retryCount = 0; // Reset retry if we found new items
            }
            previousItemCount = currentItemCount;

            // Stop if we have checked more than 100 items
            if (currentItemCount >= 100) {
                break;
            }

            // Scroll down
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });

            // Wait for new items to appear
            // We use standard timeout. Smart wait is good, but reliability is key now.
            // Wait up to 2 seconds for count to increase.
            try {
                await page.waitForFunction(
                    (prevCount: number) => document.querySelectorAll('li').length > prevCount,
                    { timeout: 2000, polling: 200 },
                    currentItemCount
                );
            } catch (e) {
                // Timeout just means we didn't load new items FAST enough, or at end.
                // The retry logic above handles the 'end' or 'stuck' decision.
            }
        }

        if (found) {
            return {
                success: true,
                rank: rank,
                page: 1,
                message: `${foundName} 순위는 ${rank}위 입니다.`
            }
        } else {
            return {
                success: false,
                message: `"${placeName}"을(를) 100위 내에서 찾을 수 없습니다.`
            }
        }

    } catch (error) {
        console.error('Rank Check Error:', error);
        return { error: '순위 조회 중 오류가 발생했습니다. (서버/브라우저 오류)' }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
