import * as cheerio from 'cheerio';
import https from 'https';

const keyword = encodeURIComponent('안양맛집');
const url = `https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query=${keyword}`;

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const $ = cheerio.load(data);
    
    console.log('Searching for Place items...');
    
    let count = 0;
    $('li').each((i, el) => {
        const element = $(el);
        const htmlContent = element.html() || '';
        
        if (htmlContent.includes('place.map.naver.com') || htmlContent.includes('/place/')) {
             let id = '';
             const link = element.find('a').attr('href');
             if (link) {
                 const idMatch = link.match(/\/place\/(\d+)/);
                 if (idMatch) id = idMatch[1];
             }
             
             if (id) {
                 count++;
                 if (count <= 3) {
                     console.log(`\n--- Item ${count} (ID: ${id}) ---`);
                     
                     // Check Ad Structure
                     const adIcon = element.find('.ico_ad, .txt_ad, .sp_ad, .ad_area');
                     console.log(`Ad Icon/Class found: ${adIcon.length > 0}`);
                     if (adIcon.length > 0) {
                         console.log(`Ad Class: ${adIcon.attr('class')}`);
                         console.log(`Ad Text: ${adIcon.text()}`);
                     }
                     
                     // Analyze Name Structure
                     const blueLink = element.find('.place_bluelink');
                     console.log(`Name Container HTML: ${blueLink.html()}`);
                     
                     // Try to extract just the name
                     // Usually name is the text of the first span that is NOT blind
                     let cleanName = '';
                     blueLink.contents().each((j, node) => {
                         if (node.type === 'text') {
                             cleanName += $(node).text();
                         } else if (node.type === 'tag' && $(node).attr('class') !== 'blind') {
                             cleanName += $(node).text();
                         }
                     });
                     console.log(`Extracted Clean Name: ${cleanName.trim()}`);
                 }
             }
        }
    });
  });
});
