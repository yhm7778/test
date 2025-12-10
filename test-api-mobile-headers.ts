
async function testApiMobileHeaders() {
    const keyword = '안양 맛집';
    const encodedKeyword = encodeURIComponent(keyword);
    const searchCoord = '126.9221228;37.4016259';
    const url = `https://map.naver.com/p/api/search/allSearch?query=${encodedKeyword}&type=all&page=1&displayCount=20&searchCoord=${searchCoord}`;

    console.log(`Fetching ${url}...`);

    try {
        const response = await fetch(url, {
            headers: {
                'Host': 'map.naver.com',
                'Connection': 'keep-alive',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://m.place.naver.com/',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                'Origin': 'https://m.place.naver.com'
            }
        });

        console.log(`Response Status: ${response.status}`);
        
        const text = await response.text();
        console.log(`Response Length: ${text.length}`);

        if (text.length < 5000) {
            console.log("Response Preview:", text);
        } else {
             console.log("Response Preview (first 500):", text.substring(0, 500));
        }

        if (text.includes('동해오징어보쌈')) {
            console.log("SUCCESS: Found '동해오징어보쌈'");
        } else {
            console.log("FAIL: '동해오징어보쌈' NOT found");
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

testApiMobileHeaders();
