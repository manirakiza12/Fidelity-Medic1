/**
 * Optimises the raw photos in /assets into web-ready WebP derivatives in /public/img.
 *
 * Rules the job table below follows:
 *  - Never upscale: `withoutEnlargement` keeps images at or below their native size.
 *  - Some sources have burned-in captions (e.g. the "Aguurudde" title card), so
 *    they are cropped to remove the text before export.
 *  - No photo is used twice within a section, and the low-resolution captures
 *    (360px tiktok stills) are deliberately excluded.
 *
 * Run with: npm run images
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'assets');
const OUT = path.join(__dirname, '..', 'public', 'img');

// `crop: [topFraction, bottomFraction]` trims those proportions off top/bottom.
const JOBS = [
  // ---- Hero slider (full-bleed landscape). Only the three high-resolution
  // ---- landscape sources are used; the fourth slide is a graphic slide.
  // img4.jpeg carries a burned-in "Aguurudde" title -> trim the top 27%.
  { src: 'img4.jpeg', out: 'hero-1', w: 2000, q: 74, crop: [0.27, 0] },
  { src: 'img2.jpeg', out: 'hero-2', w: 1860, q: 74 },
  { src: 'fidelity_uganda_7692112026553830674.webp', out: 'hero-3', w: 1440, q: 76 },

  // ---- About section: 1mg.jpeg (810x1080 portrait) cropped to 4:3 landscape,
  // ---- framing the health worker and the table of supplies.
  { src: '1mg.jpeg', out: 'about-1', w: 900, q: 80, crop: [0.27, 0.17] },

  // ---- Community impact gallery (small cards, near-native resolution).
  // Four distinct photographs - no photo repeats inside the grid.
  { src: 'img2.jpeg', out: 'impact-1', w: 1000, q: 76 },
  { src: 'img23.jpeg', out: 'impact-2', w: 715, q: 78 },
  { src: 'img4.jpeg', out: 'impact-3', w: 1400, q: 76, crop: [0.27, 0] },
  { src: 'imgd.webp', out: 'impact-4', w: 640, q: 78 },

  // ---- Brand
  { src: 'logo.jpeg', out: 'logo', w: 256, q: 92 },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let before = 0;
  let after = 0;

  for (const job of JOBS) {
    const input = path.join(SRC, job.src);
    if (!fs.existsSync(input)) {
      console.warn(`  ! skipped (missing): ${job.src}`);
      continue;
    }

    const output = path.join(OUT, `${job.out}.webp`);
    const srcSize = fs.statSync(input).size;

    let pipeline = sharp(input);

    if (job.crop) {
      const meta = await pipeline.metadata();
      const top = Math.round(meta.height * job.crop[0]);
      const bottom = Math.round(meta.height * job.crop[1]);
      const height = meta.height - top - bottom;
      if (height <= 0) throw new Error(`crop leaves no height for ${job.src}`);
      pipeline = pipeline.extract({ left: 0, top: top, width: meta.width, height: height });
    }

    await pipeline
      .resize({ width: job.w, withoutEnlargement: true })
      .toFormat('webp', { quality: job.q, effort: 6, smartSubsample: true })
      .toFile(output);

    const finalMeta = await sharp(output).metadata();
    const outSize = fs.statSync(output).size;
    before += srcSize;
    after += outSize;

    console.log(
      `  ✓ ${job.src.padEnd(50)} -> ${job.out.padEnd(10)} ` +
      `${String(finalMeta.width).padStart(4)}x${String(finalMeta.height).padEnd(4)} ` +
      `${(srcSize / 1024).toFixed(0).padStart(5)} KB -> ${(outSize / 1024).toFixed(0).padStart(4)} KB`
    );
  }

  console.log(
    `\n  Total: ${(before / 1024 / 1024).toFixed(2)} MB -> ${(after / 1024).toFixed(0)} KB ` +
    `(-${(100 - (after / before) * 100).toFixed(0)}%)\n`
  );
})();