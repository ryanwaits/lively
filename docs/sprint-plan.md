# Sprint plan — Marketing site, Direction A (Playground / Cobalt)

**Scope:** `apps/web/src/app/(marketing)/` and the token layer it shares with `apps/web/src/app/docs/`.
**Out of scope:** `packages/*`, `apps/umbrel`, the six demo apps in `examples/`, the docs shell's *layout* (its tokens change, its structure does not).
**Approved specimen:** Direction A — Cobalt theme, Component Playground macrostructure, N13 inline ⌘K nav, Ft4 dense colophon footer.

---

## Locked decisions

| Axis | Decision |
| --- | --- |
| Macrostructure | Component Playground — preview-and-code blocks are the page's primary content |
| Theme | Cobalt — cool engineered near-white, one electric cobalt signal, code as the hero |
| Nav | N13 inline ⌘K search pill (working palette, not a decorative pill) |
| Footer | Ft4 dense typographic colophon |
| Type | Space Grotesk 500/600 display · Inter 400/500 body · JetBrains Mono code + labels |
| Paper / ink / accent | `oklch(98.5% 0.004 250)` / `oklch(24% 0.02 258)` / `oklch(58% 0.20 256)` |
| Demo strategy | **Scripted**, not embedded. Deterministic ghost-peer timelines. Real demos linked, not framed. |
| Live cursors | Kept and made real — page-wide visitor cursors, room `landing` |

---

## Findings that change scope

Four things turned up during scoping. Two of them shrink the work; two add to it.

### F1 — The marketing app is the only thing not pointed at the server

There **is** a production Lively server: `lively-ws.waits.dev`, a Docker web service on Render (Starter plan, auto-deploying from `ryanwaits/lively@main`, currently live at `7ac1ea5`). The six demos use it — captured from `todo.waits.dev`, the real connection is:

```
wss://lively-ws.waits.dev/rooms/todo-default?userId=…&displayName=…
```

The gap is narrower than it first looked, and it is only in `apps/web`: `NEXT_PUBLIC_LIVELY_URL` is unset on the *marketing* deployment, so `live-cursors.tsx:9` falls through to its `http://localhost:1999` default and ships that to visitors. The demos work; the landing page's cursors do not.

This is a one-line environment fix, not an infrastructure project. Task 0.1.

### F2 — The client does not trim its `serverUrl`

`packages/client/src/room.ts:83-85` normalises the URL with `.replace(/^http/, "ws")` and `.replace(/\/$/, "")` — scheme swap and trailing slash, but no whitespace trim. The demos' env var carries a trailing newline, so their live connections are actually opened against:

```
wss://lively-ws.waits.dev\n/rooms/todo-default?…
```

Browsers tolerate it and the demos work, which is why nobody has noticed. It is still a latent bug, and it is the exact rake we would step on setting a new env var in 0.1.

Out of the declared scope (`packages/*`), so it is logged rather than fixed here — but 0.1 must avoid the newline, and the one-character fix is noted in Open Questions.

### F3 — Embedding the demos does not work the way we hoped

All six demo hosts are framable (HTTP 200, no `X-Frame-Options`, no CSP `frame-ancestors`). But each one gates on an "Enter your name" modal before it opens a socket — verified on `collab.waits.dev` and `todo.waits.dev`. An iframe on the landing page would render a name form, not collaboration.

Scripted demos replace embedding, per the locked decision. The six real demos stay one click away, opening in a new tab.

### F4 — Dead code in the marketing tree

`install-tabs.tsx` exports `InstallTabs` and is imported by nothing. It is removed in Sprint 4 as part of the retirement pass.

---

## Definition of done

The page ships when all of these are true:

