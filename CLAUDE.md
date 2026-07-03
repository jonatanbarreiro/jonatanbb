# CLAUDE.md — jonatanbb.xyz

This repo builds **jonatanbb.xyz**, a small static website, in the open. The site
grows through numbered **iterations** —each one a single development step of its
source— and the repo keeps the whole chain plus a screenshot of every step, so the
build can be read back like a living dex. Work is AI-assisted but hand-driven:
Jonatan writes a deliberate prompt, you carry it out.


## Map

- `CLAUDE.md` — this file; the repo's workflow and conventions.
- `README.md` — the website's README (its making-of); the repo's public face.
- `milestones.md` — the site's milestone checklist; Jonatan's to maintain. Leave it
  untouched unless he tells you to change it.
- `prompts/` — full session logs, `sessionNNNN.log`, every turn verbatim.
- `sources/iterationN/` — the site source at step N (`index.html`, `styles.css`,
  `main.js`, `assets/`), plus that iteration's `interaction_*` files.
- `assets/` — the single asset store for the whole site (see *Assets*).
- `gallery/` — one screenshot per iteration (`iterationNNN.png`, chronological),
  plus `unsourced/` (`iteration-N.png`) for captures that predate the kept source.
  A quick visual tour of the build. Generated at wrap-up at a fixed frame (see
  *Rendering & gallery captures*).


## Sessions and `prompts/`

A new session begins whenever Jonatan starts a fresh conversation here.

- **First prompt of a session:** after reading this `CLAUDE.md`, read the
  `README.md`. Then open a new `prompts/sessionNNNN.log` with the next unused
  4-digit counter.
- **Logging a turn** (same shape as the iteration interaction docs):
  1. `Jonatan on YYYY-MM-DD at ~HH:MM:` + the **full prompt, verbatim**.
  2. One blank line.
  3. `Claude <model> on YYYY-MM-DD at ~HH:MM:` + the **full answer**, where
     `<model>` is whichever model produced that turn — a single iteration may be
     shared across models (e.g. a mid-turn switch on hitting a usage limit), so
     label each turn with the model that actually answered it. (Logs through
     session 0017 read `Claude 4.8`; later ones name `Fable 5` / `Opus 4.8`.)
  Two blank lines between turns; append every later turn of the session to the same
  file. Times are approximate, the date reliable.
- **The logs are append-only.** Do not read any file under `prompts/` unless Jonatan
  explicitly tells you to; only ever append the current turn.


## Iteration workflow (the site source)

Source prompts are recognizable — they are about the actual website (its appearance,
behavior, or contents). An iteration may run across several turns.

- **Start a new iteration only when Jonatan explicitly says to.** Then:
  1. Copy the highest-numbered `sources/iterationN/` to `iteration{N+1}/`.
  2. Remove every `interaction_*` file from the new copy (asset symlinks stay).
  3. Work the new iteration's source per the prompt, turn after turn.
- **Otherwise, build on the current (highest) iteration** — work its source per the
  prompt, turn after turn.
- **Wrap up an iteration when Jonatan calls for it to end** — *close*, *finish*,
  *wrap up*, or any plain equivalent, wherever it sits in the prompt and even when
  paired with work to do first ("do X to close iteration N" means: do X, then wrap
  up). Don't hold out for a more explicit phrasing or a closing imperative — that
  call *is* the go-ahead: wrap up right then, do not pause to make him verify.
  Wrapping up is exactly three things, after the source work is done:
  1. **Save the files used.** Every file Jonatan attached during the iteration is
     *moved* into the iteration folder as
     `interaction_<yyyy>_<mm>_<dd>_<keyword>.<ext>` — moved, not copied, so no
     clutter is left behind wherever he handed it to you.
  2. **Write the whole exchange.** Create `interaction_<yyyy>_<mm>_<dd>.md` in the
     iteration folder holding the iteration's *entire* exchange — every turn in
     order, each prompt and final answer recorded **verbatim**, in the same labeled
     shape as the session log.
  3. **Snapshot the site.** Render `gallery/iterationNNN.png` at the same frame as
     the existing gallery shots (see *Rendering & gallery captures*). The point
     scatter is RNG-driven by design — do not stage or chase a particular
     arrangement; only the frame must match.

