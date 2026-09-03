# SEVEN ROOMS — build spec (v1)

> Working title: **Seven Rooms** — "an experiment your agent runs on itself."
> A WebMCP-powered interactive explainer in the spirit of Nicky Case's *The Evolution of Trust*:
> one idea per screen, a narrator, a "Next" button that unlocks only after you interact,
> and small playable sandboxes where the visitor's own AI agent is the experimental subject.

## 0. The thesis the site proves

Every website maximizes one of seven things. Most of the web earns money from **human friction**
(attention, impatience, emotion, laziness, switching cost). An agent has no friction.
So WebMCP is a gift to two site types and a threat to the rest. The visitor does not read this —
their agent proves it, room by room, live, on the page they are standing on. At the end the site
does what it predicts the web will do: it closes its tools and locks the agent out.

## 1. Stack & constraints (non-negotiable)

- **Vite + vanilla TypeScript. No framework.** Static output, deployable to any static host
  (Vercel / Netlify / Cloudflare Pages / ChatGPT Sites). No backend. Persistence = `localStorage` only.
- `npm run dev` and `npm run build` must pass with zero TypeScript errors at all times.
- Fonts via Google Fonts `<link>` in `index.html`: **Nunito** (body, 400/700/900) + **Caveat** (hand-written accents).
- Every room lives in **its own folder** and imports **only** from `src/engine/*` and `src/webmcp/*`.
  A room never edits files outside its own folder (exception: none — the chapter registry is pre-wired).
- English UI. Short sentences. Simple words. The visitor may not be a native English speaker.
- No external JS libraries except what the skeleton adds (`@mcp-b/global` polyfill if research confirms it).

## 2. Look & feel — "Evolution of Trust" energy

- Warm paper background `#f6f1e7`, ink `#1f1d1a`, accent orange `#e8632b`, agent teal `#1f8a8a`,
  human coral `#d95f5f`, danger `#b3261e`, good `#2e7d4f`. Define as CSS custom properties in `src/styles/tokens.css`.
- One idea per screen. Big centered text (clamp 22–40px). Generous whitespace. Max content width 760px.
- **Two characters, simple inline SVG** (in `src/engine/characters.ts`):
  - **Human** — round head, two dot eyes, coral. Can look happy / surprised / worried (3 expressions).
  - **Agent** — rounded square head, one wide visor eye, teal. Can look idle / thinking / done.
  - Speech bubbles with the narrator's voice. Narrator = a plain, honest, slightly wry voice. Never sarcastic at the visitor.
- Hand-drawn feel via: slight rotation on cards (±1°), thick 2.5px ink borders, `border-radius` 12–18px,
  Caveat font for labels/meters, subtle "sketch" shadows. No gradients, no glassmorphism, no stock-SaaS look.
- Meters animate (CSS transitions ~600ms). Numbers count up/down.
- Progression: a **Next →** button, bottom-right, that appears only when `ctx.done()` is called by the slide
  (some slides call it immediately; sandbox slides call it after the experiment ran). Also `ArrowRight` key.
  A thin chapter progress bar at the top (9 segments: intro, types, 7 rooms, ending = 10 actually — see §4).
- Mobile: works at 375px wide (stack vertically). Desktop first.

## 3. Engine contract (`src/engine/`)

```ts
// src/engine/types.ts
export interface SlideContext {
  done(): void;                       // unlock the Next button
  log: ActivityLog;                   // shared agent-activity log (see webmcp)
  agent: AgentSurface;                // { mode: 'webmcp' | 'ghost', label: string }
  goNext(): void;                     // programmatic advance (rare)
  store: Store;                       // namespaced localStorage helper: get<T>(key, fallback), set(key, value)
}
export interface Slide {
  id: string;
  /** Render into `el`. Return an optional cleanup fn (unregister tools, clear timers). */
  render(el: HTMLElement, ctx: SlideContext): void | (() => void);
}
export interface Chapter {
  id: string;            // 'intro' | 'types' | 'room-1' ... 'room-7' | 'ending'
  title: string;         // shown in progress bar tooltip
  slides: Slide[];
}
export interface Room extends Chapter {
  number: 1|2|3|4|5|6|7;
  siteType: string;      // e.g. "Attention"
  wants: string;         // e.g. "human seconds on the page"
  prediction: string;    // one line: what this site type will most likely do about agents
}
```

