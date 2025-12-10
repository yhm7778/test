
// const fetch = require('node-fetch');

async function analyzePagination() {
    const keyword = encodeURIComponent('강남역 맛집');
    const url = `https://m.place.naver.com/place/list?query=${keyword}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });

        const html = await response.text();
        console.log('HTML length:', html.length);

        const marker = 'window.__PLACE_STATE__';
        let markerIdx = html.indexOf(marker);
        let state = null;

        while (markerIdx !== -1) {
            // Find start brace
            const startIdx = html.indexOf('{', markerIdx);
            if (startIdx !== -1) {
                let braceCount = 0;
                let insideString = false;
                let escape = false;
                let endIdx = -1;

                for (let i = startIdx; i < html.length; i++) {
                    const char = html[i];
                    if (escape) { escape = false; continue; }
                    if (char === '\\') { escape = true; continue; }
                    if (char === '"') { insideString = !insideString; continue; }

                    if (!insideString) {
                        if (char === '{') { braceCount++; }
                        else if (char === '}') {
                            braceCount--;
                            if (braceCount === 0) {
                                endIdx = i + 1;
                                break;
                            }
                        }
                    }
                }

                if (endIdx !== -1) {
                    const jsonStr = html.substring(startIdx, endIdx);
                    if (jsonStr.length > 50) {
                        try {
                            const parsed = JSON.parse(jsonStr);
                            // console.log('Parsed candidate keys:', Object.keys(parsed));
                            // Check for likely candidates
                            state = parsed;
                            break;
                        } catch (e) { }
                    }
                }
            }
            markerIdx = html.indexOf(marker, markerIdx + 1);
        }

        if (state) {
            console.log('=== PLACE_STATE Analysis ===');
            // Log top level
            // console.log('Top keys:', Object.keys(state));

            // Naver Place often has 'place' or 'business'
            // Let's traverse to find the list

            function inspect(obj, keyName) {
                if (!obj) return;
                console.log(`Inspecting ${keyName}: Type=${typeof obj}, IsArray=${Array.isArray(obj)}`);
                if (typeof obj === 'object') {
                    const keys = Object.keys(obj);
                    console.log(`  Keys:`, keys.slice(0, 50)); // Print many keys

                    if (keys.includes('list') || keys.includes('placeList') || keys.includes('items')) {
                        console.log('  *** FOUND POTENTIAL LIST KEY ***');
                    }
                    if (keys.includes('total') || keys.includes('next') || keys.includes('cursor')) {
                        console.log('  *** FOUND PAGINATION KEY ***');
                    }
                }
            }

            // inspect(state, 'root');
            if (state.place) {
                inspect(state.place, 'state.place');
                if (state.place.list) {
                    inspect(state.place.list, 'state.place.list');
                }
                if (state.place.placeList) {
                    inspect(state.place.placeList, 'state.place.placeList');
                }
            }

            // Dump everything that looks like a list
            function findLists(obj, path, depth) {
                if (depth > 4) return;
                if (!obj || typeof obj !== 'object') return;

                Object.keys(obj).forEach(k => {
                    if (k === 'list' || k === 'items') {
                        const val = obj[k];
                        if (Array.isArray(val)) {
                            console.log(`Found LIST at ${path}.${k} (len: ${val.length})`);
                        }
                    } else if (k === 'total' || k === 'totalCount') {
                        console.log(`Found TOTAL at ${path}.${k} = ${obj[k]}`);
                    }
                    findLists(obj[k], `${path}.${k}`, depth + 1);
                });
            }
            findLists(state, 'state', 0);

        } else {
            console.log('PLACE_STATE not found');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

analyzePagination();
