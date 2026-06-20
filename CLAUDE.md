# CLAUDE.md — jonatanbb.xyz

jonatanbb.xyz is built across an evolving series of **versions**, each its own
paradigm. The repo is organized in three layers; keep them separate.


## The three layers

1. **Upper layer — the repo as a whole.** Tracks the advance of *versions* toward
   an evolving ideal for the site (so far: a public profile website to interface
   with the internet). Each version is a fresh paradigm — its own goals, intent,
   possibly its own tech. This is the long view. Jonatan works it in `desktop/`,
   and this `CLAUDE.md` is its voice.
2. **Middle layer — a version (currently `version0/`).** Advances and records
   *iterations* toward a finished source for that one version. Self-contained: it
   holds the version's `sources/`, its `assets/`, and its website `README.md`.
3. **Lower layer — iterations.** Each `version0/sources/iterationN/` is one
   development step of the site's source.

**Separation of concerns (important).** A version knows nothing of the layer above
it. `version0/README.md` is the README *of the website*, not of the repo — it must
read as if jonatanbb.xyz were simply a CV/profile site, with no hint that a
cross-version logic governs its evolution. The repo root's `README.md` is a
symlink to it, so the current version's website README is also the repo's public
face; the upper layer stays deliberately faceless for now. Don't leak upper-layer
concepts (versions, iterations, layers) down into any version's README, and don't
pull version-internal detail up into this file.

The current version, **version0**, is a personal static CV/profile site meant to
stand in for a LinkedIn that was never really useful to Jonatan. Its main goal is
to implement an attractive CV site that makes him visible on the job market.


## Map

- `CLAUDE.md` — this file; upper-layer workflow and conventions.
- `README.md` (root) — **symlink → `version0/README.md`**; the current version's
  website README. Belongs to the version; unaware of the upper layer.
- `desktop/` — Jonatan's upper-layer workspace (cross-version thinking, research).
  You are not allowed to read, modify delete or otherwise access to anything in
  the desktop unless explicitly told to. This helps Jonatan separate raw ideas and
  content currently being worked on from the actual repo, and it also helps
  separating the repo layers.
- `interactions/` — full session logs, `sessionNNNN.log`, every turn verbatim.
- `version0/` — the current version:
  - `version0/sources/iterationN/` — the site source at step N (`index.html`,
    `styles.css`, `main.js`, `assets/`), plus that iteration's `interaction_*`
    files.
  - `version0/assets/` — the version's single asset store (see *Assets*).
  - `version0/gallery/` — one screenshot per iteration (`iterationNNN.png`, in
    chronological order), plus `unsourced/` (`iteration-N.png`) for captures that
    predate the kept source. A quick visual tour of the build for repo viewers.
    Generated at wrap-up with the renderer at a fixed frame (see *Rendering &
    gallery captures*).
  - `version0/README.md` — the website README.


## Sessions and `interactions/`

- One session covers work within a **single layer**; Jonatan starts a new session
  when he switches layers.
- **First prompt of a session:** after reading this `CLAUDE.md`, read the current
  version's README (root `README.md`). Then open a new
  `interactions/sessionNNNN.log` with the next unused 4-digit counter.
- **Logging a turn** (same shape as the iteration interaction docs):
  1. `Jonatan on YYYY-MM-DD at ~HH:MM:` + the **full prompt, verbatim**.
  2. One blank line.
  3. `Claude 4.8 on YYYY-MM-DD at ~HH:MM:` + the **full answer**.
  Two blank lines between turns; append every later turn to the same file. Times
  are approximate, the date reliable.


## Iteration workflow (version source)

Source prompts are recognizable — they are about the actual website (its
appearance, behavior, or contents). In each, Jonatan states whether it is a **new
iteration** of the version or **builds on the current** one.

**New iteration:**
1. First, make sure the just-finished (current-highest) iteration has its
   `version0/gallery/iterationNNN.png` — if it's missing, generate it with the
   renderer at the fixed frame (see *Rendering & gallery captures*).
2. Copy the highest-numbered `version0/sources/iterationN/` to `iteration{N+1}/`.
3. Remove every `interaction_*` file from the new copy (asset symlinks stay).
4. Work the new iteration's source per the prompt.
5. When done, document the exchange in that iteration folder:
   - save any files Jonatan attached as
     `interaction_<yyyy>_<mm>_<dd>_<keyword>.<ext>`;
   - write `interaction_<yyyy>_<mm>_<dd>.md` recording the turn (his prompt + your
     final answer).

**Builds on the current iteration:**
1. Work the highest iteration's source per the prompt.
2. Append the turn to that iteration's `interaction_<yyyy>_<mm>_<dd>.md` (his
   prompt + your final answer; two blank lines between turns), and save any
   attached files with the same naming.

Notes:
- Most iterations are a single turn; later, polishing iterations may run several.
- A source turn is recorded in **both** the session log and the iteration's
  interaction md.
- **No intermediate bookkeeping.** Only the finished source and the interaction
  files live in an iteration — never copies of in-progress source. The previous
  iteration's source is the clean slate that, together with the interaction files,
  pins down the step; reconstructing that gap is the upper layer's concern.
- If Jonatan needs to hand you a file, he will say where to find it in the prompt.
- Interaction filenames use underscores (`interaction_2026_06_19.md`).


## Rendering & gallery captures

A headless browser is available for rendering the site (verifying changes, and
producing gallery shots). It was installed once and is reused across sessions, so
don't reinstall blindly — check first:

- **Browser:** Playwright's Chromium binary at
  `~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome` (not on `PATH`).
  Drive it with `--no-sandbox --disable-gpu`.
- **Driver:** `playwright-core` is installed globally under `~/.local/node`
  (Node at `~/.local/node/bin`); reach it with
  `NODE_PATH=~/.local/node/lib/node_modules`. Launch with
  `chromium.launch({ executablePath: <the binary above>, args:['--no-sandbox','--disable-gpu'] })`.
- Headless renders use the page's **true colours** — Jonatan's OS night-mode/
  warm-screen filter is a display-layer effect and never reaches a capture.

**Gallery frame (fixed).** Every `gallery/iterationNNN.png` so far is **1024×1006**,
the top of the page. So capture each at: viewport **1024×1006**, `deviceScaleFactor:
1`, `scrollY: 0`, a full-viewport screenshot (yields exactly 1024×1006). At
wrap-up, render the just-finished iteration this way and write its
`gallery/iterationNNN.png`.


## Assets

`version0/assets/` is the version's one true asset store; inside each iteration,
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


## Code style (site source)

- Comments express *intent* — short, verb-led statements of what the next code
  does. Use them sparingly; if the code reads itself, leave it alone.
- One-line comments take no trailing period. Inline comments are lightly padded
  from the code, not so much that their line becomes unclear.
- No defensive coding when it hurts readability — prefer loud failure to silent
  guards, unless the guard genuinely reduces the site's security exposure.