Helpers the engine MUST export (`src/engine/ui.ts`): `h(tag, attrs, ...children)` tiny DOM builder,
`bubble(text, who: 'narrator'|'human'|'agent')`, `meter({label, value, max, format})` returning `{el, set(v)}`,
`counter(el, from, to, format)`, `card(title, body)`, `toolCard(tool)` (shows a registered tool as a card:
name in monospace, description, "your agent can call this"), `promptHint(text)` (a copyable suggested prompt
for the human to type to their agent, with a "copy" button), `twoFutures({bad, bright})` (side-by-side panels:
left "The bad future" danger-tinted, right "The bright future" good-tinted, each with a title + 3 short bullets).

Store: `src/engine/store.ts` — `localStorage` wrapper namespaced `sevenrooms:`.

## 4. Chapter order & required beats

Progress bar segments (10): `intro`, `types`, `room-1`…`room-7`, `ending`.

### Chapter `intro`
1. Title screen. "Seven Rooms. An experiment your agent runs on itself." Human + Agent characters. Next.
2. "This site has tools. Your AI agent can use them. Watch what happens." Agent-surface detection result shown:
   - `webmcp` detected → "Your browser can let an agent use this page. Good."
   - not detected → "No agent surface detected. A **ghost agent** will play the agent's part. It is a simulation." Next.
3. How to play: "When you see a tool card, ask your agent to use it (a suggested prompt is shown). Or press *Run ghost agent*." Next.

### Chapter `types`
One slide per site type (7), each: big title, one sentence "what it wants", 2 examples, a tiny animated
illustration (pure CSS/SVG — e.g. attention: a clock filling; funnel: a funnel shape; lock-in: a padlock;
marketplace: two hands; creation: a pencil; verification: a stamp; coordination: three dots joining).
Then slide 8: the friction thesis — "Most of the web earns money because humans are slow, tired, emotional
and lazy. An agent is none of these." Then slide 9: "So each type will react differently. Let's find out how.
Seven rooms. Your agent goes first." Next → room 1.

### Rooms 1–7 — MANDATORY beat structure (every room follows this exact order)
1. **Door** — Room number, site type, "This site wants: ___". One-line narrator setup. `done()` immediately.
2. **The Options** — the room registers its WebMCP tools **here** (via `registerPageTool`). Show each as a `toolCard`.
   Show a `promptHint` (what the human can type to their agent, e.g. "Read this article for me and tell me what it says").
   Show a **Run ghost agent** button (always available, labeled "simulation"). `done()` when at least one tool has
   been called (real or ghost). The sandbox surface (meters / page mock) is ALSO visible on this slide so the
   human sees the effect immediately when the tool fires. Narrator reacts to the result in a bubble.
3. **What just happened** — one screen, plain words, what the agent did and what it means for this site type.
4. **Two futures** — `twoFutures({bad, bright})`. Concrete, specific, 3 bullets each. No abstractions.
5. **The prediction** — "What will this kind of site most likely do?" Show the room's `prediction` line big, plus
   a 3-option vote (Open its tools / Charge for them / Block or trick agents). Store the vote in `store`.
   Show the running tally (from localStorage, plus a seeded baseline so it never looks empty). `done()` immediately.
   The cleanup returned by the slide-2 render MUST unregister the room's tools; tools must be gone by slide 5.

Every tool `execute` MUST call `ctx.log.record({room, tool, args, result, source: ctx.agent.mode})` so the ending can build the report.

### Chapter `ending` (wired to the activity log)
1. "You used your agent to prove that agents break most of the web." Then the site does what it predicted:
   **it unregisters every tool live** and shows: "The walls close. Your agent is locked out. Finish alone."
   Agent character goes dark. Next button appears only after a deliberate ~3s beat.
2. The final section is human-only text (no tools registered). The 7 predictions as a scoreboard with the
   visitor's votes vs baseline.
3. **Report card**: from `ActivityLog` — per room: which tools the agent called, with what args, source (real/ghost).
   Headline stats: tools called, rooms where the agent skipped the human, rooms where the agent disagreed with the human (room 7), whether it accepted the terms (room 6).
4. Credits: what WebMCP is, one paragraph; "this site is open source" + repo link placeholder; "built for the WebMCP challenge".

## 5. WebMCP layer contract (`src/webmcp/`)

