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
                args: chromium.args,
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
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');

        const encodedKeyword = encodeURIComponent(keyword);
        const url = `https://m.place.naver.com/place/list?query=${encodedKeyword}`;

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        const searchName = placeName.replace(/\s+/g, '').toLowerCase();

        let found = false;
        let rank = -1;
        let foundName = '';
        const MAX_SCROLLS = 10;

        for (let i = 0; i < MAX_SCROLLS; i++) {
            const checkResult = await page.evaluate((searchName) => {
                const listItems = document.querySelectorAll('li');

                for (let j = 0; j < listItems.length; j++) {
                    const el = listItems[j];
                    const text = el.innerText || '';
                    const cleanText = text.replace(/\s+/g, '').toLowerCase();

                    if (cleanText.includes(searchName) || searchName.includes(cleanText)) {
                        return { found: true, index: j + 1, text: text.split('\n')[0] };
                    }
                }
                return { found: false, count: listItems.length };
            }, searchName);

            if (checkResult.found) {
                found = true;
                rank = checkResult.index!
                foundName = checkResult.text!
                break;
            }

            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });

            await new Promise(r => setTimeout(r, 1500));
        }

        if (found) {
            return {
                success: true,
                rank: rank,
                page: 1,
                message: `현재 "${foundName}"은(는) 전체 목록에서 ${rank}번째에 위치하고 있습니다.`
            }
        } else {
            return {
                success: false,
                message: `"${placeName}"을(를) 찾을 수 없습니다. (상위 100+개 확인)`
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
