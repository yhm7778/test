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
            await page.waitForSelector('li', { timeout: 5000 });
        } catch (e) {
            console.log('List selector timeout, might be empty result or different structure');
        }

        // Clean user input for loose matching
        const searchNameClean = placeName.replace(/\s+/g, '').toLowerCase();

        let found = false;
        let rank = -1;
        let foundName = '';

        // Increase scroll limit to 100 (approx 2000 items)
        const MAX_SCROLLS = 100;

        for (let i = 0; i < MAX_SCROLLS; i++) {
            const checkResult = await page.evaluate((searchName, originalPlaceName) => {
                const listItems = document.querySelectorAll('li');

                for (let j = 0; j < listItems.length; j++) {
                    const el = listItems[j];
                    const text = el.innerText || '';

                    // Split text by lines to avoid grabbing "Review Count" or "Distance" as the name
                    const lines = text.split('\n');

                    // Find the best line that matches the name
                    let matchedLine = '';
                    let isMatch = false;

                    for (const line of lines) {
                        const lineClean = line.replace(/\s+/g, '').toLowerCase();
                        if (lineClean.includes(searchName) || searchName.includes(lineClean)) {
                            matchedLine = line.trim();
                            isMatch = true;
                            break;
                        }
                    }

                    if (isMatch) {
                        // If we found a match, return it. 
                        // If the matched line is very short (e.g. just "2"), it might be garbage.
                        // But usually the name is substantial.
                        // Prefer returning the User's original name for display if it's cleaner,
                        // but user specifically asked for "found name".
                        // Let's return the matched line.
                        return { found: true, index: j + 1, text: matchedLine };
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

            // Smart Scroll: Scroll and wait for height change
            const previousHeight = await page.evaluate(() => document.body.scrollHeight);

            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });

            // Fast Wait: 1 second timeout for scrolling
            try {
                await page.waitForFunction(
                    `document.body.scrollHeight > ${previousHeight}`,
                    { timeout: 1000, polling: 100 }
                );
            } catch (e) {
                // Ignore timeout, keep scrolling
            }
        }

        if (found) {
            return {
                success: true,
                rank: rank,
                page: 1, // Page isn't really relevant on mobile infinite scroll, but kept for type compatibility
                message: `${foundName} 순위는 ${rank}위 입니다.`
            }
        } else {
            return {
                success: false,
                message: `"${placeName}"을(를) 찾을 수 없습니다. (약 100~2000위 까지 확인)`
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
