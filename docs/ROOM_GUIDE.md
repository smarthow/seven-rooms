# How to build a room

One page. Read it once, then copy `src/rooms/room1-attention/` and change the contents.
Room 1 (Attention) is the reference implementation and it is deliberately boring on purpose:
every room should look like it.


## Tool descriptors follow the live spec

- `execute(args)` returns a **plain JSON-able value** (string or object). Do not wrap it in MCP
  `{content:[…]}`; the browser serializes it. Throwing turns into `{ error }` for the agent.
- `PageTool.title?` is optional — a short label for tool pickers (ChatGPT shows it under "Site
  tools"). If omitted the bridge derives it from the name (`go_to_room` → "Go to room").
- `annotations` are exactly `{ readOnlyHint?, untrustedContentHint? }`. Mark read-only tools; the
  ChatGPT UI counts "N read, M write".

## Agent surface (read this before touching `ctx.agent`)

`ctx.agent` is a **live getter**, not a snapshot — read it inside handlers, not once at render.

- `ctx.agent.mode` is `'none' | 'api' | 'agent' | 'ghost'` (there is no `'webmcp'` any more):
  `none` = no tool API in this browser; `api` = `document.modelContext` exists (native or the
  `@mcp-b/global` polyfill) but no agent has called `handshake` yet; `agent` = an agent called
  `handshake`; `ghost` = the visitor chose the simulation on the intro.
- `ctx.agent.prefersGhost` is `true` for `ghost` and `none`. Use it to order the Options CTAs:
  ghost button first when true; the "ask your agent" prompt first when false.
- Keep passing `source: ctx.agent.mode` to `ctx.log.record(...)` — the log normalises it to
  `'webmcp'` (for `agent`) or `'ghost'` (everything else) so the report card reads real/ghost.
- Five **site tools** (`handshake`, `describe_site`, `list_rooms`, `go_to_room`, `next_slide`)
  are registered at boot by the deck and coexist with your room's tools. Do not reuse those names.

## Above the fold (mandatory)

**The rule: on desktop (>= 768px wide) the PAGE must never scroll.** Every slide fits the
viewport. The user tested the old build and said the scrolling "is not nice" — this is the fix,
and it is not optional. Room 1 (`src/rooms/room1-attention/`) is the reference; copy its shape.

The engine already makes the stage exactly one viewport tall (`100dvh` minus the top bar) with
`overflow: hidden` on the page at >= 768px. Your job is to make the content actually fit, not to
let it get clipped. A slide is:

```
fitHeader(...)            // compact header row  — flex: 0 0 auto
+ ONE body row            // fitBody / fitScroll / splitPane — flex: 1 1 auto; min-height: 0
```

Nothing else at the top level of the slide. Panes inside the body row may scroll **internally**
if content truly overflows, but the goal is that at 1280x800 and 1366x768 none of them do.

Below 768px everything stays readable, the columns stack and the page is allowed to scroll.
Below 520px it stacks further. Under `prefers-reduced-motion` nothing about the layout moves.

### Where the long text goes

The Options slide (beat 2) has **no room for a paragraph**. The explanation that used to sit above
the sandbox moves to the **Door slide** (beat 1) via the new optional `Room.lead` field:

```ts
const room: Room = {
  id: 'room-3', number: 3, title: 'Room 3 — Lock-in',
  siteType: 'Lock-in', wants: 'your data inside',
  prediction: 'Refuse. No export tool, ever.',
  lead: ROOM_LEAD,          // 2–3 sentences. doorSlide() renders it. NEW.
  slides: [],
};
```

`fitHeader`'s `lead` is a one-line label, **max 110 characters** (`FIT_LEAD_MAX`). Anything longer
is truncated with a console warning — that is your signal to move it to `room.lead`.

### The Options-slide recipe (copy this)

```ts
el.append(
  fitHeader({
    eyebrow: 'room 1 · the options',
    title: 'Read it yourself. Or don’t.',
    lead: OPTIONS_INTRO,                      // <= 110 chars, or leave it out
  }),
  splitPane({
    ratio: 58,                                // default; main gets 58% of the width
    main: sandbox.el,                         // the sandbox, and nothing else
    side: stack(
      compactToolCards([toolA, toolB]),
      tiny(TOOLS_INTRO),
      promptHint(PROMPT_HINT),
      buttonRow(ghostBtn),
      character.el,
      thoughtEl,
      reactionBox,                            // narrator bubble + receipt land here
    ),
  }),
);
```

Your `room.css` makes the sandbox's tall element the flexible one, so only *its* body scrolls:

```css
@media (min-width: 768px) {
  .room-N .split__main .dashboard { flex: 1 1 auto; min-height: 0; }
  .room-N .split__main .dashboard__scroll { flex: 1 1 auto; height: auto; min-height: 0; }
}
```

The side column already has 40px of bottom padding so the fixed **Next** button never covers a
narrator bubble. If a reaction makes the column grow, scroll it into view (never the page):

```ts
const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
reactionBox.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest' });
```

### New helpers in `src/engine/ui.ts` — exact signatures

```ts
FIT_LEAD_MAX: number                        // 110

fitHeader(opts: { eyebrow: string; title: string; lead?: string }): HTMLElement
// compact header row: eyebrow (Caveat) + title (clamp 26–34px) + at most ONE short lead line.

fitBody(...children: Child[]): HTMLElement
// the one flexible body row. flex: 1 1 auto; min-height: 0. Centers its content vertically.
// Use it for beats 3 and 4, and for any text-only slide.

fitScroll(...children: Child[]): HTMLElement
// same, but scrolls INTERNALLY. Only for a genuinely long list (the ending's report card).

splitPane(opts: { main: Child; side: Child; ratio?: number }): HTMLElement
// two columns on desktop (default 58/42), stacked below 768px.
// main = the sandbox; side = tool cards + promptHint + ghost button + narrator bubble.
// The side column scrolls internally. This IS the Options-slide body row.

compactToolCards(tools: Array<{ name: string; description: string }>): HTMLElement
// tool cards as a tight vertical list: name in monospace, one line of description each.
// Use this on the Options slide. The big boxy `toolCard()` is for a slide with room to spare.

illo(name: string, opts?: { size?: 'sm' | 'md' | 'lg' }): HTMLElement
// renders the inline SVG registered for `name` in src/illos.
// Returns an EMPTY, HIDDEN element when the slot is still empty — never a broken box or a gap.

hasIllo(name: string): boolean               // true when the slot is filled

twoFutures(opts: {
  bad:    { title: string; bullets: string[] };
  bright: { title: string; bullets: string[] };
  badIllo?: string;                          // e.g. 'room-3-bad'   — small panel header
  brightIllo?: string;                       // e.g. 'room-3-bright'
}): HTMLElement
// must fit one screen: 3 bullets a side, **max ~16 words per bullet**. Count them.
```

`doorSlide(room)` and `predictionSlide(room)` are already above the fold — do not rewrite them.
`doorSlide` renders `illo('room-N-door')` large and centered (falling back to the two characters
while the slot is empty), the room number, the site type, "This site wants: …", `room.lead` and
the narrator line.

### The illo slots your room uses

Three keys. The drawings live in the shared registry (`docs/ILLO_STYLE.md`); a room **never edits
`src/illos/*`** — just reference the keys. A key with no drawing yet renders nothing.

| slot | where |
| --- | --- |
| `room-N-door` | beat 1, the Door slide — handled for you by `doorSlide(room)` |
| `room-N-bad` | beat 4, `twoFutures({ badIllo: 'room-N-bad' })` |
| `room-N-bright` | beat 4, `twoFutures({ brightIllo: 'room-N-bright' })` |

### Acceptance test — run it before you open a PR

Run `npm run dev`, then check every slide of your room at **1280×800** and **1366×768**. Any
headless browser works; so does resizing a real window and pasting the two snippets into the
DevTools console on each of `#room-N/0` … `#room-N/4`.

```js
// 1. the PAGE must not scroll
({
  hash: location.hash,
  ok: document.documentElement.scrollHeight <= window.innerHeight + 1,
  sh: document.documentElement.scrollHeight,
  ih: innerHeight,
})
```

```js
// 2. and the content must genuinely FIT — not be clipped, not be internally scrolled
(() => {
  const s = document.querySelector('.slide');
  const internal = [...document.querySelectorAll('.slide,.fitbody,.split__side')]
    .filter((e) => e.scrollHeight - e.clientHeight > 1)
    .map((e) => e.className);
  return { slideOver: s.scrollHeight - s.clientHeight, internal };
})()
```

Every slide must report `ok: true` **and** `slideOver: 0` with an empty `internal` list. If a pane
shows up in `internal`, cut words — do not add a scrollbar. Also look at `#room-N/1` at 1280×800
and confirm the sandbox and the tool column are both fully visible, and check 375×812 for
horizontal overflow.

## Rules

0. **Everything fits above the fold.** See the section above. It is a hard requirement, checked
   by the acceptance test.
1. **Stay in your folder.** `src/rooms/roomN-slug/` — four files, nothing else. Do not edit
   `src/engine/*`, `src/webmcp/*`, `src/chapters/*`, the styles, or another room. The chapter
   registry is already wired to your `index.ts`; you do not touch it.
2. **Import only from `src/engine/*` and `src/webmcp/*`** (plus your own files and your `room.css`).
   If you think you need a new shared helper, open an issue first — do not add one in a room PR.
3. **`npm run build` must stay green.** It runs `tsc --noEmit` first. Zero type errors, always.
4. **Unregister your tools.** Whatever `registerPageTool` returns must be called from the cleanup
   your Options slide returns. By the prediction slide the room has no tools.
5. **Every `execute` records to the log** — `ctx.log.record({ room, tool, args, result, source: ctx.agent.mode })`.
   The ending's report card is built entirely from those entries.
6. **Voice:** plain, honest, slightly wry. Never sarcastic at the visitor. Short sentences, simple
   words — many readers are not native English speakers. The visitor is never the butt of the joke;
   the business model is.

## The four files

```
src/rooms/roomN-slug/
  index.ts      the Room object and its 5 slides (wiring)
  content.ts    every string: titles, narrator lines, fake page text, the two futures
  sandbox.ts    the playable surface — returns { el, …actions, destroy() }
  room.css      styles, every selector scoped under .room-N
```

`index.ts` imports `./room.css`. The engine puts `room-N` on the slide container, so
`.room-3 .dashboard { … }` works and cannot leak into another room.

## The beat structure (SPEC §4 — do not reorder)

```ts
room.slides = [
  doorSlide(room),      // 1. shared factory — do not write your own
  optionsSlide,         // 2. YOU write this: tools + sandbox + ghost button
  happenedSlide,        // 3. YOU write this: one screen, plain words
  futuresSlide,         // 4. YOU write this: twoFutures({ bad, bright })
  predictionSlide(room),// 5. shared factory — do not write your own
];
```

- **Beat 2, the Options slide, is the room.** It registers the tools, shows each as a `toolCard`,
  shows a `promptHint`, shows a **Run ghost agent** button, and shows the sandbox *on the same
  screen* so the visitor sees the effect the moment a tool fires. Call `ctx.done()` after the first
  tool call (real or ghost), not before. Use `ctx.hint('run a tool to continue')` while locked.
- **Beat 3** is text. What the agent did, what it means for this kind of site. No new mechanics.
- **Beat 4** is `twoFutures` with three concrete, specific bullets per side. Name things. No
  abstractions like "trust erodes" — say who stops getting paid.

## Exact signatures you may use

### `src/engine/ui.ts`

```ts
h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attrs | null, ...children: Child[]): HTMLElementTagNameMap[K]
append(el: Element, children: Child[]): void
raw(markup: string, className?: string): HTMLElement      // trusted inline SVG only
clear(el: Element): void

hero(text: string): HTMLElement            // title screens
title(text: string): HTMLElement
lead(text: string): HTMLElement            // the one-sentence idea
para(text: string): HTMLElement
eyebrow(text: string): HTMLElement         // hand-written kicker
hand(text: string): HTMLElement
tiny(text: string): HTMLElement
stack(...children: Child[]): HTMLElement

bubble(text: string, who?: 'narrator' | 'human' | 'agent'): HTMLElement   // default 'narrator'
card(cardTitle: string, body: Child): HTMLElement
cardRow(...children: Child[]): HTMLElement

toolCard(tool: { name: string; description: string }): HTMLElement
promptHint(text: string): HTMLElement      // copyable suggested prompt

meter(opts: {
  label: string; value: number; max: number;
  format?: (v: number) => string;
  tone?: 'accent' | 'agent' | 'human' | 'good' | 'danger';
}): { el: HTMLElement; set(v: number): void; value(): number }

counter(el: HTMLElement, from: number, to: number,
        format?: (v: number) => string, durationMs?: number): () => void

stat(label: string, value: string): { el: HTMLElement; value: HTMLElement }
statRow(...children: Child[]): HTMLElement

twoFutures(opts: {
  bad:    { title: string; bullets: string[] };   // 3 bullets, max ~16 words each
  bright: { title: string; bullets: string[] };
  badIllo?: string;                               // 'room-N-bad'
  brightIllo?: string;                            // 'room-N-bright'
}): HTMLElement

// --- above the fold (see the section at the top of this guide) ---
FIT_LEAD_MAX: number
fitHeader(opts: { eyebrow: string; title: string; lead?: string }): HTMLElement
fitBody(...children: Child[]): HTMLElement
fitScroll(...children: Child[]): HTMLElement
splitPane(opts: { main: Child; side: Child; ratio?: number }): HTMLElement
compactToolCards(tools: Array<{ name: string; description: string }>): HTMLElement
illo(name: string, opts?: { size?: 'sm' | 'md' | 'lg' }): HTMLElement
hasIllo(name: string): boolean

button(label: string, opts: { tone?: 'plain' | 'ghost' | 'accent'; tag?: string; onClick(): void }): HTMLButtonElement
buttonRow(...children: Child[]): HTMLElement
thinking(text?: string): HTMLElement       // the "…" line for ghost thoughts
```

### `src/engine/characters.ts`

```ts
human(mood?: 'happy' | 'surprised' | 'worried'): CharacterHandle<HumanMood>
agent(state?: 'idle' | 'thinking' | 'done'): CharacterHandle<AgentState>
cast(mood?, state?): { el: HTMLElement; human: CharacterHandle<HumanMood>; agent: CharacterHandle<AgentState> }

// CharacterHandle<S>: { el: HTMLElement; set(state: S): void; dark(on: boolean): void; state(): S }
```

### `src/engine/roomSlides.ts`

```ts
doorSlide(room: Room): Slide
predictionSlide(room: Room): Slide
underConstructionSlide(room: Room): Slide     // delete your room's use of this

readVote(store: Store, room: number): VoteOption | null
voteTally(store: Store, room: number): Record<VoteOption, number>
VOTE_OPTIONS: Array<{ id: VoteOption; label: string }>
VOTE_BASELINE: Record<number, Record<VoteOption, number>>
PREDICTION_ANSWER: Record<number, VoteOption>
// VoteOption = 'open' | 'charge' | 'block'
```

### `src/engine/types.ts`

```ts
interface SlideContext {
  done(): void;                    // unlock Next. safe to call twice
  log: ActivityLog;
  agent: AgentSurface;             // { mode: 'webmcp' | 'ghost'; label: string }
  goNext(): void;                  // rare
  store: Store;                    // get<T>(key, fallback) / set(key, value)
  hint(text: string): void;        // note next to the locked Next button; '' clears
}

interface Slide { id: string; render(el: HTMLElement, ctx: SlideContext): void | (() => void) }
interface Room extends Chapter {
  number: 1|2|3|4|5|6|7; siteType: string; wants: string; prediction: string;
  lead?: string;                   // the long explanation. doorSlide() renders it (beat 1).
}
```

### `src/webmcp/bridge.ts`

```ts
interface PageTool {
  name: string;                                   // snake_case, unique, under ~30 chars
  description: string;                            // plain and honest — the agent reads this
  inputSchema: Record<string, unknown>;           // JSON Schema object
  execute(args: Record<string, unknown>): Promise<unknown> | unknown;   // return a plain value
  annotations?: Record<string, unknown>;          // e.g. { readOnlyHint: true }
}

registerPageTool(tool: PageTool): () => void      // returns unregister
listPageTools(): PageTool[]
getPageTool(name: string): PageTool | undefined
invokePageTool(name: string, args?: Record<string, unknown>): Promise<unknown>
unregisterAll(): void                             // the ENDING calls this. never a room
detectAgentSurface(): AgentSurface
isWebMCPSupported(): boolean
onToolCall(fn: (info: { name: string; args: Record<string, unknown> }) => void): () => void
toMcpResult(value: unknown): { content: Array<{ type: 'text'; text: string }>; isError?: boolean }
activityLog: ActivityLog
```

The bridge wraps your plain return value into the MCP result shape, so **return plain objects** —
never build `{ content: [...] }` yourself.

### `src/webmcp/ghost.ts`

```ts
interface GhostStep { tool: string; args: Record<string, unknown>; thought: string }

runGhostAgent(opts: {
  tools: PageTool[];
  plan: GhostStep[];
  onThought(text: string): void;      // called with '' when the run finishes
  delayMs?: number;                   // default 900
  onResult?(step: GhostStep, result: unknown): void;
}): Promise<void>
```

### `src/webmcp/activity.ts`

```ts
interface ActivityEntry {
  room: number; tool: string;
  args: Record<string, unknown>;
  result: unknown;                     // kept small; truncated before storage
  source: 'webmcp' | 'ghost';
  at?: number;                         // filled in for you
}

interface ActivityLog {
  record(entry: ActivityEntry): void;
  all(): ActivityEntry[];
  byRoom(room: number): ActivityEntry[];
  subscribe(fn: (entry: ActivityEntry, all: ActivityEntry[]) => void): () => void;
  clear(): void;
}
activityLog: ActivityLog               // use ctx.log inside a slide, not this
```

## Registering and unregistering tools

Register inside the Options slide's `render`, and return a cleanup that unregisters. Both the
real-agent path and the ghost path end up in the same `execute`, so write the effect once.

```ts
const readThing: PageTool = {
  name: 'read_thing',
  description: 'Return the thing on this page. No arguments.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true },
  async execute(args) {
    const result = sandbox.doTheThing();                 // move the UI
    ctx.log.record({ room: 3, tool: 'read_thing', args, result, source: ctx.agent.mode });
    ctx.done();                                          // unlock Next on first call
    return result;                                       // plain value; the bridge wraps it
  },
};

const tools = [readThing];
const offs = tools.map(registerPageTool);

return () => {                 // ← the cleanup. NOT optional.
  for (const off of offs) off();
  sandbox.destroy();           // clear your timers and listeners too
};
```

With arguments, describe every field — the description is what the agent actually reads:

```ts
inputSchema: {
  type: 'object',
  properties: {
    format: { type: 'string', enum: ['json', 'csv'], description: 'File format to export.' },
  },
  required: ['format'],
  additionalProperties: false,
}
```

## Writing a ghost plan

Keep it to one to three steps. Each `thought` is one short sentence in the agent's voice —
matter-of-fact, never boastful. Steps run in order, ~900ms apart, and call the same tools.

```ts
const plan: GhostStep[] = [
  { tool: 'get_offer_details', args: {}, thought: 'Reading the real price before I touch the form.' },
  { tool: 'complete_signup',   args: { email: 'you@example.com', plan: 'basic', addons: [] },
    thought: 'The timer means nothing to me. Signing up with no add-ons.' },
];

let running = false;
const ghostBtn = button('Run ghost agent', {
  tone: 'ghost',
  tag: 'simulation',
  onClick: async () => {
    if (running) return;
    running = true;
    ghostBtn.disabled = true;
    character.set('thinking');
    await runGhostAgent({ tools, plan, delayMs: 900, onThought: (t) => (thoughtEl.textContent = t) });
    character.set('done');
    running = false;
  },
});
```

The button must always be present and always be labelled `simulation`, even when a real agent
surface exists.

## Recording to the log

One `record` per tool call, always with your room number and `ctx.agent.mode` as the source.
Keep `result` small — a title and a count, not a 4KB blob; it is persisted to `localStorage`.

```ts
ctx.log.record({ room: 5, tool: 'set_tile', args, result: { x, y, color }, source: ctx.agent.mode });
```

Two entries the ending looks for specifically, so use these exact names if your room has them:
`accept_terms` (room 6) and `cast_position` with an `args.stance` (room 7).

## The Room object

```ts
const room: Room = {
  id: 'room-3',                    // must stay 'room-N'
  number: 3,
  title: 'Room 3 — Lock-in',
  siteType: 'Lock-in',             // fixed by SPEC §6
  wants: 'your data inside',       // fixed by SPEC §6
  prediction: 'Refuse. No export tool, ever.',   // fixed by SPEC §6
  slides: [],
};
room.slides = [doorSlide(room), optionsSlide, happenedSlide, futuresSlide, predictionSlide(room)];
export default room;
```

`id`, `number`, `siteType`, `wants` and `prediction` are fixed by the spec — do not reword them.
Everything else is yours.

## Verify before you open a PR

```bash
npm run build     # tsc --noEmit && vite build — must be green
npm run dev       # then open http://localhost:5173/#room-N/1
```

Check by hand:

- [ ] the sandbox is visible on the Options slide, and moves when a tool fires
- [ ] Next stays locked until the first tool call, then appears (and `ArrowRight` works)
- [ ] pressing **Run ghost agent** twice does not double-run
- [ ] going forward to the prediction slide leaves **no** registered tools —
      check with `listPageTools()` in the console, or just look for tool cards
- [ ] the ending's report card (`#ending/2`) lists your room's calls with the right args
- [ ] it still reads well at 375px wide, with no horizontal overflow
- [ ] **every one of your five slides passes the above-the-fold acceptance test** at 1280x800
      and 1366x768 — `ok: true`, `slideOver: 0`, nothing in `internal`
- [ ] no console errors, and no timers still running after you leave the slide
