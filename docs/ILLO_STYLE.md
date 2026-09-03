# Illustration style & slot contract

Inline SVG only. One consistent hand-drawn, flat style that matches the two existing characters in
`src/engine/characters.ts` (read it first) and the palette in `src/styles/tokens.css`.

## Style rules
- **Ink outlines 2.5px**, `stroke-linejoin: round`, `stroke-linecap: round`, color `var(--ink)`.
- **Flat fills only** from the palette: paper `#f6f1e7`, ink `#1f1d1a`, accent orange `#e8632b`,
  agent teal `#1f8a8a`, human coral `#d95f5f`, danger `#b3261e`, good `#2e7d4f`, plus white `#fffdf8`.
  No gradients, no drop shadows, no photos, no text inside the SVG (labels live in HTML).
- Slight hand-drawn wobble: paths are not perfectly straight; circles are slightly off; a card can be
  rotated 1–2°. Think Nicky Case / xkcd-with-color. Charming, never cute-for-cute's-sake.
- Every illustration uses `viewBox="0 0 320 200"` (16:10), no fixed width/height, `role="img"`,
  and an `aria-label` describing it in one plain sentence.
- Use `currentColor`-free, explicit colors (the page is light-only). Keep each SVG under ~4 KB.
- Reuse the Human (coral round head) and Agent (teal rounded-square head, visor eye) as actors
  where a scene needs them, at the same proportions as `characters.ts`.

## Slots (exact keys)
Intro / ending:
- `intro-choice-agent` — a human handing a small glowing tool to the agent through a browser window
- `intro-choice-ghost` — a translucent, dotted-outline agent (the ghost) waving
- `ending-walls` — the agent outside a closed door / wall, the human inside reading alone
- `ending-report` — a clipboard/report card with check marks

Per room N (1–7), three each:
- `room-N-door` — the room's site type as a scene (1 clock+newspaper, 2 funnel with a coin falling
  through, 3 padlock on a filing cabinet, 4 two hands haggling over a price tag, 5 two hands drawing
  on one canvas, 6 a rubber stamp over a contract, 7 a circle of dots/heads around a table)
- `room-N-bad` — the bad future for that room (dark-tinted mood, danger red as the accent)
- `room-N-bright` — the bright future (good green as the accent)

Site types (the `types` chapter already has small animated glyphs in `src/chapters/types/illos.ts`;
these are richer, static scene versions the type slides can adopt instead):
- `type-1` … `type-7` — same subjects as `room-N-door`, may be simpler.

## File ownership

The registry is split across two files so two people can draw at the same time without touching the
same file:

- `src/illos/set-a.ts`: `intro-*`, `ending-*`, `room-1..4-*`
- `src/illos/set-b.ts`: `room-5..7-*`, `type-1..7`

Each file exports a `Record<string, string>` mapping slot key → SVG markup string. Add or replace
slots in your own file and touch nothing else; `src/illos/index.ts` merges the two.

## Verify
`npx tsc --noEmit` clean. To look at a drawing, either paste the SVG into a blank HTML file and open
it in a browser, or run `npm run dev` and render one from the browser console:

```js
document.body.insertAdjacentHTML('beforeend', getIllo('room-3-door'));
```
