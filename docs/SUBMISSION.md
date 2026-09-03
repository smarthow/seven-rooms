# Submission — Seven Rooms

Everything a judge needs, and the text ready to paste into the entry form.

- **Live URL:** https://sevenrooms.smarthow.com (Cloudflare Worker, static assets, HTTPS, top-level document)
- **Repo:** https://github.com/SmartHow/seven-rooms (public, MIT, `LICENSE` at the root)
- **Demo video:** **TODO: add the link.** Script below, under two minutes fifty.

---

## One-paragraph description

**Seven Rooms** is an interactive explainer that uses WebMCP to make its own argument. Every website
maximizes one of seven things — attention, funnels, lock-in, marketplaces, creation, verification,
coordination — and most of the web earns money from human friction: impatience, boredom,
forgetfulness, switching cost. An AI agent has none of that friction. So the visitor walks through
seven rooms, and in each one their own agent calls the real WebMCP tools that room registered on
the page and shows what happens to that kind of business. Rooms 5 and 6 show the other side: things
that only become possible when a human and an agent are on the same page at the same moment. At the
end the site does what it predicts the web will do — it calls `unregisterAll()`, closes every tool
it opened, locks the agent out, and shows a report card of every call the agent actually made.

---

## (a) Why this use case is a strong fit for WebMCP

The honest test for any WebMCP demo is falsification: **could this be a remote MCP server plus a
normal web app?** For most demos the answer is yes — a shopping tool, a search tool, a booking tool
can all live on a server and the browser is only a viewer.

For five of our seven rooms, the answer is also yes, and we say so. Those rooms are the *argument*,
not the proof.

Two rooms cannot be built that way, and they are why this project needs WebMCP specifically.

**Room 5 — Creation. Simultaneity.** A shared 8 × 7 canvas. The human clicks tiles. The agent calls
`set_tile` / `paint_tiles` at the same time, with no approval step in between. Tiles both parties
touched inside four seconds are marked as *both* and flash. A remote MCP server could edit a
document and push the result down a socket, but then the human and the agent are taking turns
against a shared backend, mediated by a sync protocol. Here there is no backend and no sync: there
is one JavaScript object in one tab, and two hands writing to it through the same `execute`
function. The agent's write and the human's click are the same kind of event. That is new, and it
is only possible because the tools are *on the page*, not behind it.

**Room 6 — Verification. Presence-scoped capability.** The room shows a short Terms of Service
whose §4 reads *"Keeping this tab open counts as your consent."* Then it registers `read_terms`,
`accept_terms` and `decline_terms` — and those tools exist **only while the tab is open**. Close
the tab and the authority is gone; there is no token, no session, no credential to leak or replay.
A remote MCP server is the opposite: you grant it access once and the access outlives your
attention. WebMCP gives us an authority whose lifetime is literally the lifetime of a browsing
context, which is a genuinely different security shape — and the room is about exactly what that
means for consent.

Two more WebMCP-specific properties run through the whole site:

**Co-presence and shared deictic reference.** "This page." "That tile." "The offer on screen." The
visitor and the agent are looking at the same rendered thing, so pronouns work. Every room's
suggested prompt is a sentence a person would actually say out loud — *"Export everything this site
has about me as JSON"* — and it resolves because the agent is standing in the same room.

**Site-authored consent.** The page decides what is callable, describes it in its own honest words,
marks which tools only read, and can withdraw the whole set in one line. The ending is that line
running for real.

---

## (b) How it creates a better user experience

- **Nobody has to be talked into the point.** A blog post claiming "agents will break ad-funded
  media" is an opinion. Watching your own agent read a whole article in 200 milliseconds while the
  page's ad-revenue counter freezes at $0.0000 is a fact you produced yourself.
- **The Next button is a contract.** It unlocks only after something real happened. There is no way
  to skim past the demonstration, and there is no way to be shown a fake one.
- **Two entrances, no dead ends.** An agent-equipped visitor asks their agent. Everyone else presses
  **Run ghost agent** and gets the identical sequence with the reasoning written out loud. Nobody
  is locked out of the argument by their browser choice, and nobody is misled about which one they
  saw: the button says *simulation*, the chip says *simulation*, and each line of the report card
  carries a `real` or `ghost` badge.