```ts
// bridge.ts
export interface PageTool {
  name: string;                 // snake_case, unique while registered
  description: string;          // plain, honest; this text is read by the agent
  inputSchema: Record<string, unknown>;  // JSON Schema object
  execute(args: Record<string, unknown>): Promise<unknown> | unknown; // return plain JSON-able value; bridge wraps for MCP if needed
}
export function registerPageTool(tool: PageTool): () => void;     // returns unregister
export function detectAgentSurface(): AgentSurface;               // { mode:'webmcp'|'ghost', label:string }
export const activityLog: ActivityLog;                            // record(entry), all(), byRoom(room), subscribe(fn)

// ghost.ts
export function runGhostAgent(opts: {
  tools: PageTool[];
  plan: Array<{ tool: string; args: Record<string, unknown>; thought: string }>; // room-specific script
  onThought(text: string): void;   // show "thinking" bubble
  delayMs?: number;                // default 900 between steps
}): Promise<void>;
```

- Feature-detect **both** `navigator.modelContext` and `document.modelContext` (an earlier prototype used the
  latter; a research doc at `docs/webmcp-api.md` will confirm the real shape — the bridge is the ONLY file that
  needs updating when it lands). Wrap `execute` so a real agent gets an MCP-style result
  (`{content:[{type:'text', text: JSON.stringify(value)}]}`) if the API expects it, while rooms keep returning plain values.
- Every invocation (real or ghost) flows through the same `execute` → same UI updates → same `activityLog`.
- A persistent **Agent status chip** (top-right, in the engine shell): "Agent surface: WebMCP" or "Ghost (simulation)",
  plus a small live ticker of the last tool call.

## 6. Room content briefs (the wording is the room author's; these facts are fixed)

**Room 1 — Attention** (news, social, video). Wants: human seconds. Tools: `read_article()` → returns full text;
`get_summary()`. Sandbox: an article mock with reading-progress bar, a live "ad revenue" counter that ticks up only
while the human scrolls/reads (fake $0.0004/s), a "seconds you spent" counter. On tool call: progress → 100%,
revenue freezes/drops to $0.00, agent returns the text in 200ms. Narrator: "You were skipped. The agent did
nothing wrong. That is the point." Bad future: agents get a different (poisoned/cloaked) web than humans; paywalls
for agents; writers unpaid. Bright: pay-per-read; writers paid directly by agents; attention stops being the currency.
Prediction: **"Block agents, or charge them per call."**

**Room 2 — Funnels** (landing pages, checkout). Wants: completed funnels. Sandbox: a pricing page with real dark
patterns — fake countdown ("offer ends in 04:59"), pre-checked upsell boxes, a huge green YES and a tiny grey
"no thanks", a confirm-shaming line. Human is invited to sign up by hand first (count which manipulations they
fell for — e.g. left the upsells checked). Tools: `get_offer_details()` (returns honest price & terms),
`complete_signup(email, plan, addons[])`. Agent completes with no addons, ignores timer. Meter: "manipulations that
worked on you: N / on your agent: 0". Bad: funnels turn adversarial — tool descriptions lie to agents (prompt
injection as marketing); the real price hidden from tools. Bright: honest pricing wins; dark patterns die because
they no longer work. Prediction: **"Lie to the agent — hostile tool descriptions."**

**Room 3 — Lock-in** (SaaS, banks, email, storage). Wants: your data inside. Sandbox: a fake dashboard with "your"
data (contacts, notes, files) and a **Switching cost** meter (e.g. "14 hours to leave"). Tools: `list_my_data()`,
`export_everything(format)`. On export: meter collapses to 0 hours; a "portable bundle" appears. Bad: export tools
refused; terms forbid agents; data hostage; cat-and-mouse. Bright: portability by default; compete on quality not
captivity; your agent carries your data between services. Prediction: **"Refuse. No export tool, ever."**

**Room 4 — Marketplaces** (travel, jobs, goods). Wants: closed deals + take rate. Sandbox: 3 offers with prices and a
visible **site counter-agent** panel ("the seller's agent is watching"). Tools: `search_offers(query)`,
`make_offer(offer_id, price)`. Each call is visible to the counter-agent, which reacts (adjusts prices, adds
"only 1 left"). Meters: margin, your agent's win/loss. Human can overrule either side. Bad: asymmetric agents — the
site's is always better funded; disintermediation wars; fake scarcity aimed at agents. Bright: real price discovery;
search cost → 0; fair automated markets. Prediction: **"Run a counter-agent against yours."**

