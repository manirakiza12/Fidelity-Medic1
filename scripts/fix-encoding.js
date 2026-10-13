/**
 * Repairs UTF-8 text that was corrupted by a lossy Windows-1252 round-trip.
 * Only repairs byte runs that decode to valid UTF-8, so legitimate non-ASCII
 * characters (and any stray U+FFFD) are left untouched.
 *
 * Run: node scripts/fix-encoding.js <file> [more files...]
 */
const fs = require('fs');

// Reverse map for the Windows-1252 range that carries the C1 / punctuation block.
const CP1252_HIGH = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
};

function charToByte(cp) {
  // Windows-1252 high half decodes to Latin-1 code points, except where the
  // CP1252_HIGH table below remaps a byte to a typographic character.
  if (Object.prototype.hasOwnProperty.call(CP1252_HIGH, cp)) return CP1252_HIGH[cp];
  // WHATWG windows-1252 keeps the remaining C1 controls (0x81, 0x8D, 0x8F,
  // 0x90, 0x9D) as themselves, and maps 0xA0-0xFF straight through.
  if (cp >= 0x80 && cp <= 0xFF) return cp;
  return -1;
}

/** Attempts to re-decode a run of "high" characters as cp1252 bytes -> UTF-8. */
function repairRun(run) {
  const bytes = [];
  for (const ch of run) {
    const cp = ch.codePointAt(0);
    const b = charToByte(cp);
    if (b < 0) return null;                       // unmappable, bail out
    bytes.push(b);
  }
  const decoded = Buffer.from(bytes).toString('utf8');
  // Round-trip guard: only accept if it is valid, lossless UTF-8.
  if (Buffer.from(decoded, 'utf8').equals(Buffer.from(bytes))) return decoded;
  return null;
}

function repairFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  let out = '';
  let repairs = 0;

  for (let i = 0; i < src.length;) {
    const cp = src.codePointAt(i);
    if (cp <= 0x7f) { out += src[i]; i += 1; continue; }

    // Collect the whole run of non-ASCII characters.
    let j = i;
    let run = '';
    while (j < src.length && src.codePointAt(j) > 0x7f) {
      const c = src.codePointAt(j);
      run += String.fromCodePoint(c);
      j += c > 0xFFFF ? 2 : 1;
    }

    const fixed = repairRun(run);
    if (fixed !== null && fixed !== run) { out += fixed; repairs++; }
    else out += run;
    i = j;
  }

  if (repairs > 0) {
    fs.writeFileSync(file, out, 'utf8');
    console.log(`  ${file}: repaired ${repairs} run(s)`);
  } else {
    console.log(`  ${file}: nothing to repair`);
  }
}

process.argv.slice(2).forEach(repairFile);