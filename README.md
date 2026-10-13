# Fidelity Medic — Uganda

**Where your life matters**

A modern, responsive single-page website demo for Fidelity Medic, a community-focused
healthcare provider in Uganda. Built with Tailwind CSS and vanilla JavaScript — no
framework runtime, no build step required to view it.

---

## Quick start

```bash
npm install          # install Tailwind, Sharp, Puppeteer
npm run build        # optimise images + compile CSS
npm run serve        # http://localhost:3000
```

For active development:

```bash
npm run dev          # Tailwind in --watch mode
```

Checks (require `npm run serve` running in another terminal):

```bash
npm run verify       # static checks: assets, tags, anchors, content, CSS, JS
npm run shoot        # headless render + interaction tests, 3 viewports
npm run check        # both
```

---

## Project structure

```
index.html                     Single page (all sections)
tailwind.config.js             Brand colours, fonts, shadows, animations
src/input.css                  Tailwind entry + component classes
public/
  css/main.css                 Compiled stylesheet (generated)
  js/main.js                   Slider, nav, scrollspy, reveal, counters, form
  img/                         Optimised WebP derivatives (generated)
assets/                        Original source photography
scripts/
  optimize-images.js           Sharp pipeline: assets/ -> public/img/
  verify.js                    Static checks (assets, tags, anchors, content)
  shoot.js                     Headless render + interaction tests
  shoot-slides.js              Per-slide screenshots at any viewport
  icons.js                     Prints Lucide icon markup
  fix-encoding.js              Repairs UTF-8 damaged by a cp1252 round-trip
shots/                         Screenshots from the test runs (git-ignored)
```

---

## Brand system

| Token | Value | Use |
| --- | --- | --- |
| `brand-600` | `#0033CC` | Medical Royal Blue — primary, links, CTAs |
| `accent-500` | `#FF1A1A` | Energetic Caring Red — accents, urgency, emergencies |
| `mist` | `#F8F9FA` | Soft white section backgrounds |
| `ink` | `#212529` | Dark charcoal typography |

Full 50–950 scales are defined for `brand` and `accent` in `tailwind.config.js`.

Typography: **Plus Jakarta Sans** (display / headings) + **Inter** (body),
with a system-font fallback stack.

---

## Sections

1. **Utility bar** — phone, email, live 24/7 emergency indicator
2. **Sticky navbar** — logo, section links, scroll-progress bar, "Book Appointment" CTA, mobile drawer
3. **Hero slider** — 4 slides, Ken Burns background, autoplay with progress bar, arrows, numbered dots, swipe, keyboard, pause on hover
4. **Trust bar** — animated counters (years, patients, coverage, districts)
5. **About Us** — community-first positioning, focus points (reliability / accessibility / standards)
6. **Our Services** — 4 hover-effect cards + secondary service strip
7. **Community Impact** — NGO outreach section: programmes, impact stats, photo gallery
8. **Testimonials** — 3 patient review blocks + aggregate rating
9. **Appointment & Contact** — validated booking form + clinic info panel
10. **Footer** — navigation, services, contact, operating hours, social links

---

## Image pipeline

Source photos in `assets/` are resized and converted to WebP by
`scripts/optimize-images.js` using Sharp. Three rules are enforced by the job table:

1. **Never upscale** — `withoutEnlargement` keeps every output at or below native size.
2. **Crop out burned-in captions** — `img4.jpeg` carries an "Aguurudde" title card and
   `img5.webp` a "Happy Client" caption; both are trimmed away via `crop: [top, bottom]`.
3. **No duplicate photos in one section** — several source files turned out to be the
   same photograph (notably `imgd.webp`, `1mg.jpeg` and `fidelity_uganda_7677315228266171666.webp`),
   so only five distinct usable photographs exist. They are distributed across the page
   so no section ever shows the same image twice.

| Output | Source | Size | Used in |
| --- | --- | --- | --- |
| `hero-1.webp` | `img4.jpeg` (cropped) | 2000×822 | Hero slide 1 |
| `hero-2.webp` | `img2.jpeg` | 1860×1396 | Hero slide 2 |
| `hero-3.webp` | `fidelity_uganda_7692112026553830674.webp` | 1440×1080 | Hero slide 3 |
| `about-1.webp` | `1mg.jpeg` (4:3 crop) | 810×604 | About section |
| `impact-1.webp` | `img2.jpeg` | 1000×751 | Impact gallery |
| `impact-2.webp` | `img23.jpeg` | 715×319 | Impact gallery |
| `impact-3.webp` | `img4.jpeg` (cropped) | 1400×575 | Impact gallery |
| `impact-4.webp` | `imgd.webp` | 640×853 | Impact gallery |
| `logo.webp` | `logo.jpeg` | 256×256 | Navbar + footer |

Hero slide 4 is a **graphic slide** (gradient, dot texture, concentric rings) rather
than a photograph — the remaining source captures are portrait or below 810px and would
be visibly soft stretched across a 2000px hero.

Re-run with `npm run images`. Current total: **~865 KB** for all imagery
(down from ~2.0 MB of mixed JPEG/WebP sources, −58%).

---

## Notes before going live

The following are **placeholders** and should be replaced with real details:

- Phone numbers (`+256 700 123 456`, `+256 772 654 321`)
- Email address (`info@fidelitymedic.ug`)
- Clinic address (Plot 12 Kira Road, Ntinda, Kampala)
- Statistics (15 years, 12K patients, 6,500 reached, 120 camps, 28 districts)
- Testimonials and their attribution
- Social media URLs (currently `href="#"`)

The appointment form is **frontend-only**. `initForm()` in `public/js/main.js`
simulates the request with a `setTimeout` and then shows the success panel —
replace that block with a `fetch()` to your preferred endpoint or form service.

---

## Accessibility

- Semantic landmarks (`header`, `nav`, `main`, `section`, `footer`, `aside`)
- Skip-to-content link, and visible focus rings on keyboard navigation
- Slider exposed as a labelled carousel; inactive slides removed from the tab order
- `prefers-reduced-motion` disables autoplay progress, Ken Burns and reveals
- Colour contrast meets WCAG AA for body text and UI text
- Form fields have `<label>`s, inline validation messages and `aria-live` status

---

## Verification

`npm run verify` — static checks:

- every local `src`/`href` resolves to a real file
- HTML tags balance (custom tag-balance pass, SVG-aware)
- every `href="#..."` anchor has a matching `id`
- required copy and form fields are present
- compiled CSS contains the expected component rules
- `main.js` parses without syntax errors and defines every init function

`npm run shoot` — headless Chrome (via Puppeteer) at 1440/834/390:

- no horizontal overflow, no broken images
- hero is not collapsed; **hero copy never collides with the slider controls on any slide**
- slider advances via arrows (desktop/tablet) and dots (mobile); dot jump works
- mobile menu opens
- all counters animate and all 21 reveal elements fire after a scroll-through
- scroll-spy marks the correct nav link for all 5 sections
- appointment form: empty submit shows 6 validation errors; a valid submit shows the success panel

Screenshots land in `shots/`.

---