1. Every section in the approved specimen exists, in DOM order: nav → hero → playground → demo index → dark quickstart band → colophon footer.
2. `⌘K` / `Ctrl+K` opens a real command palette with focus management, arrow navigation, type-to-filter and Escape-to-close.
3. No fabricated numbers anywhere. Every figure traces to the repository or to a live measurement.
4. No re-drawn browser chrome. Code surfaces use a typographic frame (filename rule + status), never traffic-light dots.
5. Every colour and `font-family` in the marketing tree resolves through a token. No inline hex, no inline `oklch()`, no bare `font-family`.
6. Clean at 320 / 375 / 414 / 768 px: no horizontal scroll, no clickable text wrapping to two lines.
7. `prefers-reduced-motion: reduce` renders the page fully static and fully legible, including scripted demos.
8. The docs shell renders correctly on the new tokens with no structural change to `docs/layout.tsx`.
9. `bun run build` passes from a clean checkout.

---

## Validation baseline

This repo has **no test runner, linter, or CI for `apps/web`**. CI (`.github/workflows/release.yml`) only builds the Docker image on version tags. There is no `biome.json` and no ESLint config.

That means validation for this work is: `bun run build` (Next 16 type-checks and lints during build), plus explicit browser checks. Task 0.6 stands up the first test runner this app has ever had. Where a task below says *verify in browser*, it means `agent-browser` against `next dev` at the named viewport widths, not a manual eyeball.

---

# Sprint 0 — Ground truth

**Goal:** the existing page, unchanged in structure, renders in the Cobalt palette on the Cobalt type stack, with live cursors finally pointed at the server that has been running all along.

**Demo:** open `lively.waits.dev` in two browsers and see each other's cursors. The page still looks like the old page, but every colour is now an OKLCH token.

### 0.1 — Point the marketing app at the existing server

Set `NEXT_PUBLIC_LIVELY_URL=https://lively-ws.waits.dev` in the marketing app's production **and** preview environments — the same Render service the six demos already use. The client swaps `http` → `ws` itself (`room.ts:83`), so the `https://` form is correct and the room path is appended automatically.

**Enter the value with no trailing newline** — see F2. Paste carefully, then verify.

Also replace the silent `localhost` fallback at `live-cursors.tsx:8-9`. Falling back to a developer's own machine in a production bundle is how this went unnoticed for as long as it did; the fallback should be loud in development and absent in a production build.

- **Files:** `apps/web/src/app/(marketing)/components/live-cursors.tsx`
- **Validation:** `curl -s https://lively.waits.dev | grep -oE "wss?://[^\"]+"` returns `lively-ws.waits.dev`, not `localhost`. In the browser, the captured WebSocket URL has no whitespace: hook `window.WebSocket` before joining and assert `!/\s/.test(url)`. Two browsers on different networks see each other's cursors on the landing page.

### 0.2 — Replace the hex palette with Cobalt OKLCH tokens

Rewrite the `@theme` block in `globals.css`. Keep the existing token *names* where they map cleanly so the docs shell keeps working (`--color-body` → paper, `--color-text` → ink, `--color-border` → rule), and add the Cobalt-specific tokens the specimen needs: `--color-graphite`, `--color-graphite-2`, `--color-rule-2`, `--color-accent-ink`, `--color-focus`.

Delete `--color-primary: #3b82f6` in favour of `--color-accent: oklch(58% 0.20 256)` and update the ~9 call sites.

- **Files:** `apps/web/src/app/globals.css`, plus `bg-primary` / `text-primary` / `border-primary` call sites in nav, footer, docs layout, examples.
- **Validation:** `grep -rnE "#[0-9a-fA-F]{3,8}" apps/web/src/` returns nothing. `bun run build` passes. Docs pages render with no unstyled or invisible text.

### 0.3 — Swap Manrope for Inter

Cobalt pairs Space Grotesk display with Inter body. Space Grotesk and JetBrains Mono stay exactly as they are.

- **Files:** `apps/web/src/app/layout.tsx` (lines 2, 10–13, 49), `globals.css` `--font-body`.
- **Validation:** DevTools computed style on a body paragraph reports Inter. No `next/font` warnings during build. No layout shift on reload (`next/font` self-hosts, so CLS should stay at 0).

### 0.4 — Emit `tokens.css` and the Hallmark stamp

Write `apps/web/tokens.css` containing every `--color-*`, `--font-*`, `--space-*`, `--text-*`, `--ease-*`, `--dur-*`, `--radius-*` token in the build. Add the Hallmark provenance stamp as the first line of `globals.css`. Create `.hallmark/log.json` with this build's entry.