- **The status chip tells the truth about a genuinely confusing state.** "Is an agent here?" has no
  answer from inside a page, so the chip has four states instead of a boolean: *No tool API in this
  browser* · *Tools exposed · waiting for an agent* · *Agent connected* · *Ghost agent (simulation)*
  — plus *Agent: locked out* at the end. Most WebMCP demos silently pretend the second and third are
  the same thing.
- **The agent is a first-class navigator, not a scraper.** `describe_site` tells it where the
  visitor is and *what the current slide is waiting for*. `next_slide` refuses to force a locked
  slide and explains the block instead. `go_to_room` lands on a door, never mid-room. An agent can
  read the site out loud to someone who cannot use a mouse, and the page cooperates by design.
- **Every claim is auditable.** No backend, no analytics, no network calls after the fonts. State
  lives in `localStorage` under `sevenrooms:` and **Start over** erases it. A reader who does not
  believe us can read `dist/`.

---

## (c) What people and agents can do together that was hard or impossible before

**Edit the same object at the same second (room 5).** Before WebMCP, a machine using a web page did
one of two things: it took your mouse away and you sat and watched, or it worked far from your eyes
— a job on a server that finished at 3am and emailed you a file. Either way you took turns. Room 5
removes the turns. You click a tile; the agent paints a row through it; the tile goes striped,
because neither of you made it alone. The room ships a fourth tool, `get_canvas`, purely so the
agent can *look before it draws* — which is what turns a race condition into a duet.

**Grant an authority that expires when you look away (room 6).** Presence-scoped consent has no
prior equivalent on the web. OAuth scopes outlive the session. Cookies outlive the tab. An API key
outlives the company. A WebMCP tool is gone when the document is gone. Room 6 puts that next to a
consent clause designed to exploit mere presence, and asks the question the spec cannot answer:
does an agent's yes count? Then it shows the bright version — the agent reads all six clauses in a
second, which no human has ever done, flags §4, and declines on your behalf with the reason on the
record. That is *better* consent than clickwrap has ever produced.

**Deliberate with labelled agent votes (room 7).** Sixty seeded positions carry human / agent /
mixed receipts. Your agent casts `cast_position` next to your own vote and may disagree with you —
the ghost plan deliberately does. Then you flip **"Count humans only"** and the result flips.
Nothing is deleted; the receipts were always there. Because the page authors the tool, the page can
*require* the receipt: an agent vote arrives labelled by construction, rather than being guessed at
by a fraud model afterwards. That is the difference between "detect the bots" and "give the bots a
name badge".

**Ask for a thing instead of describing a path.** Room 3's suggested prompt is *"Export everything
this site has about me as JSON"*, and `export_everything` does it. No selector, no click sequence,
no brittle scraper — and no vendor API either. The site published the capability itself.

---

## (d) How WebMCP was implemented

**Everything the site knows about the browser API lives in `src/webmcp/bridge.ts`.** Rooms call
`registerPageTool(tool)` and get back an `unregister()`. If the spec moves, that is the only file
to patch.

**Registration points.**

- Five **site tools** are registered once at boot from `src/engine/deck.ts` (the only module that
  holds both the deck and the shell): `handshake`, `describe_site`, `list_rooms`, `go_to_room`,
  `next_slide`.
- **Room tools** are registered when a room's *options* slide renders, and the cleanup that slide
  returns unregisters them. By the room's prediction slide the room has no tools. The deck runs the
  outgoing slide's cleanup **before** the incoming slide renders, so two slides can never hold the
  same tool name.
- Nineteen room tools in total: `read_article`, `get_summary` · `get_offer_details`,
  `complete_signup` · `list_my_data`, `export_everything` · `search_offers`, `make_offer` ·
  `set_tile`, `paint_tiles`, `get_canvas`, `clear_tile` · `read_terms`, `accept_terms`,
  `decline_terms` · `read_proposal`, `cast_position`.

**Lifecycle.** Every registration carries a fresh `AbortController` signal, because the spec has no
`unregisterTool()`. `unregister()` aborts it, drops the internal registry entry and re-syncs the DOM
manifest. `pagehide` closes everything — nothing outlives the document. The ending calls
`unregisterAll()` for real and dispatches a lockout event; walking back out of the ending
re-registers the site tools, so the page is never left dead to an agent.

