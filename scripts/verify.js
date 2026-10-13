/**
 * Static sanity checks for the Fidelity Medic page.
 * Verifies referenced assets exist, the HTML parses without unclosed tags,
 * and that every section anchor resolves. Run: node scripts/verify.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let errors = 0;
let warnings = 0;
const fail = (m) => { errors++; console.log('  FAIL  ' + m); };
const warn = (m) => { warnings++; console.log('  WARN  ' + m); };
const ok =   (m) => console.log('  ok    ' + m);

/* ---------- 1. Local asset references ---------- */
console.log('\n[1] Asset references');
const refs = new Set();
const re = /(?:src|href)="(?!https?:|mailto:|tel:|#|data:)([^"]+)"/g;
let m;
while ((m = re.exec(html)) !== null) refs.add(m[1]);

for (const r of [...refs].sort()) {
  const p = path.join(ROOT, r.split('?')[0]);
  if (fs.existsSync(p)) ok(`${r}  (${(fs.statSync(p).size / 1024).toFixed(0)} KB)`);
  else fail(`missing asset: ${r}`);
}

/* ---------- 2. Tag balance ---------- */
console.log('\n[2] HTML tag balance');
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr','path','circle','rect','line','polygon','polyline','use','stop','ellipse']);
const stack = [];
let tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g;
let t, bad = 0;
while ((t = tagRe.exec(html)) !== null) {
  const [, closing, name, attrs, selfClose] = t;
  const n = name.toLowerCase();
  if (VOID.has(n) || selfClose === '/') continue;
  if (!closing) stack.push({ n, i: t.index });
  else {
    if (!stack.length) { fail(`stray </${name}>`); bad++; continue; }
    const top = stack.pop();
    if (top.n !== n) {
      fail(`mismatched: <${top.n}> at ${top.i} closed by </${name}> at ${t.index}`);
      bad++;
    }
  }
}
if (!bad && !stack.length) ok('all tags balanced');
else if (stack.length) fail(`${stack.length} unclosed tag(s): ${stack.slice(-5).map((s) => s.n).join(', ')}`);

/* ---------- 3. Anchor targets ---------- */
console.log('\n[3] In-page anchors');
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]));
const anchors = new Set([...html.matchAll(/href="#([^"]+)"/g)].map((x) => x[1]));
for (const a of [...anchors].sort()) {
  if (a === '' ) continue;
  ids.has(a) ? ok(`#${a}`) : fail(`no element with id="${a}"`);
}

/* ---------- 4. Nav / section coverage ---------- */
console.log('\n[4] Required content');
const required = {
  'hero headline': 'Compassionate Healthcare',
  'tagline': 'Where your life matters',
  'nav brand': 'Fidelity',
  'Book Appointment CTA': 'Book Appointment',
  'Explore Services CTA': 'Explore Services',
  'Schedule a Consultation': 'Schedule a Consultation',
  'About Us section': 'A trusted, community-first healthcare centre',
  'service: General': 'General Consultations',
  'service: Pediatrics': 'Family Health &amp; Pediatrics',
  'service: Diagnostics': 'Diagnostic &amp; Laboratory',
  'service: Emergency': 'Emergency &amp; Pharmacy',
  'testimonials': 'What our patients say',
  'form: name': 'id="name"',
  'form: email': 'id="email"',
  'form: date': 'id="date"',
  'form: message': 'id="message"',
  'community impact': 'Community Impact',
  'footer hours': 'Operating hours',
  'copyright': 'All rights reserved',
};
for (const [label, needle] of Object.entries(required)) {
  html.includes(needle) ? ok(label) : fail(`missing: ${label}`);
}

/* ---------- 5. Compiled CSS sanity ---------- */
console.log('\n[5] Compiled CSS');
const cssPath = path.join(ROOT, 'public', 'css', 'main.css');
if (!fs.existsSync(cssPath)) {
  fail('public/css/main.css not built — run `npm run build:css`');
} else {
  const css = fs.readFileSync(cssPath, 'utf8');
  for (const sel of ['.btn-primary', '.svc-card', '.nav-link', '.hero-slide', '.eyebrow', '.field', '.f-link', '.m-link', 'kenburns', 'fade-up']) {
    css.includes(sel) ? ok(sel) : warn(`CSS rule not found: ${sel}`);
  }
}

/* ---------- 6. JS sanity ---------- */
console.log('\n[6] JavaScript');
const js = fs.readFileSync(path.join(ROOT, 'public', 'js', 'main.js'), 'utf8');
new Function(js); // throws on a syntax error
ok('main.js parses without syntax errors');
for (const fn of ['initHeroSlider', 'initMobileNav', 'initScrollSpy', 'initReveal', 'initCounters', 'initForm', 'initMisc']) {
  js.includes(fn) ? ok(fn) : fail(`missing function: ${fn}`);
}

console.log(`\n${errors ? 'FAILED' : 'PASSED'} — ${errors} error(s), ${warnings} warning(s)\n`);
process.exit(errors ? 1 : 0);