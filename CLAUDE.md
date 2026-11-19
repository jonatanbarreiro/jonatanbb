# CLAUDE.md —jonatanbb.xyz

This repo builds **jonatanbb.xyz**, Jonatan's portfolio: a small static index page
whose nodes link out to the sites and projects he makes. The CV site that used to be
the whole of jonatanbb.xyz is now one of those nodes, served at `/cv/` and kept,
history and all, in `cvsite/`. Work is AI-assisted but hand-driven: Jonatan writes a
deliberate prompt, you carry it out.


## Map

- `CLAUDE.md` —this file; the repo's workflow and conventions.
- `README.md` —the repo's public face; short.
- `milestones.md` —the milestone checklist of jonatanbb.xyz, whatever its current
  form, one section per version; Jonatan's to maintain (see *The slopshield*).
- `terminology.md` —the words coined for the site's parts; Jonatan's to maintain too.
- `index/` —the index site's source, deployable as it stands (`index.html`,
  `styles.css`, `main.js`, `assets/`, `robots.txt`, `sitemap.xml`). Built
  incrementally; git holds its history.
- `gallery/` —the shots of every iteration (see *Gallery*), continuing the CV
  site's: through iteration 26 a single shot, then a day & night
  pair per iteration, `iterationNNNW.png` / `iterationNNNB.png`, plus `unsourced/`
  for captures that predate its kept source. It stays out of `index/` so that nothing
  but the site gets deployed.
- `prompts/` —full session logs, `sessionNNNN.log`, every turn verbatim.
- `cvsite/` —the CV site: its README (the making-of), `sources/` with the iteration
  chain and `current/`, and its asset store `assets/`, which also hosts the CV build
  (see *The CV site*).


## Sessions and `prompts/`

A new session begins whenever Jonatan starts a fresh conversation here.

- **First prompt of a session:** after reading this `CLAUDE.md`, read the
  `README.md`. Then open a new `prompts/sessionNNNN.log` with the next unused
  4-digit counter.
- **Logging a turn:**
  1. `Jonatan on YYYY-MM-DD at ~HH:MM:` + the **full prompt, verbatim**.
  2. One blank line.
  3. `Claude <model> on YYYY-MM-DD at ~HH:MM:` + the **full answer, verbatim**,
     where `<model>` is whichever model actually produced that turn —a session may
     be shared across models, so label each turn accurately.
  Two blank lines between turns; append every later turn of the session to the same
  file. Times are approximate, the date reliable. Log the prompt the moment it
  arrives, before any work on it, and the answer right before submitting it.
- **Verbatim means transcribed, not retold.** Both halves of a turn go in exactly as
  written, markdown and all; never summarize or condense an answer for the log.
  Progress narration that merely announces the next tool call is left out.
- **The logs are append-only.** Do not read any file under `prompts/` unless Jonatan
  explicitly tells you to; only ever append the current turn.


## The site

`index/` is the live source: edit it in place, and let git keep the steps. It is
plain HTML, CSS and JavaScript, no framework. Served assets live in `index/assets/`.

On the server, the contents of `index/` go to the web root and the contents of
`cvsite/sources/current/` to `cv/` under it. Jonatan develops locally, browsing the
files straight from disk: a node carries its live address in `href` and its local
copy in `data-local` —relative to `index/`, sibling repos in the parent folder
included— and `main.js` swaps the latter in when the page is opened as a file.


## Iterations and versions

Development moves in **iterations**, numbered on from the CV site's last (29). An
iteration is a significant session —not one opened just to get oriented or to find
something in a hurry— and whether a session counts is Jonatan's call. When he wraps
one up, take its gallery shots.

Versions are declared on top: each is a git tag, `v0.N`, made on Jonatan's say, and a
section of `milestones.md` with the goal it works toward. Milestone items point to
the gallery shot of the iteration that brought them.


## Gallery

At an iteration's wrap-up, shoot every part of the site it changed in earnest,
numbered after it: the index as `gallery/iterationNNN.png`, the CV site as a day &
night pair, `iterationNNNW.png` / `iterationNNNB.png`, and the CV pdf's first page,
1024 px wide, as `iterationNNNCV.png`. Drive Playwright with system Chrome (`channel:
'chrome'`); Node, Chrome and the driver `playwright-core` are installed system-wide,
so reach it with `NODE_PATH=/usr/local/lib/node_modules`. The frame is fixed: viewport
1024×768, deviceScaleFactor 1, a `fullPage` screenshot from scrollY 0. The viewport
height is part of the frame, since the index fits itself to the screen. The index is
animated: take the shot at a moment when its dynamic elements show. Should the site
gain modes, settle with Jonatan how they are captured and record it here.


## The CV site

`cvsite/` holds the CV site as v0.1 left it. Its iteration chain stops at 29 and
stays set in stone; its internal layout is unchanged, so its relative symlinks and
scripts work as before. Changes to the site, touch-ups and iterations alike, are made
in place in `cvsite/sources/current/`, the deployable copy, with real files. Whenever
its content changes, bring the date in the footer's last-update stamp (the `updated`
key in its language files) up to that day.

The CV pdfs are built in `cvsite/assets/cv-build/`: two LaTeX sources
(`main-en.tex`, `main-es.tex`), the `build` script, and `art.js`, which regenerates
the vector artwork under `art/`. `./build current` compiles both languages and
installs them as `cvsite/sources/current/assets/jonatanbb-cv-en.pdf` /
`jonatanbb-cv-es.pdf`, the files the site serves. When Jonatan updates his CV he
edits the tex sources himself, or hands annotations over to be integrated.