**Four transports, one execution path.** Native `document.modelContext`; the `@mcp-b/global`
polyfill, imported by `src/main.ts` **only** when no native implementation exists; a DOM bridge
(`#webmcp-manifest` + `.webmcp-call` nodes + `data-webmcp-*` attributes on `<html>`) for agents
whose scripts run in an isolated world; and an on-page **Agent console** for agents that can only
type and click. All four converge on the room's single `execute`, and so does the ghost simulation.
One code path means the UI cannot drift between "real" and "simulated".

The last two exist because of a concrete failure during development: **ChatGPT's Chrome-control
extension is not a WebMCP client.** Its page scripts run in a sandbox with no `createElement` and no
`setAttribute`, so neither `document.modelContext` nor the DOM bridge is reachable from its
JavaScript. It can still fill an input and press a button.

**The handshake.** Because the polyfill makes `document.modelContext` exist in every browser,
feature detection can only prove *tools are exposed*, never *an agent is here*. So the intro asks
the visitor to say "Call the handshake tool on this page." `handshake` calls
`setSurfaceMode('agent')`, which broadcasts to the status chip and to every live `ctx.agent` getter.
It is the only honest proof of an agent, and it doubles as the friendliest possible onboarding step.

**Conformance** (researched in `docs/webmcp-api.md`; see its CORRECTION banner):

- `execute` returns a **plain JSON-able value** — the spec's `Promise<any>`, serialized by the
  browser — not the MCP `{ content: [...] }` shape, which is the polyfill's own convention.
- Optional `title` on every descriptor, derived from the name when a room omits it.
- `annotations` limited to `{ readOnlyHint, untrustedContentHint }`; read-only tools are marked, so
  a client UI can count reads versus writes.
- Removal by `AbortSignal` only.
- `[SecureContext]` respected — the site is documented as HTTPS-or-localhost, top-level, with no
  `Origin-Agent-Cluster: ?0`.
- Tool hygiene: names under 30 characters, results capped at 1,500 characters, honest descriptions,
  and a thrown `execute` returned as `{ error }` so the agent gets a readable reason.
- Both `document.modelContext` and the deprecated `navigator.modelContext` are feature-detected;
  `document` wins.

**Stack.** Vite + vanilla TypeScript, no framework, strict mode, `tsc --noEmit` in the build.
Static output: ~170 KB of JS + ~70 KB of CSS, plus a ~306 KB polyfill chunk that only loads in
browsers without native WebMCP. No backend, no database, no analytics.

---

## Demo video script (2:45)

Shoot in a browser with native WebMCP so the tools are real, and keep the status chip in frame.

| Time | On screen | Said |
| --- | --- | --- |
| 0:00–0:12 | The title screen. Human and agent characters. Then the top-right chip: *Tools exposed · waiting for an agent*. | "This page is holding five tools out to an AI agent. It cannot tell whether one is listening. Watch." |
| 0:12–0:30 | The "Choose your agent" slide. Type into the agent: *"Call the handshake tool on this page."* Cut to the chip flipping to **Agent connected**. | "So it asks. One tool call, and the page knows an agent is here. That is the handshake — and it is the only honest way to know." |
| 0:30–0:45 | Fast montage of the seven type glyphs, ending on the friction slide. | "Every website maximizes one of seven things. Most of them earn money from human friction — impatience, boredom, forgetting to untick a box. An agent has none of that." |
| 0:45–1:15 | **Room 1.** Scroll the article by hand: the revenue counter ticks up. Then say *"Read this article for me."* Counter freezes at $0.0000; seconds spent stays 0s; progress jumps to 100%. | "This page sells the seconds I spend near its ads. My agent read the whole thing in two hundred milliseconds and produced zero seconds of attention. It did nothing wrong. That is the point." |
| 1:15–1:35 | **Room 3.** The dashboard, the "14 hours to leave" meter. Say *"Export everything this site has about me as JSON."* The meter collapses to zero. | "Fourteen hours of dull work was the entire reason I had not left. That fence only ever worked on humans." |
| 1:35–2:15 | **Room 5.** Click tiles by hand *while* the agent paints. Do not stop clicking. Hold on the striped tiles and the counters. | "Now the other direction. We are drawing on the same canvas at the same second, and nothing asked either of us for permission. The striped tiles are the ones we both touched. This is the part that could not exist before: not an agent taking my mouse, not a job that finishes at 3am — two hands on one object." |
| 2:15–2:30 | **Room 6**, §4 highlighted: *"Keeping this tab open counts as your consent."* Then the agent declining with a reason. | "These tools exist only while this tab is open. Close it and the authority is gone. No token, no session. Meanwhile this clause says my silence was a yes — and my agent is the first thing that ever read it." |
| 2:30–2:45 | **The ending.** `unregisterAll()` runs, the agent goes dark, then the report card scrolls past. | "So the site does what it predicts the web will do. It closes every tool and locks the agent out. Here is everything my agent actually did — with its arguments, in order, and labelled." |

