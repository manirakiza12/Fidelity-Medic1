/**
 * Captures each hero slide by clicking its dot (the real user path).
 * Usage: node scripts/shoot-slides.js [desktop|tablet|mobile]
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'shots');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};

const which = process.argv[2];
const targets = which ? [which] : Object.keys(VIEWPORTS);

(async () => {
  const b = await puppeteer.launch({
    headless: 'new',
    executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
    args: ['--no-sandbox'],
  });

  for (const name of targets) {
    const vp = VIEWPORTS[name];
    if (!vp) { console.log('unknown viewport: ' + name); continue; }

    const p = await b.newPage();
    await p.setViewport(vp);
    await p.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await sleep(700);

    for (let i = 0; i < 4; i++) {
      // Clicking a dot restarts the 6.5s autoplay timer, so there is a full
      // window to capture before it can advance on its own.
      await p.evaluate((n) => document.querySelector(`.hero-dot[data-goto="${n}"]`).click(), i);
      await sleep(750);
      const active = await p.evaluate(() =>
        [...document.querySelectorAll('.hero-slide')].findIndex((s) => s.classList.contains('is-active'))
      );
      const suffix = name === 'desktop' ? '' : '-' + name;
      await p.screenshot({ path: path.join(OUT, `slide-${i + 1}${suffix}.png`) });
      console.log(`${name} slide ${i + 1} -> index ${active} ${active === i ? 'ok' : '<-- MISMATCH'}`);
    }
    await p.close();
  }

  await b.close();
})();