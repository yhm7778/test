'use server'

import * as cheerio from 'cheerio'

export async function checkRank(keyword: string, placeName: string) {
    if (!keyword || !placeName) {
        return { error: '키워드와 업체명을 모두 입력해주세요.' }
    }

    try {
        const encodedKeyword = encodeURIComponent(keyword)
        const url = `https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query=${encodedKeyword}`

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            },
            cache: 'no-store'
        })

        if (!response.ok) {
            return { error: '네이버 검색 결과를 가져오는데 실패했습니다.' }
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        let realRank = 0
        let foundOrganic = false
        let foundAd = false
        let organicRank = -1
        let foundName = ''
        const searchName = placeName.replace(/\s+/g, '').toLowerCase()

        // Iterate over list items that look like place entries
        $('li').each((i, el) => {
            const element = $(el)
            const htmlContent = element.html() || ''
            
            // Check if it's a place item
            if (htmlContent.includes('place.map.naver.com') || htmlContent.includes('/place/')) {
                // Extract ID
                let id = ''
                const link = element.find('a').attr('href')
                if (link) {
                    const idMatch = link.match(/\/place\/(\d+)/)
                    if (idMatch) {
                        id = idMatch[1]
                    }
                }

                if (id) {
                    // Check if it's an Ad
                    // Look for specific Ad classes or badges
                    const adBadge = element.find('.ico_ad, .txt_ad, .sp_ad, .ad_area')
                    const isAd = adBadge.length > 0 || element.find('span').filter((_, e) => $(e).text() === '광고').length > 0
                    
                    // Extract Name
                    // Try to find the specific name class first (TYaxT seems common)
                    let name = element.find('.TYaxT').text()
                    
                    if (!name) {
                        // Fallback: Use .place_bluelink but remove children that are usually non-name info
                        const blueLink = element.find('.place_bluelink').clone()
                        blueLink.find('.place_blind, .urQl1, .KCMnt, .Yi59N').remove()
                        name = blueLink.text()
                    }
                    
                    if (!name) {
                        // Final fallback
                        name = element.find('a').first().text()
                    }

                    name = name.trim()
                    
                    // Skip if no name extracted - do not force match with placeName
                    if (!name) {
                        return; // Skip this element
                    }

                    // Clean up name for comparison
                    const currentNameClean = name.replace(/\s+/g, '').toLowerCase()
                    
                    if (!isAd) {
                        realRank++
                    }

                    if (currentNameClean.includes(searchName) || searchName.includes(currentNameClean)) {
                        foundName = name
                        if (isAd) {
                            foundAd = true
                        } else {
                            if (!foundOrganic) {
                                foundOrganic = true
                                organicRank = realRank
                            }
                        }
                    }
                }
            }
        })

        if (foundOrganic) {
            return { 
                success: true, 
                rank: organicRank, 
                message: `현재 "${foundName}"은(는) ${organicRank}위 입니다.` 
            }
        }

        // If not found in organic results (or only found as Ad), try deep search via Map API
        const deepResult = await searchDeepRank(keyword, placeName);
        if (deepResult) {
            return {
                success: true,
                rank: deepResult.rank,
                message: `현재 "${deepResult.name}"은(는) ${deepResult.rank}위 입니다.${foundAd ? ' (통합검색에서는 광고로 노출 중)' : ''}`
            }
        }

        if (foundAd) {
            return { 
                success: true, 
                rank: -1, 
                message: `"${foundName}"은(는) 광고 영역에만 노출되고 있어 실제 순위를 파악할 수 없습니다.` 
            }
        } else {
            return { 
                success: false, 
                message: `"${placeName}"을(를) 찾을 수 없습니다.` 
            }
        }

    } catch (error) {
        console.error('Rank check error:', error)
        return { error: '순위 조회 중 오류가 발생했습니다.' }
    }
}

async function searchDeepRank(keyword: string, placeName: string) {
    const encodedKeyword = encodeURIComponent(keyword);
    const searchName = placeName.replace(/\s+/g, '').toLowerCase();
    
    // Search up to 100 pages (2000 items)
    const MAX_PAGES = 100;
    
    for (let page = 1; page <= MAX_PAGES; page++) {
        try {
            // Using Naver Map internal API structure
            const url = `https://map.naver.com/p/api/search/allSearch?query=${encodedKeyword}&type=all&page=${page}&displayCount=20`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://map.naver.com/',
                    'Accept': 'application/json, text/plain, */*'
                },
                cache: 'no-store'
            });

            if (!response.ok) continue;

            const data = await response.json();
            const list = data?.result?.place?.list;

            // If list is empty or not an array, we've reached the end of results
            if (!list || !Array.isArray(list) || list.length === 0) {
                break;
            }

            for (let i = 0; i < list.length; i++) {
                const item = list[i];
                const itemName = item.name || '';
                const cleanItemName = itemName.replace(/\s+/g, '').toLowerCase();
                
                // Check if this item matches
                if (cleanItemName.includes(searchName) || searchName.includes(cleanItemName)) {
                     // Calculate global rank based on page
                     // Assuming 20 items per page
                     const rank = (page - 1) * 20 + (i + 1);
                     return {
                         rank,
                         name: itemName,
                         page
                     };
                }
            }
            
        } catch (e) {
            console.error(`Map deep search error page ${page}:`, e);
        }
    }
    return null;
}
