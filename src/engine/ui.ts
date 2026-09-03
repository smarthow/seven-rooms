/* engine/ui.ts — the tiny DOM toolkit every slide is built from.
 *
 * Rules of the house:
 *  - No framework, no template strings for content (only for inline SVG).
 *  - Every widget returns a real DOM node, and stateful widgets return a small
 *    handle ({ el, set() }) so a slide can animate them later.
 *  - Classes come from src/styles/components.css. Don't inline styles unless
 *    the value is genuinely dynamic (a width, a colour picked at runtime).
 */

import { getIllo } from '../illos';

/* ------------------------------------------------------------------------ h */

export type Attrs = Record<string, string | number | boolean | EventListener | null | undefined>;
export type Child = Node | string | number | null | undefined | false | Child[];

/**
 * h('div', { class: 'card' }, 'hello', otherNode)
 *
 * - `class`, `id`, `href`, `type`, `aria-*`, `data-*` … set as attributes.
 * - keys starting with `on` (onclick, oninput) take a function listener.
 * - `false`, `null` and `undefined` children are skipped, so you can write
 *   `cond && node` inline.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2), value as EventListener);
      } else if (value === true) {
        el.setAttribute(key, '');
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }
  append(el, children);
  return el;
}

/** Append children (nested arrays allowed) to any element. */
export function append(el: Element, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(el, child);
    else if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else el.appendChild(child);
  }
}

/**
 * Wrap AUTHORED INLINE SVG as a node. That is the only use.
 *
 * This is `innerHTML`. Never build markup here out of anything that came from
 * a tool call, a form field, or the activity log — not even a value that looks
 * safe today, because tomorrow it comes from a caller. Everything with content
 * in it is built with `h()`, which sets text as text.
 */
export function raw(markup: string, className?: string): HTMLElement {
  const box = document.createElement('div');
  if (className) box.className = className;
  box.innerHTML = markup;
  return box;
}

/** Remove every child of an element. */
export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/* ------------------------------------------------------------------- text */

/** Big hero line (title screens). */
export function hero(text: string): HTMLElement {
  return h('h1', { class: 'hero' }, text);
}

/** Standard slide title. */
export function title(text: string): HTMLElement {
  return h('h2', { class: 'title' }, text);
}

/** The one-sentence idea of the slide. */
export function lead(text: string): HTMLElement {
  return h('p', { class: 'lead' }, text);
}

/** Body paragraph, comfortable measure. */
export function para(text: string): HTMLElement {
  return h('p', { class: 'body' }, text);
}

/** Small hand-written kicker above a title. */
export function eyebrow(text: string): HTMLElement {
  return h('p', { class: 'eyebrow' }, text);
}

/** Hand-written aside. */
export function hand(text: string): HTMLElement {
  return h('p', { class: 'hand' }, text);
}

/** Short faint footnote. */
export function tiny(text: string): HTMLElement {
  return h('p', { class: 'tiny' }, text);
}

/** A vertical stack of blocks that fills the slide width. */
export function stack(...children: Child[]): HTMLElement {
  return h('div', { class: 'stack' }, ...children);
}

/**
 * A stack whose additions are announced by a screen reader. Use it for the
 * narrator's reaction box: the reaction IS the payoff of every room, and it
 * appears without any navigation, so it has to be a live region or a
 * screen-reader user simply never hears the point of the slide.
 */
export function liveStack(...children: Child[]): HTMLElement {
  return h('div', { class: 'stack', role: 'status', 'aria-live': 'polite' }, ...children);
}

/**
 * A dashed paper receipt: one short line per row. Rooms 1 and 4 print the
 * "what each side got" tally with it after the first tool call.
 *
 * `className` picks the room's own skin (`article__receipt`,
 * `market__receipt`); rows get `<that>line`.
 */
export function receipt(lines: string[], className = 'market__receipt'): HTMLElement {
  return h(
    'div',
    { class: className },
    ...lines.map((line) => h('div', { class: `${className}line` }, line)),
  );
}

/* ---------------------------------------------------------------- bubbles */

/**
 * A speech bubble. `who` picks the voice:
 *  - 'narrator' — plain, honest, slightly wry. The default voice of the site.
 *  - 'human'    — coral, the visitor.
 *  - 'agent'    — teal, the agent.
 */