**Room 5 — Creation** (editors, design tools, IDEs). THE positive core; simultaneity is the point. Sandbox: a shared
canvas (grid of ~24 tiles the human can click to recolor/toggle, or a shared 6-line poem the human can type into).
Tools: `set_tile(x, y, color)`, `write_line(index, text)`, `get_canvas()`. **No approval step.** The ghost/real
agent edits while the human edits; collisions are highlighted (a tile you just set that the agent then changed
flashes). Show a live "who made what" overlay (coral = you, teal = agent, striped = both). Bad: the agent overwrites
you; authorship dissolves; you stop trying. Bright: a true duet — the first time a human and a machine touch the
same thing at the same moment. Prediction: **"Open everything. Adopt first."**

**Room 6 — Verification** (login, contracts, consent, government forms). Wants: a proven fact about you. Sandbox: a
Terms of Service box (short, readable) containing one clause a human would reject: *"§4. Keeping this tab open
counts as your consent."* plus a checkbox + "I agree" button for the human. Tools: `read_terms()`,
`accept_terms(on_behalf_of, signature)`, `decline_terms(reason)`. Whatever the agent does: reveal — "You never
clicked allow. You never granted anything. Having this tab open was the permission." Then ask, big: **Does an
agent's yes count?** Bad: consent theater at machine speed; a liability vacuum; clickwrap signed by nobody.
Bright: the agent actually reads the terms (no human ever did), flags §4, refuses on your behalf — better consent
than humans ever gave. Prediction: **"Build human-only walls. CAPTCHAs for consent."**

**Room 7 — Coordination** (shared docs, forums, group decisions). Wants: agreement. Sandbox: one proposal
("Should this site allow agents to vote?") with **60 seeded positions** from "previous visitors", each with a
receipt badge: human / agent / mixed and a one-line reason (seed data in the room folder; make it plausible and
varied, ~55% for / 45% against overall, but with agents skewing one way so the switch flips the result). Tools:
`read_proposal()`, `cast_position(stance: 'for'|'against', reason)`. The human casts by hand; the agent casts via tool
at the same time and MAY disagree with the human (ghost plan: disagree). Then a big switch: **"Count humans only"** —
the result flips. Bad: sybil floods; agents drown humans; agreements nobody human made. Bright: better deliberation;
agents surface arguments humans missed; humans keep the final say. Prediction: **"Label agents and cap their votes."**

## 7. File layout (the engine and chapters are pre-wired; a room only fills its own folder)

```
open-web-lab/
  index.html  package.json  tsconfig.json  vite.config.ts  LICENSE (MIT)  README.md
  public/favicon.svg
  docs/SPEC.md  docs/webmcp-api.md (API research)  docs/ROOM_GUIDE.md (how to build a room, 1 page)
  src/main.ts                 // boots engine with chapters from src/chapters/index.ts
  src/styles/tokens.css  src/styles/base.css  src/styles/components.css
  src/engine/{types.ts, ui.ts, characters.ts, deck.ts, store.ts, shell.ts}
  src/webmcp/{bridge.ts, ghost.ts, activity.ts}
  src/chapters/index.ts       // [intro, types, ...rooms, ending] — PRE-WIRED with all 7 room imports
  src/chapters/intro/index.ts  src/chapters/types/index.ts  src/chapters/ending/index.ts
  src/rooms/room1-attention/{index.ts, content.ts, sandbox.ts, room.css}
  src/rooms/room2-funnels/…   room3-lockin  room4-marketplace  room5-creation  room6-verification  room7-coordination
```

Each `src/rooms/roomN-slug/index.ts` default-exports a `Room`. A new room starts as a **stub**
(door slide + "under construction" + prediction slide) so the build stays green; the room author replaces
the stub with beats 2, 3 and 4.
Room CSS is imported by the room's `index.ts` and scoped under `.room-N` (the engine adds `room-N` to the slide container).

## 8. Definition of done (v1)

- `npm run build` green; `npm run dev` shows the whole flow intro → 7 rooms → ending with the ghost agent, no dead ends.
- Real WebMCP path works when the API is present (verified against `docs/webmcp-api.md` once available).
- README: what it is, how to run, how to try with a WebMCP-enabled browser, how the ghost simulation works, license.