## The site's text is Jonatan's

Every word a visitor reads —page copy, node labels, link text, the document
`<title>` and meta description, the CV site's language files and the CV sources— is
**deliberate and authored by Jonatan**. Do not write, reword, translate, condense or
"polish" it unless he explicitly asked. When a task only moves or restructures text,
carry the existing words across verbatim —structure is yours to shape, wording is
not.


## Less is More

Jonatan starts every session with a wiped cache, so you are amnesic by design and
the repo is the only memory. That makes it tempting to write down everything he
says, and that is exactly the failure mode to avoid. What he puts in a prompt —the
background, the reasoning, the asides— is there to make your work better. It is
**steering**, and steering is not content: it does not get deposited in the repo,
and it does not get recited back in your answer either.

So write down what the repo needs in order to function, answer with what the round
actually produced and what is left to decide, and let the session log hold the rest.
No files, folders or scaffolding before something real needs them.

Documents describe the project **as it is now**: when something changes, rewrite the
passage as if the new way had always been the way —no "previously", no deprecation
trails. Git holds the history. The session logs and `cvsite/` are the exception, and
there the past is the content.


## The slopshield

The README is yours to write. Every other documentation file —`CLAUDE.md` and
`milestones.md` among them— is Jonatan's, and shielded: no statement of your own
goes into one on your own initiative.

What you judge worth adding or cutting goes instead to the very end of the document
it belongs to, inside a `<!-- Slopshield -->` comment that keeps it off the rendered
page, as an unchecked checklist item, `- [ ]`, most important first. Create the
comment where a document has none, and delete it once it is empty. He reviews it when
he gets to it, and either removes an item or checks it. A checked item is one to
apply: look for them at the start of every turn, carry each out in the body of the
document, and take it off the list. Unchecked items are not yours to touch.

The shield guards the door, not the room. Once something is in the body, it is yours
to manage —reword, restructure, cut it down— as long as you do not change what it
says.

Feed the shields without being asked. When a prompt or the work brings up something
a shielded document is missing —a coined word `terminology.md` lacks— propose it
there in the same round. Be thoughtful about what you propose; a list he dreads
opening is worse than no system at all.


## README

The README serves a first visitor in a hurry, so value conciseness. The repo is
authoritative; the README is derived from it. Maintaining it is your
responsibility: before delivering any round in which the repo changed, update it
when the changes both touch its content and deserve its space.


## Git and commits

Versioning is Jonatan's: commits are how he marks development breakpoints. Use git
in **read mode only** (`status`, `diff`, `log`, `show`) —never stage, commit,
branch, revert, or otherwise alter history— except to make the commits he approves.

Once a session's work is done, he asks for its commits to be proposed. Set out each
commit, in order, as its message and the paths it takes, and wait. He checks the
breakdown and the messages, corrects them or gives the go; on the go, stage exactly
those paths, deletions and moves included, make the commits, and the tags he declares, and show them with
`git log --stat`. He pushes himself: never push, amend, branch or revert. These turns
are not logged in `prompts/`.

Split by purpose, not by file: a commit is a change he would want to find or undo on
its own, and every commit leaves the repo working. Most sessions make one to three
commits; the session's log goes with the last. A message is a brief description, not
a summary: one to three short sentences, with no subject line, prefixes or bullets;
past tense, no subject, from his side —"Designed and implemented…", "Had Claude
implement…". A commit carrying a substantial share of implementation or web-dev
work ends with `Co-Authored-By: <model>`, naming the model that did it —`Claude Opus
5.5`, say.


## Code and writing style

- Comments express *intent* —short, verb-led statements of what the next code does.
  Use them sparingly; if the code reads itself, leave it alone.
- One-line comments take no trailing period. Inline comments are lightly padded from
  the code, not so much that their line becomes unclear.
- No defensive coding when it hurts readability —prefer loud failure to silent
  guards, unless the guard genuinely reduces the site's security exposure.
- Never use a term of `terminology.md` in another sense, in code or in docs.
- Identifiers and file names say what they hold or do, never abbreviated into
  riddles.
- In docs, prose over bullets; bullets only when the content is genuinely a list.
  Bold sparingly. Markdown headings carry two blank lines above them, one below.
- **Em dashes, Jonatan's convention** —it governs everything written for the repo
  (site copy, docs, code comments), not chat answers. No space on the inside of what
  the dashes enclose: `word —enclosed— word`, and `word —enclosed. Next sentence`
  where a stop closes the aside instead of a second dash. A spaced em dash stays only
  where nothing is enclosed, as in a range: `2021 — 2025`.


## Housekeeping

- No clutter: edit in place, leave no backups or scratch files behind.
- Files made for Jonatan to see (a render, a mockup) go where he will look —the repo
  spot the work concerns, clearly named— never a scratch or temp dir.
- Installing software: prompts run with CC in auto mode, so install when a prompt
  genuinely needs it —system-wide, on `PATH`, under a standard prefix, never a
  private per-tool location. If it needs sudo, stop and give him the exact command
  to run.


<!-- Slopshield
- [ ] Map: list `bb.js` and `signet.js` among `index/`'s files, and
  `assets/equations/`, the equations cut from penquire's scans.
-->
