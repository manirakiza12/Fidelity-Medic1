/**
 * Headless render + interaction check.
 * Captures desktop / tablet / mobile screenshots and exercises the
 * slider, mobile menu, counters and appointment form.
 * Run: node scripts/shoot.js
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const URL = process.env.URL || 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'shots');

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet',  width: 834,  height: 1112 },
  { name: 'mobile',  width: 390,  height: 844 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Locate the downloaded Chrome, whatever the install path ended up being. */
function findChrome() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cacheRoot = process.env.PUPPETEER_CACHE_DIR || path.join(process.env.USERPROFILE || '', '.cache', 'puppeteer');
  const chromeDir = path.join(cacheRoot, 'chrome');
  if (fs.existsSync(chromeDir)) {
    for (const dir of fs.readdirSync(chromeDir)) {
      candidates.push(path.join(chromeDir, dir, 'chrome-win64', 'chrome.exe'));
      candidates.push(path.join(chromeDir, dir, 'chrome-win32', 'chrome.exe'));
      candidates.push(path.join(chromeDir, dir, 'chrome.exe'));
    }
  }
  for (const local of [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ]) candidates.push(local);

  for (const c of candidates) { if (c && fs.existsSync(c)) return c; }
  return null;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const executablePath = findChrome();
  if (!executablePath) {
    console.error('Could not locate a Chrome/Edge binary. Set CHROME_PATH and retry.');
    process.exit(1);
  }
  console.log('Using browser: ' + executablePath);
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  });

  let problems = 0;
  const note = (m) => console.log('  ! ' + m);
  const pass = (m) => console.log('  ok  ' + m);

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });

    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
    page.on('requestfailed', (r) => consoleErrors.push('requestfailed: ' + r.url() + ' ' + (r.failure() || {}).errorText));

    console.log(`\n=== ${vp.name} (${vp.width}x${vp.height}) ===`);
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(900);

    // ---- Layout metrics
    const metrics = await page.evaluate(() => {
      const de = document.documentElement;
      const hero = document.querySelector('#hero');
      const slides = document.querySelector('#heroSlides');
      const nav = document.querySelector('#navbar');
      const overflowing = [];
      document.querySelectorAll('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > de.clientWidth + 2 || r.left < -2)) {
          const cs = getComputedStyle(el);
          if (cs.position === 'absolute' || cs.position === 'fixed') return;
          overflowing.push(el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ').slice(0, 2).join('.'));
        }
      });
      return {
        scrollW: de.scrollWidth,
        clientW: de.clientWidth,
        docH: de.scrollHeight,
        heroH: hero ? Math.round(hero.getBoundingClientRect().height) : 0,
        slidesH: slides ? Math.round(slides.getBoundingClientRect().height) : 0,
        navH: nav ? Math.round(nav.getBoundingClientRect().height) : 0,
        overflowing: [...new Set(overflowing)].slice(0, 8),
        activeSlide: [...document.querySelectorAll('.hero-slide')].findIndex((s) => s.classList.contains('is-active')),
        services: document.querySelectorAll('.svc-card').length,
        testimonials: document.querySelectorAll('#testimonials figure').length,
        impactFigs: document.querySelectorAll('#impact figure').length,
        imgTotal: document.images.length,
        imgBroken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
        imgDeferred: [...document.images].filter((i) => !i.complete && i.loading === 'lazy').length,
      };
    });

    console.log(`  doc ${metrics.docH}px | hero ${metrics.heroH}px | slides ${metrics.slidesH}px | nav ${metrics.navH}px`);
    console.log(`  scrollW ${metrics.scrollW} vs clientW ${metrics.clientW} ${metrics.scrollW > metrics.clientW + 1 ? '<-- HORIZONTAL OVERFLOW' : '(no h-overflow)'}`);
    console.log(`  services ${metrics.services} | testimonials ${metrics.testimonials} | impact figures ${metrics.impactFigs} | images ${metrics.imgTotal}`);
    if (metrics.imgBroken.length) { note('broken images: ' + metrics.imgBroken.join(', ')); problems++; }
    else pass(`no broken images (${metrics.imgDeferred} lazy images deferred until scroll)`);
    if (metrics.overflowing.length) { note('elements past viewport: ' + metrics.overflowing.join(', ')); }
    if (metrics.heroH < 400) { note('hero looks collapsed (' + metrics.heroH + 'px)'); problems++; }

    // ---- Slider interaction (arrows are desktop/tablet only; mobile uses dots + swipe)
    const before = await page.evaluate(() => [...document.querySelectorAll('.hero-slide')].findIndex((s) => s.classList.contains('is-active')));
    if (vp.width >= 640) {
      await page.click('#heroNext');
    } else {
      await page.click('.hero-dot[data-goto="1"]');
    }
    await sleep(700);
    const after = await page.evaluate(() => [...document.querySelectorAll('.hero-slide')].findIndex((s) => s.classList.contains('is-active')));
    const okNext = after === (before + 1) % 4;
    console.log(`  slider next (${vp.width >= 640 ? 'arrow' : 'dot'}): ${before} -> ${after} ${okNext ? 'ok' : '<-- FAILED'}`);
    if (!okNext) problems++;
    // dot jump
    await page.click('.hero-dot[data-goto="0"]');
    await sleep(600);
    const back = await page.evaluate(() => [...document.querySelectorAll('.hero-slide')].findIndex((s) => s.classList.contains('is-active')));
    console.log(`  dot jump to 0: ${back} ${back === 0 ? 'ok' : '<-- FAILED'}`);
    if (back !== 0) problems++;

    // ---- Mobile menu
    if (vp.name === 'mobile') {
      await page.click('#navToggle');
      await sleep(400);
      const open = await page.evaluate(() => !document.querySelector('#mobileMenu').classList.contains('hidden'));
      console.log(`  mobile menu opens: ${open ? 'ok' : '<-- FAILED'}`);
      if (!open) problems++;
      await page.screenshot({ path: path.join(OUT, 'mobile-menu.png') });
      await page.click('#navToggle');
      await sleep(300);
    }

    // ---- Simulate a user scrolling the whole page so every observer fires
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);
    const docH = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < docH; y += Math.round(vp.height * 0.6)) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await sleep(140);
    }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await sleep(2200);

    const counters = await page.evaluate(() =>
      [...document.querySelectorAll('.counter')].map((c) => c.textContent.trim())
    );
    const settled = counters.filter((c) => c !== '0');
    console.log(`  counters animated: ${settled.length}/${counters.length} -> ${counters.join(' | ')}`);
    if (settled.length < counters.length) { note('some counters did not animate'); problems++; }

    const revealed = await page.evaluate(() => document.querySelectorAll('.reveal.in').length);
    const revealTotal = await page.evaluate(() => document.querySelectorAll('.reveal').length);
    console.log(`  revealed elements: ${revealed}/${revealTotal}`);
    if (revealed < revealTotal) { note('some reveal elements never appeared'); problems++; }

    // ---- Hero copy must never collide with the slider controls, on any slide
    const overlaps = [];
    for (let i = 0; i < 4; i++) {
      await page.evaluate((n) => document.querySelector(`.hero-dot[data-goto="${n}"]`).click(), i);
      await sleep(320);
      const gap = await page.evaluate((n) => {
        const copy = document.querySelectorAll('.hero-copy')[n];
        const dots = document.querySelector('#heroDots');
        const slide = document.querySelectorAll('.hero-slide')[n];
        const c = copy.getBoundingClientRect();
        const d = dots.getBoundingClientRect();
        const s = slide.getBoundingClientRect();
        return {
          clearance: Math.round(d.top - c.bottom),
          copyOverflowsSlide: Math.round(c.bottom - s.bottom),
        };
      }, i);
      if (gap.clearance < 0) overlaps.push(`slide ${i + 1}: copy overlaps dots by ${-gap.clearance}px`);
      if (vp.name === 'mobile' && gap.clearance < 0) problems += 2;
      else if (gap.clearance < 0) problems++;
    }
    console.log(`  hero copy vs controls: ${overlaps.length ? 'OVERLAP ' + overlaps.join('; ') : 'no overlap on any slide'}`);

    // ---- Scroll spy: the active nav link must track the section in view
    const spyFail = [];
    for (const id of ['home', 'about', 'services', 'impact', 'contact']) {
      await page.evaluate((s) => {
        const el = document.querySelector('#' + s);
        window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset + 40, behavior: 'instant' });
      }, id);
      await sleep(260);
      const active = await page.evaluate(() => {
        const a = document.querySelector('.nav-link.is-active');
        return a ? a.getAttribute('href').slice(1) : null;
      });
      if (active !== id) spyFail.push(`${id} -> ${active}`);
    }
    console.log(`  scroll spy: ${spyFail.length ? 'MISMATCH ' + spyFail.join(', ') : 'ok (all 5 sections)'}`);
    if (spyFail.length) problems++;

    // ---- Screenshots
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);
    await page.screenshot({ path: path.join(OUT, `${vp.name}-hero.png`) });
    await page.screenshot({ path: path.join(OUT, `${vp.name}-full.png`), fullPage: true });

    // Section-level shots (desktop only, to keep it readable)
    if (vp.name === 'desktop') {
      for (const [sel, name] of [['#about', 'about'], ['#services', 'services'], ['#impact', 'impact'], ['#testimonials', 'testimonials'], ['#contact', 'contact'], ['footer', 'footer']]) {
        const el = await page.$(sel);
        if (el) {
          await el.scrollIntoView();
          await sleep(700);
          await el.screenshot({ path: path.join(OUT, `sec-${name}.png`) }).catch(() => {});
        }
      }
    }

    if (consoleErrors.length) {
      console.log('  console errors:');
      [...new Set(consoleErrors)].slice(0, 10).forEach((e) => note(e));
      problems += consoleErrors.length;
    }

    await page.close();
  }

  /* ---------- Form validation test ---------- */
  console.log('\n=== form ===');
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.querySelector('#contact').scrollIntoView({ block: 'start' }));
  await sleep(1200);

  // Click via the DOM so the sticky header cannot intercept the synthetic click.
  await page.evaluate(() => document.querySelector('#submitBtn').click());
  await sleep(400);
  const errsShown = await page.evaluate(() =>
    [...document.querySelectorAll('[data-error-for]')].filter((e) => !e.classList.contains('hidden')).length
  );
  console.log(`  empty submit shows ${errsShown} validation errors ${errsShown >= 5 ? 'ok' : '<-- FAILED'}`);
  if (errsShown < 5) problems++;

  await page.type('#name', 'Sarah Nambiconi');
  await page.type('#email', 'sarah@example.com');
  await page.type('#phone', '+256700111222');
  await page.select('#service', 'General Consultation');
  await page.$eval('#date', (el) => { el.value = new Date(Date.now() + 864e5).toISOString().slice(0, 10); el.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.evaluate(() => document.querySelector('#consent').click());
  await page.evaluate(() => document.querySelector('#submitBtn').click());
  await sleep(2200);
  const successVisible = await page.evaluate(() => !document.querySelector('#formSuccess').classList.contains('hidden'));
  console.log(`  valid submit shows success: ${successVisible ? 'ok' : '<-- FAILED'}`);
  if (!successVisible) problems++;
  await page.screenshot({ path: path.join(OUT, 'form-success.png') });
  await page.close();

  await browser.close();
  console.log(problems ? `\nDONE WITH ${problems} PROBLEM(S)\n` : '\nALL CHECKS PASSED\n');
  process.exit(problems ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });