'use server'

import puppeteer from 'puppeteer'

export async function checkRank(keyword: string, placeName: string) {
    if (!keyword || !placeName) {
        return { error: '키워드와 업체명을 모두 입력해주세요.' }
    }

    let browser = null;
    try {
        // Launch Puppeteer
        // Note: In production (Vercel), this usually fails without specific setup (chromium-r),
        // but for local or VPS it should work if dependencies are installed.
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Important for Docker/Container
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        // Emulate Mobile for Infinite Scroll (Simpler DOM)
        // Or Desktop for Pagination.
        // Let's use Mobile as it's often more robust for "Place" listing.
        await page.setViewport({ width: 375, height: 812 });
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');

        const encodedKeyword = encodeURIComponent(keyword);
        const url = `https://m.place.naver.com/place/list?query=${encodedKeyword}`;

        // Go to page
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Clean serach name
        const searchName = placeName.replace(/\s+/g, '').toLowerCase();

        // Try simple HTML text check first? No, names are often hidden or in list items.

        // Loop for scrolling/pagination
        // Mobile Place List uses Infinite Scroll.
        // We will scroll until we find it or reach a limit (e.g., 100 items or 5 scrolls).

        let found = false;
        let rank = -1;
        let foundName = '';
        const MAX_SCROLLS = 10; // Approx 100-200 items depending on load

        for (let i = 0; i < MAX_SCROLLS; i++) {
            // Check current items
            // We evaluate in browser context to return the index of match
            const checkResult = await page.evaluate((searchName) => {
                // Select all list items. The class name might change, so we look for structure.
                // Usually list items are 'li' inside a 'ul' that contains 'place' info.
                // Naver Mobile Place List usually has a specific container.
                const listItems = document.querySelectorAll('li'); // Broad selection

                for (let j = 0; j < listItems.length; j++) {
                    const el = listItems[j];
                    const text = el.innerText || '';
                    const cleanText = text.replace(/\s+/g, '').toLowerCase();

                    // Basic check: does the list item contain the name block?
                    // We should be careful not to match random text.
                    // Usually there is a strong tag or specific class like .UEzoS (title).
                    // Let's just check if the text contains the searchName for now.
                    if (cleanText.includes(searchName) || searchName.includes(cleanText)) {

                        // Try to extract specific title if possible to be sure
                        // This selector is fragile and might need update if Naver changes UI
                        // But verifying presence is a good start.
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

            // Scroll down
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });

            // Wait for load
            // Using a simple sleep is safer than waiting for specific network events which might be flaky
            await new Promise(r => setTimeout(r, 1500));
        }

        if (found) {
            return {
                success: true,
                rank: rank,
                page: 1, // Mobile is single page infinite scroll
                message: `현재 "${foundName}"은(는) 전체 목록에서 ${rank}번째에 위치하고 있습니다.`
            }
        } else {
            return {
                success: false,
                message: `"${placeName}"을(를) 찾을 수 없습니다. (상위 100+개 확인)`
            }
        }

    } catch (error) {
        console.error('Puppeteer Rank Check Error:', error);
        return { error: '순위 조회 중 오류가 발생했습니다. (서버/브라우저 오류)' }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
