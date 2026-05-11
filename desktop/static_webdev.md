# Static Sites: A Quick Reference

Two angles compacted from the source: features for a CV/portfolio, and modern capabilities that make a static site feel anything but. Plus practical advice and a tools cheat sheet.

## What "static" actually means today

A static site is one where HTML/CSS/JS files are pre-built and served as-is by a CDN — no server-side code runs per request. "Static" is no longer a ceiling: the heavy lifting now happens at **build time** (during deployment) or **in the browser** (via JS, APIs, storage). That shift is what makes the techniques below possible.

## Features that punch above their weight (CV/portfolio angle)

- **Print-friendly + one-click download.** Wire a "Print/Save PDF" button to `window.print()` and write a dedicated `@media print { ... }` stylesheet that strips nav, tightens spacing, and adjusts fonts. The same page becomes a clean resume PDF.
- **Client-side filters & tags.** A small JS snippet lets visitors filter projects/experience by tag (e.g., "frontend", "research", "open source"). No backend, no CMS — just data attributes and a few lines of JS. Variations: a "Full CV" vs. "Highlights" toggle, a timeline view, a skill heatmap.
- **Pre-filled contact link.** A `mailto:` link with `?subject=...&body=...` opens the visitor's mail client with the message half-written. Trivial to add, feels polished.
- **Multiple CV variants.** Host a one-pager, a detailed CV, and a portfolio-focused version side by side with clear labels. Recruiters have different constraints; choice beats compromise.
- **JSON-LD structured data.** A small `<script type="application/ld+json">` block describing you as a `Person` helps search engines and link-preview crawlers understand the page.

## What modern static sites can actually do

### Interactivity — app-like, without a server
- Modern JS frameworks (React, Vue, Svelte, Solid) or **island architectures** (Astro) ship interactivity only where it's needed.
- Common wins: client-side routing without full reloads, modal galleries, animated project cards, filter/sort UIs, theme switcher saved to `localStorage`.
- Static site generators (Astro, Eleventy, Hugo, Next.js static export) pre-build pages from Markdown/JSON/YAML → fast first paint, great SEO.

### Dynamic-feeling content via public APIs
- Pull live data in the browser: GitHub activity, RSS feeds, Bluesky/Mastodon posts, Spotify "now playing", Unsplash, Goodreads, weather.
- Pair with a headless CMS (Sanity, Contentful, Notion) if you want to edit content without redeploying.
- Watch out for rate limits and API outages — show skeleton states and graceful fallbacks.

### Personalization without login
- `localStorage` / `IndexedDB` for theme, layout prefs, last-viewed item.
- Time-of-day greetings from the visitor's clock; localized text via `navigator.language`.
- `prefers-color-scheme` and `prefers-reduced-motion` media queries respect OS-level preferences for free.

### Immersive visuals with native browser tech
- **WebGL/3D**: Three.js for hero scenes, cursor-reactive backgrounds.
- **Canvas/generative**: p5.js for sketches and visual experiments.
- **Animation libs**: GSAP for scroll-triggered sequences; Lottie for vector animations exported from After Effects/Figma.
- **Modern CSS** alone goes far: scroll-driven animations, `@property`, container queries, subgrid, and the View Transitions API for app-like page changes.

### Offline & installable (PWA)
- A service worker (Workbox makes it ~20 lines) caches assets for instant repeat visits and offline support.
- Add a web manifest and your site becomes installable on phones — feels like an app, isn't.

## Practical advice

- **One audience, one goal.** Decide who the site is for (a recruiter for role X, a client for service Y) and let everything else fall behind that. The top third of the homepage should land the message in ~10 seconds.
- **Content first, design second.** Write the copy in plain text before opening any editor.
- **Degrade gracefully.** Core content (CV info, contact) should be readable without JS. Treat JS as enhancement, not foundation.
- **Performance is part of the design.** AVIF/WebP images with `loading="lazy"`, code-split bundles, `font-display: swap`, variable fonts where possible.
- **Accessibility is non-negotiable.** Semantic HTML, sufficient color contrast, respect `prefers-reduced-motion`, keyboard navigation must work.
- **Maintenance-light hosting.** Push to GitHub → host on Pages/Netlify/Vercel/Cloudflare. Free tiers cover a personal site comfortably.
- **Don't forget the unglamorous bits.** Favicon, `<meta>` OG/Twitter tags for nice link previews, `sitemap.xml`, `robots.txt`.

## What to skip (unless you have a real reason)

- A frontend framework if it's a single static page — vanilla HTML/CSS/JS is often the right tool and ages better.
- Animation for animation's sake — heavy WebGL/parallax hurts low-end devices and accessibility.
- A custom CMS or database for content that changes twice a year.
- Auth, edge functions, server logic — none of it is needed for a CV site.

## Tools cheat sheet

| Category                | Picks                                                                 |
|-------------------------|-----------------------------------------------------------------------|
| Hosting (free, git push)| GitHub Pages, Netlify, Vercel, Cloudflare Pages                       |
| Static site generators  | Astro (islands), Eleventy (minimal), Hugo (fast), Next.js static export |
| Visuals & motion        | Three.js, GSAP, p5.js, Lottie                                         |
| Headless CMS (optional) | Sanity, Contentful, Notion API                                        |
| Service workers         | Workbox                                                               |
| Forms without a backend | Formspree, Netlify Forms, Web3Forms                                   |

## One-sentence takeaway

Pick a single audience and a single goal, build around them with the lightest stack that gets you there, and only reach for the fancy stuff (3D, scroll effects, service workers) when it actually serves the message.