If a past wrap-up's gallery shot is somehow missing, generate it before copying for
a new iteration.

Notes:
- A source turn is recorded in **both** the session log and the iteration's
  interaction md.
- **No intermediate bookkeeping.** Only the finished source and the interaction
  files live in an iteration — never copies of in-progress source. The previous
  iteration's source is the clean slate that, together with the interaction files,
  pins down the step.
- If Jonatan needs to hand you a file, he will say where to find it in the prompt.
  Screenshots he hands you default to `~/Imágenes/Capturas de pantalla`.


## The site's text is Jonatan's

The website's **text content** — every word a visitor reads: the page copy, the
section headings, the hero lede, link and button text, the document `<title>` and
meta description, and the language files in `assets/content.*.js` — is **deliberate
and authored by Jonatan**. Do not write, reword, translate, condense, "polish", or
otherwise alter it unless he **explicitly asked** you to. When a task only moves or
restructures text (externalizing it, re-keying it, changing the markup around it),
carry the existing words across **verbatim** — structure is yours to shape, wording
is not.


## Rendering & gallery captures

Drive Playwright with system Chrome (channel: 'chrome') to render the site and
capture gallery shots. Node, Chrome and the driver are all installed system-wide
and on `PATH`; the driver is `playwright-core` under the global module dir, so
reach it with `NODE_PATH=/usr/local/lib/node_modules`. Gallery shots are **full-page
long screenshots**: viewport width 1024, deviceScaleFactor 1, `fullPage` from scrollY 0
(the fixed logo renders once at the top — no stitching, no duplication). Iterations that
carry the ignition pulse are captured mid-pulse (~2.25s after load) so the wave shows.


## Assets

`assets/` is the site's one true asset store; inside each iteration,
`assets/<name>` is a **relative symlink** (`../../../assets/<target>`) to a real
file there. This kills cross-iteration duplication.

- Identity is by **content, not filename**. When an iteration introduces an asset
  whose content is not in the store yet, move it in and symlink; otherwise symlink
  to the copy already there and drop the duplicate.
- When a filename recurs with **different content** (e.g. the logo evolving), the
  store keeps each distinct content under its own name: the first occurrence keeps
  the plain name, later ones take an `-iN` suffix for the iteration that introduced
  them (e.g. `bb.svg`, `bb-i2.svg`, `bb-i3.svg`). The symlink inside the iteration
  always keeps the name the source references.


## Git

Versioning is Jonatan's: commits are how he marks development breakpoints. Use git
in **read mode only** (`status`, `diff`, `log`, `show`) — never stage, commit,
branch, revert, or otherwise alter history.


## Housekeeping

- Iteration folders are a deliberate historical archive — *not* legacy to tidy or
  purge.
- Keep the repo, and particularly the live iteration, clean: edit in place, no
  backups or scratch files, no intermediate source copies.
- **Files made for Jonatan to see** (a render, a mockup, a contact sheet) go straight
  into the live iteration folder, named like an interaction file — never a scratch or
  temp dir he'd have to go hunting in.
- **Installing software.** Iteration prompts run with CC in auto mode, so you may
  install software when a prompt genuinely needs it — no need to ask first. But
  install it **system-wide** (on `PATH`, under a standard prefix), never into a
  private per-tool location only you would know to look in. If a system-wide install
  needs sudo or otherwise can't be done from here, stop and tell Jonatan the exact
  command to run it himself.


## Code style (site source)

- Comments express *intent* — short, verb-led statements of what the next code
  does. Use them sparingly; if the code reads itself, leave it alone.
- One-line comments take no trailing period. Inline comments are lightly padded
  from the code, not so much that their line becomes unclear.
- No defensive coding when it hurts readability — prefer loud failure to silent
  guards, unless the guard genuinely reduces the site's security exposure.