- **Files:** `apps/web/tokens.css` (new), `apps/web/src/app/globals.css`, `.hallmark/log.json` (new)
- **Validation:** `head -1 apps/web/src/app/globals.css` shows `/* Hallmark · genre: modern-minimal · macrostructure: Component Playground · theme: Cobalt · nav: N13 · footer: Ft4 */`. `.hallmark/log.json` parses as JSON.

### 0.5 — Add the motion and spacing token layer

The specimen depends on named easings and durations that do not exist yet: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-in`, `--ease-in-out`, `--dur-micro: 120ms`, `--dur-short: 220ms`, `--dur-long: 420ms`, and the six-level z-index scale.

Also gate the existing `html { scroll-behavior: smooth }` at `globals.css:34-36` behind `prefers-reduced-motion: no-preference`. It is currently unconditional, which is a reduced-motion violation the page inherits before we add a single animation.

- **Files:** `apps/web/src/app/globals.css`
- **Validation:** `grep -c "ease-out\|dur-short" apps/web/src/app/globals.css` > 0. No component uses a raw `cubic-bezier()` or the browser-default `ease`. With reduced motion forced, anchor navigation jumps instantly.

### 0.6 — Test runner for `apps/web`

`apps/web` has no test infrastructure. Stand it up now rather than in Sprint 5, because Sprint 3.1's timeline tests are written before Sprint 5 runs — writing tests that cannot execute for two sprints is how they rot. Mirror the setup already working in `packages/ui`: `bun test` plus `happy-dom` and `@testing-library/react`.

- **Files:** `apps/web/package.json`, `apps/web/bunfig.toml` (new), one smoke test
- **Validation:** `bun test apps/web/` runs and passes with a trivial assertion.

### 0.7 — Metadata and OG image

`layout.tsx:20-39` still carries the old positioning ("Add real-time collaboration, presence, and state sync to your application in minutes") and a hyphen where a dash belongs. `public/og.png` is a render of the design being replaced.

- **Files:** `apps/web/src/app/layout.tsx`, `apps/web/public/og.png`
- **Validation:** title and description match the new hero voice and contain no banned marketing filler. OG image regenerated from the shipped Direction A hero at 1200×630. Preview renders correctly in a social-card validator.

---

# Sprint 1 — Nav and the command palette

**Goal:** the N13 nav ships, and ⌘K opens a real, keyboard-driven palette that navigates the docs.

**Demo:** press ⌘K anywhere on the site, type "storage", press Enter, land on `/docs/storage`. Do the whole thing without a mouse.

### 1.1 — Build the docs search index

A typed array of every docs route with title, section and keywords, derived from the `NAV` constant already in `docs/layout.tsx:7-24`. Export it from a shared module so the sidebar and the palette cannot drift apart.

- **Files:** `apps/web/src/app/docs/nav-config.ts` (new); `docs/layout.tsx` refactored to import it.
- **Validation:** docs sidebar renders identically before and after (screenshot diff). Index covers all 6 existing docs routes.

### 1.2 — Nav shell (N13)

Flush full-width bar, single hairline bottom border, blur on scroll. Wordmark left; centred search pill; `Docs` link and one solid cobalt `Quick start` button right. 6px radius on the button, never a pill.

- **Files:** `apps/web/src/app/(marketing)/components/nav.tsx` (rewrite)
- **Validation:** at 320px the pill collapses to a search icon and no label wraps. Verify with the two-line audit: for each affordance, `Range.getClientRects()` groups to a single `top` value.

### 1.3 — Command palette dialog

`role="dialog"`, `aria-modal="true"`, opens on click **and** ⌘K/Ctrl+K, closes on Escape and backdrop click, traps focus, restores focus to the trigger on close, locks body scroll. ↑/↓ move the active row, Enter navigates. Type-to-filter against the index from 1.1.

Motion: 240ms scale-and-rise on open, gated behind `prefers-reduced-motion: no-preference`. The focus ring never animates.

- **Files:** `apps/web/src/app/(marketing)/components/command-palette.tsx` (new)
- **Validation:** keyboard-only run-through of open → filter → arrow → enter → land. Escape closes and focus returns to the pill. With reduced motion forced, the panel appears instantly and is fully usable. Axe reports no violations on the open dialog.

### 1.4 — Mobile palette sheet

Below the nav's collapse breakpoint the palette becomes a full-height sheet.

- **Files:** `command-palette.tsx`
- **Validation:** at 375px the sheet fills the viewport, the input is focused on open, and the on-screen keyboard does not push the results list out of view.

---

# Sprint 2 — The hero

**Goal:** the above-the-fold matches the specimen exactly.

**Demo:** load the page. Title and lede left, graphite code card right, one line types itself in once, install command copies on click.

### 2.1 — Hero layout

Two-column asymmetric grid (`0.92fr / 1.08fr`), left-biased, never centred. Headline `Multiplayer in eight lines.` at `clamp(2rem, 4.2vw + 0.5rem, 3.1rem)`, weight 600, tracking `-0.035em`. Lede names the real numbers: 41 React hooks, one WebSocket, self-hosted.

- **Files:** `apps/web/src/app/(marketing)/components/hero.tsx` (rewrite)
- **Validation:** headline is 27 characters — inside the 21–50 char bracket, so full display size is correct. No wrap past two lines at 414px. Section collapses to one column below 48rem.

### 2.2 — Code card with a typographic frame

Dark graphite card, 10px radius, hairline border, `0 1px 2px` lift and nothing more. Header row is filename + status chip separated by a hairline rule. **No traffic-light dots** — this is the specific tell being removed from `api-section.tsx:214-216`.

The status chip shows real room occupancy from `useOthers()` when the socket is connected, and a neutral `offline` state when it is not. It must never display a fabricated peer count.

- **Files:** `apps/web/src/app/(marketing)/components/code-card.tsx` (new)
- **Validation:** `grep -rn "rounded-full.*bg-red\|traffic" apps/web/src/app/\(marketing\)/` returns nothing. With the WS server stopped, the chip reads `offline` rather than a number.

### 2.3 — Syntax token styling

Cobalt for keywords and methods, a light cool tone for strings, muted for punctuation and comments. All four as tokens.

- **Files:** `globals.css`, `code-card.tsx`
- **Validation:** contrast of every syntax token against `--color-graphite` is ≥ 4.5:1. Check each with a contrast calculator, not by eye.

### 2.4 — Install strip with copy

Bordered row, mono command, `Copy` affordance. Silent success — the label swaps to `Copied` for 1.5s. No toast.

- **Files:** `apps/web/src/app/(marketing)/components/copy-install.tsx` (rewrite of the existing component)
- **Validation:** clicking writes `bun add @waits/lively-react` to the clipboard. Keyboard-activatable. Announces via `aria-live="polite"`. The command string matches the real published package name.

### 2.5 — One-shot hero type-in

A single line of the code card types in once on first paint, then goes static. Not a loop.

- **Files:** `code-card.tsx`
- **Validation:** the animation runs exactly once per page load. Under `prefers-reduced-motion: reduce` the line renders complete and no animation runs. No layout shift while typing (reserve the line's height).

---

# Sprint 3 — The scripted demo engine

**Goal:** the playground blocks come alive on their own — a ghost peer moves, types, checks and deletes — without depending on demo uptime or a real second visitor.

**Demo:** scroll to the playground. A cursor labelled with a peer name glides in, adds a todo, checks it off, deletes it, and stops. A `Replay` control re-runs it.

This is the sprint that carries the "playful" half of the brief. Budget accordingly.

### 3.1 — Timeline runtime

A small declarative engine: a script is an array of `{ at: ms, action }` steps. The runtime plays a script **once** when its block scrolls into view, then stops and reveals a `Replay` control.

Hard requirements:
- Plays once, not on a loop. An infinite ambient animation pulls the eye and never lets go.
- `IntersectionObserver` starts it; nothing runs off-screen.
- Pauses on `document.visibilitychange` (background tab burns no frames).
- Animates `transform` and `opacity` only.
- Under `prefers-reduced-motion: reduce`, the script does not play — the block renders its **final state** immediately, and the `Replay` control is hidden.

- **Files:** `apps/web/src/app/(marketing)/lib/timeline.ts` (new)
- **Validation:** unit tests (`bun test`) covering: script completes in expected order; a script paused mid-run resumes at the right step; reduced-motion returns final state without scheduling timers; observer disconnects on unmount (no leak). The runner is stood up in 0.6, so these run the day they are written.

### 3.2 — Ghost peer primitives

A `<GhostCursor>` that moves along a path with the correct easing, and a `<GhostAvatar>`. Peer names come from `generateFunName()` in `@waits/lively-ui` so the demo uses the product's own naming, but seeded so they are deterministic per block rather than random per render (avoids hydration mismatch).

- **Files:** `apps/web/src/app/(marketing)/components/ghost-peer.tsx` (new)
- **Validation:** no React hydration warning in console. Same names on server and client. Cursor motion uses `transform`, confirmed via DevTools paint flashing.

### 3.3 — Scripted block: live cursors

Two ghost peers move across a shared canvas. Sits beside the real `useOthers()` / `useMyPresence()` snippet.

- **Files:** `apps/web/src/app/(marketing)/components/demos/cursors-demo.tsx` (new)
- **Validation:** code shown matches a real working call signature — cross-check against `packages/react` exports. Motion stops when scrolled away.

### 3.4 — Scripted block: shared todo list

The block the brief asked for: a ghost peer adds a task, edits its text, checks it off, then deletes it. Paired with a real `useStorage` / `useMutation` snippet.

- **Files:** `apps/web/src/app/(marketing)/components/demos/todo-demo.tsx` (new)
- **Validation:** every mutation shown in the preview corresponds to an operation the snippet beside it would actually perform. No step in the animation is impossible with the real API.

### 3.5 — Honesty labelling

Scripted panes carry a quiet, permanent affordance identifying them as a demo replay — not a live session — and each links to its real counterpart. The page's **real** visitor cursors (Sprint 0) stay unlabelled because they are genuinely live.

- **Files:** the demo components; a shared `<DemoFrame>` wrapper.
- **Validation:** no scripted pane displays a peer count, a room occupancy figure, or any presence claim that is not true. Read every string in the playground and confirm.

### 3.6 — Playground block chrome

The `<DemoFrame>` itself: two-column preview/code split, hairline border, filename bar, per-block `Copy`. Collapses to stacked at 48rem.

- **Files:** `apps/web/src/app/(marketing)/components/demo-frame.tsx` (new)
- **Validation:** grid tracks use `minmax(0, 1fr)`, never bare `1fr` — bare `1fr` on a track containing a code block pushes the layout past the viewport. Confirm no overflow at 320px.

---

# Sprint 4 — Remaining sections and retirement

**Goal:** the full page matches the specimen, and the components it replaced are gone.

**Demo:** the complete Direction A page, top to bottom, with nothing from the old design left in the tree.

### 4.1 — Demo index band

The six real demos — whiteboard, editor, markdown, blocks, todo, workflows — as a compact linked index below the playground. Not the old six-card grid with SVG animations; those animations are superseded by Sprint 3's scripted demos. A dense typographic index, in keeping with the macrostructure.

Each entry opens in a new tab (`target="_blank"`, `rel="noopener noreferrer"`) with a visible external-link affordance, so the reader keeps their place on the marketing page. This is the *real*, interactive counterpart to the scripted panes above it — the pairing is the point.

- **Files:** `apps/web/src/app/(marketing)/components/demo-index.tsx` (new)
- **Validation:** all six URLs return HTTP 200 in a link check. Every link opens in a new tab and carries `rel="noopener noreferrer"`. Link text is descriptive standalone (no "click here"). No card grid of three equal icon tiles.

### 4.2 — Dark quickstart band

The one graphite full-bleed section, giving the page its light → dark → light rhythm. Terminal-voice quickstart using the real CLI commands (`npx lively dev`, `npx lively rooms inspect`).

- **Files:** `apps/web/src/app/(marketing)/components/quickstart-band.tsx` (new)
- **Validation:** every command shown exists in `packages/cli`. Run each against a local server and confirm the output matches what the page claims.

### 4.3 — Ft4 dense colophon footer

One mono paragraph: version, the ten package names, the CRDT primitives, licence, source. Replaces the current CTA-plus-three-column footer.

- **Files:** `apps/web/src/app/(marketing)/components/footer.tsx` (rewrite)
- **Validation:** package names and version match `packages/*/package.json` exactly (all currently `0.1.1`). No four-column link grid, no social icon row.

### 4.4 — Page composition

`page.tsx` assembles the new section order. `LiveCursors` stays as the outer wrapper.

- **Files:** `apps/web/src/app/(marketing)/page.tsx`
- **Validation:** DOM order is nav → hero → playground → demo index → quickstart band → footer.

### 4.5 — Retire superseded components (**needs explicit sign-off**)

These files are deleted. Listing them here so the deletion is approved rather than assumed:

| File | Reason |
| --- | --- |
| `components/examples.tsx` | Six-card SVG grid superseded by 4.1 + Sprint 3 |
| `components/api-section.tsx` | Radio-tab code window superseded by the playground; also the source of the traffic-light chrome |
| `components/demo-window.tsx` | Exports `Stats`, whose `<30ms` figure is unsourced |
| `components/install-tabs.tsx` | Dead code — imported by nothing (F3) |

`hero.tsx`, `nav.tsx`, `footer.tsx` and `copy-install.tsx` are **rewritten in place**, not deleted. `live-cursors.tsx` is kept and fixed in 0.2.

- **Validation:** `bun run build` passes. `grep -rn "Stats\|ApiSection\|Examples\|InstallTabs" apps/web/src/` returns no imports.

### 4.6 — Remove the CSS these components leave behind

Deleting the components in 4.5 orphans a block of `globals.css`. Left in place it becomes the kind of dead weight nobody dares delete a year from now.

| Rule | Lines | Orphaned by |
| --- | --- | --- |
| `.bg-grid` | 51–58 | `hero.tsx` and `api-section.tsx` rewrites |
| `@keyframes cursorMove` | 61–67 | `examples.tsx`, old hero |
| `@keyframes blink` | 69–72 | `examples.tsx` |
| `@keyframes checkOff` | 74–78 | `examples.tsx` |
| `@keyframes flowPulse` | 80–83 | `examples.tsx` |
| `@keyframes blockSlide` | 85–88 | `examples.tsx` |
| `.hero-headline` media query | 91–95 | hero rewrite — also a desktop-first `max-width` query using `!important`, both banned |

Check each against the scripted-demo work first: 3.3 may want its own motion, but it should define it fresh rather than inherit a keyframe written for a different component.

- **Files:** `apps/web/src/app/globals.css`
- **Validation:** for each removed rule, `grep -rn "<rule-name>" apps/web/src/` returns nothing. Visual regression pass over the full page confirms no silent style loss.

---

# Sprint 5 — Hardening

**Goal:** the page is correct, fast and accessible, and the docs shell still looks like the same site.

**Demo:** a green check across the responsive matrix, the a11y pass, the perf budget and the slop-test gates.

### 5.1 — Responsive matrix

Verify at 320 / 375 / 414 / 768 / 1440 px: no horizontal scroll; no clickable text on two lines; every image-bearing grid track uses `minmax(0, 1fr)`; display headers carry `overflow-wrap: anywhere` and `min-width: 0`.

- **Validation:** scripted `agent-browser` pass asserting `documentElement.scrollWidth <= innerWidth` and single-line `getClientRects()` grouping for every affordance, at all five widths.

### 5.2 — Accessibility pass

Focus-visible rings at ≥3:1 that appear instantly and never animate. Dialog semantics on the palette. Reduced-motion honoured across type-in, palette and scripted demos. Colour contrast on every text-on-graphite pairing.

- **Validation:** axe-core clean on `/` and on `/` with the palette open. Full keyboard traversal of the page reaches every interactive element in a sensible order. Forced reduced-motion leaves the page fully legible and fully static.

### 5.3 — Performance budget

The hero code card is the LCP element. It must not be lazy-loaded. Scripted demos must not run before they are in view, and must not run at all in a background tab.

- **Validation:** Lighthouse on a production build — LCP under 2.0s on simulated 4G, CLS 0, no long tasks over 200ms during the playground scroll. Confirm zero timer activity in a backgrounded tab via the Performance panel.

### 5.4 — Docs shell parity

The docs layout is structurally untouched but inherits the new tokens. Confirm nothing broke: sidebar active state, mobile drawer, code blocks, the `v0.0.1` version label in the sidebar footer (which should become `v0.1.1` — see Q3).

- **Files:** `apps/web/src/app/docs/layout.tsx` (token-level touch-ups only), `docs/components/code-block.tsx`
- **Validation:** side-by-side screenshots of all 6 docs routes before and after. Only colour and body font change; no layout shift.

### 5.5 — Slop-test gates

Final pass against the 58 gates, with attention to the ones this page is most exposed to: re-drawn chrome (47), invented metrics (46), token improvisation (48), clickable text wrapping (49), eyebrow discipline (54).

- **Validation:** written gate-by-gate result. Any gate that cannot pass is documented with a reason rather than quietly skipped.

---

## Dependency graph

```
0.1 ──────────────────────────────────→ 2.2 (real status chip)
                                   └──→ 3.5 (honesty labelling)
0.2 ─→ 0.3 ─→ 0.4 ─→ 0.5 ─→ 0.6 ─→ 0.7 ─→ everything downstream
1.1 ─→ 1.2 ─→ 1.3 ─→ 1.4
2.1 ─→ 2.2 ─→ 2.3 ─→ 2.4 ─→ 2.5
3.1 ─→ 3.2 ─→ {3.3, 3.4} ─→ 3.5 ─→ 3.6
{1.x, 2.x, 3.x} ─→ 4.4 ─→ 4.5 ─→ 5.x
```

Sprint 0 blocks everything. Sprints 1, 2 and 3 are independent of one another once 0 lands and can run in parallel or in any order. Sprint 4 needs all three. Sprint 5 needs 4.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Marketing app not wired to the server (F1) | One env var, task 0.1. The server itself is already live on Render and carrying the demos. If it is ever down, the status chip degrades to `offline` rather than lying. |
| Whitespace in `serverUrl` (F2) | 0.1's validation asserts the captured WebSocket URL contains no whitespace, so we catch it at the point of setting rather than months later. |
| Scripted demos read as fake | 3.5 labels them honestly and links the real thing. Real visitor cursors stay real. |
| Scripted demo drift | 3.3 / 3.4 validation requires every animated step to be achievable with the real API. Re-check when `packages/react` changes. |
| Token migration breaks docs | 5.5 does a before/after screenshot pass across all 6 docs routes. |
| No CI for `apps/web` | 0.6 adds a runner. A follow-up (out of scope) should add a build + test workflow — today nothing catches a broken web build before deploy. |

---

## Open questions

1. **Should we fix the `serverUrl` trim (F2) while we are here?** It is a one-line change in `packages/client/src/room.ts:84` (`.trim()` before the scheme swap) plus a test, and it would let the demos' existing trailing-newline env vars heal themselves. Out of this plan's declared scope, so it needs a yes before I touch `packages/`.
2. **Version label.** The hero badge and the docs sidebar both say `v0.0.1`; every package is `0.1.1`. Plan assumes the real number is used everywhere and the badge is kept. Say if you would rather drop the badge than maintain it.
3. **How many playground blocks?** The plan scopes two (cursors, todo). Storage, undo/redo and follow-mode are all natural third and fourth blocks. Each is roughly a day.
4. **Does the marketing page keep its own `dev:server` script?** With a deployed server, `apps/web/server/lively.ts` becomes a local-development convenience rather than the only server. Worth keeping, worth documenting.
