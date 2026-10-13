/** Prints inner-SVG markup for a list of Lucide icons so they can be inlined. */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'node_modules', 'lucide-static', 'icons');
const names = process.argv.slice(2);

for (const n of names) {
  const f = path.join(dir, `${n}.svg`);
  if (!fs.existsSync(f)) { console.log(`MISSING ${n}`); continue; }
  let svg = fs.readFileSync(f, 'utf8');
  svg = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  svg = svg.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
  console.log(`${n}\t${svg}`);
}