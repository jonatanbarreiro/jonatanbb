# jonatanbb.xyz

My personal site: a small, static CV / profile page —and a challenge I set myself
to build one from scratch.

The site itself is the profile; this README is the making-of.

## Why it exists

I am departing from a career in academia into industry. As a result, I don't have
a well-defined professional profile —which is probably why I never got any use
out of LinkedIn. So rather than relying on a profile there, I decided to build my
own: a clean, fast page to point people to, and a way to stay findable for work.

## The challenge

Take it from a bare `hello world` HTML file to something I am happy to ship — in a
couple of focused weeks, AI-assisted but hand-driven. A real part of the exercise
was the AI side itself: improving on precise prompt creation, and keeping an
AI-assisted workflow organized and accountable rather than letting it sprawl.

## How it is built

- A plain static site — HTML, CSS, and JavaScript, no framework. Fast, legible,
  and cheaply hosted on Cloudflare.
- Built in steps, in the open. Each step is an **iteration** — one self-contained
  unit of development idea — and the whole chain is kept under `sources/`, each
  step holding its full source **plus the verbatim record of the prompts and
  answers that produced it**. `gallery/` keeps a screenshot of the site at every
  step, and `prompts/` the full session logs, turn by turn. Together they read as
  a living dex: watch the site come together at a glance, then drop into any step
  to see exactly what changed, what was asked, and how it was carried out.
- What actually ships is `sources/current/` — the newest source, kept as the
  plain deployable folder while the numbered iterations stay set in stone.

## The lights

The page carries an interactive layer built from scratch, piece by geometric
piece: illuminating points scattered over the page as blue noise, a logo that
reads the light around it, and an ignition pulse that sweeps the page on load —
for a moment revealing the connections between the points. That last wink is
deliberate: my research years were spent understanding the underlying connections
inside point clouds.

## The CV

The site also serves a print CV, in English and Spanish, and this repo builds it:
the LaTeX sources live in `assets/` (`main-en.tex`, `main-es.tex`) with a single
`cv-build` command for both. Same palette as the site — ink, gold, light — none
of the lighting.

## What it took

End to end, a project like this meant getting hands-on at once with front-end and
web-design basics, prompt-writing and AI-workflow management, everyday git and vim,
a little print design in LaTeX, and the essentials of hosting and deploying a
static site.

## Milestones

The site is built toward one goal, broken into checkable milestones — what's already
live and what's still ahead. The running list is in **[milestones.md](milestones.md)**;
each item points to the iteration where it first appeared. When every box is checked,
the site has reached what it was built for.
