const fs = require('fs');
const path = require('path');

const pages = [
  { html: 'index.html', dicts: ['assets/js/i18n/common.en.js', 'assets/js/i18n/home.en.js'] },
  { html: 'fat-loss.html', dicts: ['assets/js/i18n/common.en.js', 'assets/js/i18n/fat.en.js'] },
  { html: 'muscle-gain.html', dicts: ['assets/js/i18n/common.en.js', 'assets/js/i18n/muscle.en.js'] }
];

let fail = 0;

for (const page of pages) {
  const html = fs.readFileSync(path.join(__dirname, '..', page.html), 'utf8');
  const keys = new Map(); // key -> count
  const re = /data-i18n(?:-text|-aria|-content)?="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    keys.set(m[1], (keys.get(m[1]) || 0) + 1);
  }

  const dict = {};
  for (const d of page.dicts) {
    const src = fs.readFileSync(path.join(__dirname, '..', d), 'utf8');
    const kre = /^\s*'([\w.\-]+)':/gm;
    let k;
    while ((k = kre.exec(src))) {
      if (dict[k[1]]) console.log(`[dup key] ${d}: ${k[1]}`);
      dict[k[1]] = true;
    }
  }

  const missing = [...keys.keys()].filter(k => !dict[k]);
  const unused = Object.keys(dict).filter(k => !keys.has(k));

  console.log(`\n== ${page.html} ==`);
  console.log(`html keys: ${keys.size}, dict keys: ${Object.keys(dict).length}`);
  if (missing.length) { fail++; console.log('MISSING EN:', missing.join(', ')); }
  if (unused.length) console.log('unused dict keys:', unused.join(', '));

  // 检查中文重复键是否文案冲突（同 key 不同原文）
  // 简易校验：HTML 中标签是否成对（section/div/article）
  for (const tag of ['section', 'article', 'div', 'table', 'ul', 'ol', 'figure']) {
    const open = (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
    const close = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    if (open !== close) { fail++; console.log(`TAG MISMATCH <${tag}>: open=${open} close=${close}`); }
  }
  if (html.includes('<!--PART')) { fail++; console.log('leftover PART marker!'); }
}

console.log(fail ? `\nFAILED (${fail})` : '\nALL OK');