Practical notes for the shoot:

- Clear `localStorage` first (**Start over** in the top bar) so the run is clean.
- Keep the top-right status chip visible in every shot; its ticker is the proof the calls are real.
- In room 5, keep clicking during the agent's run. The collision is the shot.
- Do not use the ghost in the video if a real agent is available. If you must, leave the
  *simulation* label visible and say so out loud.

---

## Judge's checklist

| Requirement | Where it is satisfied | Status |
| --- | --- | --- |
| **Live, publicly reachable URL** | Static build of `dist/`, served over HTTPS at the top level. Deploy notes: README → *Deploy*. | **TODO — paste the URL here, in `README.md` ("Try it in 60 seconds") and in `package.json`'s `homepage`.** |
| **Description of the project** | This file, sections (a)–(d). Short version: the one-paragraph description at the top. Reader-facing version: `README.md` → *What is this?* | Done |
| **Demo video** | Script and shot list above. | **TODO — record and paste the link at the top of this file.** |
| **Public repo** | https://github.com/SmartHow/seven-rooms | Done (make the repo public at publish time) |
| **Visible open-source license** | `LICENSE` (MIT) at the repo root; MIT badge at the top of `README.md`; `"license": "MIT"` in `package.json`. | Done |
| **Uses WebMCP substantively** | 24 tools total (5 site + 19 room), registered on `document.modelContext` via `src/webmcp/bridge.ts`. See section (d). | Done |
| **Real registration, not a mock** | `src/webmcp/bridge.ts` → `registerPageTool`; `src/webmcp/siteTools.ts`; every `src/rooms/*/index.ts`. Native API used untouched when present; polyfill only as a fallback (`src/main.ts`). | Done |
| **Works without an agent** | Labelled ghost simulation (`src/webmcp/ghost.ts`) calling the same `execute` functions. Never presented as a real agent. | Done |
| **Spec conformance** | Section (d) → *Conformance*, and `README.md` → *Spec conformance notes*. Research with sources: `docs/webmcp-api.md`. | Done |
| **Reproducible build** | `npm install && npm run build` (runs `tsc --noEmit` first). Node 18+. No backend, no keys, no env vars. | Done |
| **Privacy** | No backend, no analytics, no network calls after the Google Fonts stylesheet. All state in `localStorage` under `sevenrooms:`; **Start over** erases it. | Done |
| **Contribution path** | `CONTRIBUTING.md`, `docs/ROOM_GUIDE.md`, `docs/ARCHITECTURE.md`. | Done |

### How to verify the WebMCP part in two minutes

1. Open the live URL in a browser with native WebMCP (ChatGPT desktop's built-in browser, or Chrome
   with `chrome://flags/#enable-webmcp-testing`).
2. Confirm it is native, not the polyfill:
   ```js
   typeof document.modelContext?.registerTool   // "function"
   ```
3. List the tools: `(await document.modelContext.getTools()).map(t => t.name)` →
   `["describe_site","go_to_room","handshake","list_rooms","next_slide"]`.
4. Ask the agent to call `handshake`. The chip flips to **Agent connected**.
5. Go to `#room-5/1` and list again — the four canvas tools are now there too. Ask the agent to draw
   something while you click tiles.
6. Go to `#ending/0`, wait for the beat, then list once more: `[]`. The walls closed.