export function bubble(text: string, who: 'narrator' | 'human' | 'agent' = 'narrator'): HTMLElement {
  const names = { narrator: '', human: 'you', agent: 'your agent' } as const;
  const label = names[who];
  return h(
    'div',
    { class: `bubble bubble--${who}` },
    label ? h('span', { class: 'bubble__who' }, label) : null,
    h('span', {}, text),
  );
}

/* ------------------------------------------------------------------ cards */

/** A titled paper card. `body` may be text or nodes. */
export function card(cardTitle: string, body: Child): HTMLElement {
  return h(
    'div',
    { class: 'card' },
    h('div', { class: 'card__title' }, cardTitle),
    h('div', { class: 'card__body' }, body),
  );
}

/** A responsive row of cards / stats. */
export function cardRow(...children: Child[]): HTMLElement {
  return h('div', { class: 'cardrow' }, ...children);
}

/* -------------------------------------------------------------- tool cards */

/** What a tool card needs — a subset of PageTool from src/webmcp/bridge.ts. */
export interface ToolCardTool {
  name: string;
  description: string;
}

/* ------------------------------------------------------------- promptHint */

/**
 * A suggested sentence for the visitor to type to their own agent, with a
 * copy button. Falls back to selecting the text if the clipboard is blocked.
 */
export function promptHint(text: string): HTMLElement {
  const textEl = h(
    'div',
    { class: 'prompthint__text' },
    h('span', { class: 'prompthint__label' }, 'try saying this to your agent'),
    h('span', {}, `"${text}"`),
  );

  const btn = h('button', { class: 'prompthint__copy', type: 'button' }, 'copy');
  btn.addEventListener('click', () => {
    const done = () => {
      btn.textContent = 'copied';
      window.setTimeout(() => (btn.textContent = 'copy'), 1400);
    };
    try {
      void navigator.clipboard.writeText(text).then(done, () => selectNode(textEl));
    } catch {
      selectNode(textEl);
    }
  });

  return h('div', { class: 'prompthint' }, textEl, btn);
}

