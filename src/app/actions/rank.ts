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
        let found = false
        let foundRank = -1
        let foundName = ''
        const searchName = placeName.replace(/\s+/g, '').toLowerCase()

        // Iterate over list items that look like place entries
        $('li').each((i, el) => {
            const element = $(el)
            const htmlContent = element.html() || ''
            const textContent = element.text()

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
                    const isAd = textContent.includes('광고') || textContent.includes('플레이스 플러스')
                    
                    // Extract Name
                    // Try multiple selectors to find the name
                    // .place_bluelink is common for the main title link
                    // Sometimes it might be in other spans depending on the layout (list vs map view style)
                    let name = element.find('.place_bluelink').text() || 
                               element.find('span.Fc1rA').text() || 
                               element.find('span.YwYLL').text()
                    
                    // Fallback: try to find the first strong tag or just use text if we are desperate, 
                    // but let's be careful not to grab random text.
                    if (!name) {
                         // Sometimes the structure is different. Let's look for the link text.
                         name = element.find('a').first().text()
                    }

                    // Clean up name for comparison
                    const currentNameClean = name.replace(/\s+/g, '').toLowerCase()
                    
                    if (!isAd) {
                        realRank++
                    }

                    // Check if this is the place we are looking for
                    // We check if the search term is included in the place name or vice versa
                    // to handle slight mismatches (e.g. "마케팅 식당" vs "마케팅식당 본점")
                    if (!found && (currentNameClean.includes(searchName) || searchName.includes(currentNameClean))) {
                        found = true
                        foundName = name
                        if (!isAd) {
                            foundRank = realRank
                        }
                    }
                }
            }
        })

        if (found) {
            if (foundRank !== -1) {
                return { 
                    success: true, 
                    rank: foundRank, 
                    message: `현재 "${keyword}" 검색 결과에서 "${foundName}"은(는) ${foundRank}위 입니다.` 
                }
            } else {
                return { 
                    success: true, 
                    rank: -1, 
                    message: `"${foundName}"은(는) 발견되었으나 "광고" 영역에 노출되고 있어 순위에서 제외되었습니다.` 
                }
            }
        } else {
            return { 
                success: false, 
                message: `검색 결과 상위(통합검색 플레이스 영역)에서 "${placeName}"을(를) 찾을 수 없습니다.` 
            }
        }

    } catch (error) {
        console.error('Rank check error:', error)
        return { error: '순위 조회 중 오류가 발생했습니다.' }
    }
}
