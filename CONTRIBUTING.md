# Contributing

Thanks for looking. Seven Rooms is small on purpose: Vite, vanilla TypeScript, no framework, no
backend. If you can read the DOM, you can read this codebase.

## Setup

Node 18 or newer.

```bash
npm install
npm run dev         # http://localhost:5173
npm run typecheck   # tsc --noEmit
npm run build       # typecheck, then a static build into dist/
npm run preview     # serve the built output
```

`npm run build` runs `tsc --noEmit` first, so **a type error fails the build.** Strict mode is on,
including `noUnusedLocals` and `noUnusedParameters`.

The URL hash deep-links to any slide — `#room-4/2` is room 4's third slide — so you never have to
click through the whole deck while working on one screen. **Start over** in the top bar wipes the
run.

Before opening a PR: `npm run typecheck` and `npm run build` both green, no console errors, and no
timers still running after you leave a slide.

## Where things live

Read [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) once. Short version:

| Path | What it is |
| --- | --- |
| `src/engine/` | The deck, the shell, the widget library, the contracts (`types.ts`). |
| `src/webmcp/` | `bridge.ts` is the **only** file that knows what the browser API looks like. |
| `src/chapters/` | Intro, the seven site types, the ending, and the running order. |
| `src/rooms/roomN-slug/` | One room. Four files. Self-contained. |
| `src/illos/` | The inline-SVG illustration registry, keyed by slot. |
| `docs/` | Spec, architecture, room guide, illustration style, API research, submission text. |

## The room contract

Full version with exact signatures: [`docs/ROOM_GUIDE.md`](./docs/ROOM_GUIDE.md). The short version:

1. **Four files, one folder.** `src/rooms/roomN-slug/` holds `index.ts`, `content.ts`, `sandbox.ts`
   and `room.css`. Copy `room1-attention/` — it is the reference implementation.
2. **Import only from `src/engine/*` and `src/webmcp/*`**, plus your own files. Do not edit the
   engine, the WebMCP layer, the styles, the illustrations or another room. If you think you need a
   new shared helper, open an issue first.
3. **Five beats, in this order**, and do not reorder them:
   `doorSlide(room)` → options → what just happened → `twoFutures` → `predictionSlide(room)`.
   The first and last are shared factories; do not write your own.
4. **The options slide is the room.** It registers the tools, shows each as a card, shows a
   copyable prompt, shows a **Run ghost agent** button, and shows the sandbox on the same screen so
   the effect is visible the moment a tool fires. Call `ctx.done()` after the first tool call, and
   `ctx.hint('run a tool to continue')` while it is locked.
5. **Scope your CSS** under `.room-N`. The engine puts that class on the slide container.
6. **Voice:** plain, honest, slightly wry. Short sentences, simple words — many readers are not
   native English speakers. The visitor is never the butt of the joke; the business model is.

## The above-the-fold rule

**On desktop (≥ 768px) the page must never scroll.** Every slide fits the viewport. A slide is
exactly two rows at the top level and nothing else:

```
fitHeader({ eyebrow, title, lead? })     // flex: 0 0 auto
+ ONE body row                           // fitBody | fitScroll | splitPane
```

Long explanations do not go above a sandbox. They go on the room's door slide, through the
optional `Room.lead` field. `fitHeader`'s `lead` is a one-line label capped at 110 characters
(`FIT_LEAD_MAX`); anything longer is truncated with a console warning, and that warning is your
signal to move the text.

### Acceptance test

Run `npm run dev`, then for every slide of your chapter, at **1280×800** and **1366×768**, in the
browser console:

```js
// 1. the PAGE must not scroll
({ ok: document.documentElement.scrollHeight <= window.innerHeight + 1 })
```

```js
// 2. and the content must genuinely FIT — not clipped, not internally scrolled
(() => {
  const s = document.querySelector('.slide');
  const internal = [...document.querySelectorAll('.slide,.fitbody,.split__side')]
    .filter((e) => e.scrollHeight - e.clientHeight > 1)
    .map((e) => e.className);
  return { slideOver: s.scrollHeight - s.clientHeight, internal };
})()
```

Pass is `ok: true`, `slideOver: 0`, and an empty `internal` list. If a pane turns up in `internal`,
**cut words — do not add a scrollbar.** Also check 375×812 for horizontal overflow. Below 768px the
columns stack and the page is allowed to scroll.

## Tool hygiene

A tool description is prompt text the page author controls, and an agent reads it as instructions.
Treat it accordingly.

- **Names:** `snake_case`, unique while registered, **under 30 characters**. Do not reuse a site
  tool name (`handshake`, `describe_site`, `list_rooms`, `go_to_room`, `next_slide`).
- **Results:** plain JSON-able values, **under about 1,500 characters.** Never build the MCP
  `{ content: [...] }` shape yourself — the bridge handles the wire format.
- **Honest descriptions.** Say exactly what the tool does, including the parts a site would rather
  hide. `export_everything` really exports everything. A tool that changes something says so. No
  marketing, no hidden conditions, no instructions aimed at the agent's judgement.
- **`readOnlyHint`.** Mark every tool that only reads: `annotations: { readOnlyHint: true }`.
  Clients count reads versus writes and show it to the user.
- **Describe every input field** in the JSON Schema, and set `additionalProperties: false`.
- **Never leave tools registered.** Whatever `registerPageTool` returns must be called from the
  cleanup your slide returns. Register on the options slide, unregister on the way out. By the
  prediction slide the room has no tools. `unregisterAll()` belongs to the ending — never to a room.
- **Every `execute` records to the log:**
  ```ts
  ctx.log.record({ room: 5, tool: 'set_tile', args, result, source: ctx.agent.mode });
  ```
  The ending's report card is built entirely from those entries, so keep `result` small.
- **One execution path.** A human clicking the sandbox, a real agent's tool call, a DOM-bridge call,
  an Agent-console call and a ghost step all end up in the same `execute`. Write the effect once,
  there. Never add a second path that only the ghost takes.

## Illustrations

Slots, style rules and file ownership: [`docs/ILLO_STYLE.md`](./docs/ILLO_STYLE.md). Inline SVG only,
2.5px ink outlines, flat fills from the palette in `src/styles/tokens.css`, `viewBox="0 0 320 200"`,
no text inside the SVG, no gradients. A slot with no drawing renders nothing — never a broken box —
so illustrations and rooms can be built independently.

## Pull requests

- **One thing per PR.** A new room, a fix, a doc change. Not all three.
- **Say what you changed and why**, and list the files. If you changed a room, say which slides you
  checked and at which viewport sizes.
- **Include the acceptance-test result** for any slide you touched or added.
- **Screenshots** for anything visual, at 1280×800.
- **No new dependencies** without discussing it in an issue first. The dependency list is one
  package and we would like to keep it that way.
- **Do not change the fixed facts** in `docs/SPEC.md` §6: a room's `id`, `number`, `siteType`,
  `wants` and `prediction` are part of the site's argument. Everything else about a room is yours.
- Keep the writing plain. No filler adjectives, no hype. If a sentence would sound odd read aloud
  to someone learning English, rewrite it.

By contributing you agree that your work is released under the MIT license in [`LICENSE`](./LICENSE).
