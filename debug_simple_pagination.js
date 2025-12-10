
// const fetch = require('node-fetch');

async function testSimplePagination() {
    const keyword = encodeURIComponent('강남역 맛집');
    // Page 1
    const url1 = `https://m.place.naver.com/place/list?query=${keyword}&page=1`;
    // Page 2
    const url2 = `https://m.place.naver.com/place/list?query=${keyword}&page=2`;

    try {
        console.log('Fetching page 1...');
        const resp1 = await fetch(url1, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
            }
        });
        const html1 = await resp1.text();

        console.log('Fetching page 2...');
        const resp2 = await fetch(url2, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
            }
        });
        const html2 = await resp2.text();

        // Extract first place name from each to compare
        const nameRegex = /"name":"([^"]+)"/g;

        const names1 = [];
        let match1;
        while ((match1 = nameRegex.exec(html1)) !== null) {
            if (names1.length < 5) names1.push(match1[1]);
        }

        const names2 = [];
        let match2;
        while ((match2 = nameRegex.exec(html2)) !== null) {
            if (names2.length < 5) names2.push(match2[1]);
        }

        console.log('Page 1 Top Names:', names1);
        console.log('Page 2 Top Names:', names2);

        if (names1.length > 0 && names2.length > 0 && names1[0] !== names2[0]) {
            console.log('SUCCESS: Page content differs!');
        } else {
            console.log('FAIL: Page content seems identical or empty.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

testSimplePagination();
