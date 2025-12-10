import https from 'https';

const keyword = encodeURIComponent('안양 맛집');
const targetName = '동해오징어보쌈';
const searchName = targetName.replace(/\s+/g, '').toLowerCase();

console.log(`Searching for '${targetName}' (clean: ${searchName}) in '${decodeURIComponent(keyword)}'...`);

async function runDebug() {
    for (let page = 1; page <= 5; page++) {
        console.log(`\n--- Page ${page} ---`);
        // Add searchCoord parameter (Anyang Station approx coords)
        const searchCoord = '126.9221228;37.4016259'; 
        const url = `https://map.naver.com/p/api/search/allSearch?query=${keyword}&type=all&page=${page}&displayCount=20&searchCoord=${searchCoord}`;
        
        try {
            const data = await fetchJson(url);
            
            // Log structure availability
            if (!data) console.log('Data is null');
            else {
                if (data.result) {
                     // Log entire result to check for nulls or blocking messages
                     console.log('RESULT SNAPSHOT:', JSON.stringify(data.result, null, 2).substring(0, 1000));
                } else {
                    console.log('FULL DATA SNAPSHOT:', JSON.stringify(data, null, 2).substring(0, 500));
                }
            }
            
            const list = data?.result?.place?.list;

            if (list && Array.isArray(list)) {
                console.log(`Found ${list.length} items.`);
                list.forEach((item, i) => {
                    const itemName = item.name || '';
                    const cleanItemName = itemName.replace(/\s+/g, '').toLowerCase();
                    const rank = (page - 1) * 20 + (i + 1);
                    
                    if (itemName.includes('동해오징어') || i < 3) { // Log first 3 items and any partial match
                        console.log(`[Rank ${rank}] ${itemName} (clean: ${cleanItemName})`);
                    }

                    if (cleanItemName.includes(searchName) || searchName.includes(cleanItemName)) {
                        console.log(`!!! FOUND MATCH !!! [Rank ${rank}] ${itemName}`);
                    }
                });
            } else {
                console.log('List is empty or invalid.');
            }

        } catch (error) {
            console.error(`Error on page ${page}:`, error);
        }
    }
}

function fetchJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'Host': 'map.naver.com',
                'Connection': 'keep-alive',
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'sec-ch-ua-mobile': '?0',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'sec-ch-ua-platform': '"Windows"',
                'Accept': 'application/json, text/plain, */*',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Dest': 'empty',
                'Referer': 'https://map.naver.com/p/search/%EC%95%88%EC%96%91%20%EB%A7%9B%EC%A7%91',
                'Accept-Encoding': 'identity', // Disable compression for simple handling
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    if (data.trim().startsWith('<')) {
                        console.log('Received HTML instead of JSON. Possible blocking or wrong URL.');
                        resolve(null);
                        return;
                    }
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error('JSON Parse Error:', e);
                    console.log('Raw Data Snippet:', data.substring(0, 100));
                    resolve(null);
                }
            });
        }).on('error', reject);
    });
}

runDebug();