function selectNode(el: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/* ----------------------------------------------------------------- meters */

export interface MeterOptions {
  label: string;
  /** Starting value. */
  value: number;
  /** Full-bar value. */
  max: number;
  /** How the number is printed. Default: rounded integer. */
  format?: (v: number) => string;
  /** Fill colour role. Default 'accent'. */
  tone?: 'accent' | 'agent' | 'human' | 'good' | 'danger';
}

export interface MeterHandle {
  el: HTMLElement;
  /** Animate to a new value (CSS transition, ~600ms). */
  set(v: number): void;
  /** Current value. */
  value(): number;
}

/** A labelled bar that animates when you `set()` it. */
export function meter(opts: MeterOptions): MeterHandle {
  const format = opts.format ?? ((v: number) => String(Math.round(v)));
  const tone = opts.tone ?? 'accent';

  const valueEl = h('span', { class: 'meter__value' }, format(opts.value));
  const fill = h('div', { class: 'meter__fill' });
  const el = h(
    'div',
    { class: `meter meter--${tone}` },
    h(
      'div',
      { class: 'meter__head' },
      h('span', { class: 'meter__label' }, opts.label),
      valueEl,
    ),
    h('div', { class: 'meter__track' }, fill),
  );

  let current = opts.value;
  const paint = () => {
    const pct = opts.max === 0 ? 0 : Math.max(0, Math.min(100, (current / opts.max) * 100));
    fill.style.width = `${pct}%`;
    valueEl.textContent = format(current);
  };
  // paint on the next frame so the very first fill animates in
  requestAnimationFrame(paint);

  return {
    el,
    set(v: number) {
      current = v;
      paint();
    },
    value: () => current,
  };
}

/* ---------------------------------------------------------------- counter */

/**
 * Count a number up (or down) inside `el` over ~700ms.
 * Returns a stop function; safe to call again to retarget mid-flight.
 */
export function counter(
  el: HTMLElement,
  from: number,
  to: number,
  format: (v: number) => string = (v) => String(Math.round(v)),
  durationMs = 700,
): () => void {
  let raf = 0;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    // ease-out so the last digits settle instead of slamming
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = format(from + (to - from) * eased);
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/** A labelled number tile. Returns the tile and its value element. */
export function stat(
  label: string,
  value: string,
): { el: HTMLElement; value: HTMLElement } {
  const valueEl = h('div', { class: 'stat__value' }, value);
  const el = h('div', { class: 'stat' }, h('div', { class: 'stat__label' }, label), valueEl);
  return { el, value: valueEl };
}

/** A responsive row of stat tiles. */
export function statRow(...children: Child[]): HTMLElement {
  return h('div', { class: 'statrow' }, ...children);
}

/* ------------------------------------------------------------- twoFutures */

export interface FuturePanel {
  title: string;
  bullets: string[];
}

/**
 * Side by side: the bad future (danger-tinted, left) and the bright future
 * (good-tinted, right). Three short, concrete bullets each. No abstractions.
 *
 * It must fit one screen, so keep bullets to ~16 words. `badIllo` /
 * `brightIllo` name illo slots (`room-N-bad`, `room-N-bright`) drawn small at
 * the top of each panel; a missing slot renders nothing.
 */
export function twoFutures(opts: {
  bad: FuturePanel;
  bright: FuturePanel;
  badIllo?: string;
  brightIllo?: string;
}): HTMLElement {
  const panel = (kind: 'bad' | 'bright', kicker: string, p: FuturePanel, art?: string) =>
    h(
      'div',
      { class: `future future--${kind}` },
      art ? illo(art, { size: 'sm' }) : null,
      h('div', { class: 'future__kicker' }, kicker),
      h('div', { class: 'future__title' }, p.title),
      h('ul', { class: 'future__list' }, ...p.bullets.map((b) => h('li', {}, b))),
    );

  return h(
    'div',
    { class: 'futures' },
    panel('bad', 'the bad future', opts.bad, opts.badIllo),
    panel('bright', 'the bright future', opts.bright, opts.brightIllo),
  );
}

/* ---------------------------------------------------------------- buttons */

export interface ButtonOptions {
  /** Visual role. 'ghost' = the teal "Run ghost agent" button. */
  tone?: 'plain' | 'ghost' | 'accent';
  /** Small hand-written tag inside the button, e.g. "simulation". */
  tag?: string;
  onClick(): void;
}

export function button(label: string, opts: ButtonOptions): HTMLButtonElement {
  const tone = opts.tone ?? 'plain';
  const btn = h(
    'button',
    { class: `btn btn--${tone}`, type: 'button' },
    label,
    opts.tag ? h('span', { class: 'btn__tag' }, opts.tag) : null,
  );
  btn.addEventListener('click', () => opts.onClick());
  return btn;
}

/** A centered, wrapping row of buttons. */
export function buttonRow(...children: Child[]): HTMLElement {
  return h('div', { class: 'btnrow' }, ...children);
}

/** A short "thinking…" line, used while a ghost agent works. */
export function thinking(text = ''): HTMLElement {
  return h('div', { class: 'thinking' }, text);
}

/* ======================================================================== */
/* ABOVE THE FOLD — the layout system every slide uses on desktop.           */
/*                                                                          */
/* The rule (docs/ROOM_GUIDE.md §"Above the fold"): at >= 768px the page     */
/* itself must never scroll. The stage is exactly one viewport tall. A slide */
/* is a compact header row (fitHeader) plus one flexible body row (fitBody   */
/* or splitPane) that may scroll *internally* if it truly has to.            */
/* ======================================================================== */

/* ------------------------------------------------------------- fitHeader */

/** Longest lead line a compact header will print before it gets clipped. */
export const FIT_LEAD_MAX = 110;

/**
 * The compact header row of an above-the-fold slide: a hand-written eyebrow,
 * a title (clamp ~26–34px) and at most ONE short lead line.
 *
 * The lead is a label, not an explanation. Anything longer than
 * `FIT_LEAD_MAX` characters belongs on the room's Door slide (`room.lead`),
 * not above the sandbox — it is truncated here so a long paragraph can never
 * push the body below the fold.
 */
export function fitHeader(opts: { eyebrow: string; title: string; lead?: string }): HTMLElement {
  let leadText = opts.lead?.trim();
  if (leadText && leadText.length > FIT_LEAD_MAX) {
    console.warn(
      `[ui] fitHeader lead is ${leadText.length} chars (max ${FIT_LEAD_MAX}). ` +
        'Move the explanation to the Door slide (room.lead).',
    );
    leadText = `${leadText.slice(0, FIT_LEAD_MAX - 1).trimEnd()}…`;
  }
  return h(
    'div',
    { class: 'fithead' },
    h('p', { class: 'eyebrow' }, opts.eyebrow),
    h('h2', { class: 'fithead__title' }, opts.title),
    leadText ? h('p', { class: 'fithead__lead' }, leadText) : null,
  );
}

/* --------------------------------------------------------------- fitBody */

/**
 * The one flexible body row of an above-the-fold slide. Takes the space the
 * header left over (`flex: 1 1 auto; min-height: 0`) and centers its content
 * vertically, so a short slide sits in the middle of the screen instead of
 * clinging to the header.
 */
export function fitBody(...children: Child[]): HTMLElement {
  return h('div', { class: 'fitbody' }, ...children);
}

/**
 * Same as `fitBody`, but scrolls internally when its content is genuinely
 * longer than the screen (the ending's report card is the one legitimate
 * case). The *page* still does not scroll.
 */
export function fitScroll(...children: Child[]): HTMLElement {
  return h('div', { class: 'fitbody fitbody--scroll' }, ...children);
}

/* -------------------------------------------------------------- splitPane */

/**
 * Two columns on desktop, stacked below 768px (where the page may scroll).
 *
 *  - `main` — the sandbox. Gets `ratio`% of the width (default 58).
 *  - `side` — the tool cards, the promptHint, the ghost button, the narrator
 *             bubble. Scrolls internally if a reaction makes it grow.
 *
 * This IS the Options-slide body row: `fitHeader(...)` then
 * `splitPane({ main: sandbox.el, side: … })` and nothing else.
 */
export function splitPane(opts: { main: Child; side: Child; ratio?: number }): HTMLElement {
  const ratio = Math.min(80, Math.max(20, opts.ratio ?? 58));
  const el = h(
    'div',
    { class: 'split' },
    h('div', { class: 'split__main' }, opts.main),
    h('div', { class: 'split__side' }, opts.side),
  );
  el.style.setProperty('--split-main', `${ratio}fr`);
  el.style.setProperty('--split-side', `${100 - ratio}fr`);
  return el;
}

/* -------------------------------------------------------- compactToolCards */

/**
 * The tool cards as a tight vertical list — tool name in monospace, one line
 * of description each. This is what every Options slide uses; the side column
 * has no room for anything boxier.
 */
export function compactToolCards(tools: ToolCardTool[]): HTMLElement {
  return h(
    'div',
    { class: 'toollist' },
    h('div', { class: 'toollist__head' }, 'tools your agent can call'),
    ...tools.map((tool) =>
      h(
        'div',
        { class: 'toollist__item', 'data-tool': tool.name },
        h('div', { class: 'toollist__name' }, `${tool.name}()`),
        h('div', { class: 'toollist__desc' }, tool.description),
      ),
    ),
  );
}

/* ------------------------------------------------------------------ illo */

/** True when the illustration registry has this slot filled. */
export function hasIllo(name: string): boolean {
  return typeof getIllo(name) === 'string';
}

/**
 * Render the inline SVG registered for `name` in src/illos.
 *
 * Slot keys are listed in docs/ILLO_STYLE.md (`room-N-door`, `room-N-bad`,
 * `room-N-bright`, `type-N`, `ending-walls`, `ending-report`, `intro-*`).
 *
 * When the slot is still empty this returns an EMPTY, hidden element — never a
 * broken box, never a gap. Illustrations are filled in in parallel, so every
 * slide must look finished without them.
 */
export function illo(name: string, opts?: { size?: 'sm' | 'md' | 'lg' }): HTMLElement {
  const markup = getIllo(name);
  if (!markup) {
    return h('div', { class: 'illo illo--empty', hidden: true, 'data-illo': name });
  }
  const box = raw(markup, `illo illo--${opts?.size ?? 'md'}`);
  box.setAttribute('data-illo', name);
  return box;
}
