/* engine/characters.ts — the two actors, as raster drawings.
 *
 * Human: coral, round head. happy | surprised | worried.
 * Agent: teal, one wide visor eye. idle | thinking | done.
 *
 * Every character returns a handle so a slide can change the expression later
 * (`.set('worried')`) or dim the agent at the end (`.dark(true)`).
 *
 * These were inline SVG. Three things made the swap safe to do as a drop-in:
 *
 *  - The three poses of a character share one frame. They were cropped to the
 *    UNION of their bounding boxes, not to each pose's own, so nothing shifts
 *    when `.set()` swaps one for another.
 *  - Each frame is padded to the 80:104 aspect of the `<svg>` it replaces, so
 *    `.char svg { width: clamp(74px, 18vw, 104px) }` gives the image the same
 *    footprint the drawing had and no row it sits in changes height.
 *  - Every pose is preloaded at module load. `.set()` is called mid-interaction
 *    when a tool runs, and a first fetch there would blink.
 *
 * What was lost: the `thinking` visor had a SMIL pupil sweeping side to side.
 * The bob that reads as "working" is `.char--thinking`'s CSS animation, which
 * survives untouched — so the state still moves, just without the pupil.
 */

import { h } from './ui';

export type HumanMood = 'happy' | 'surprised' | 'worried';
export type AgentState = 'idle' | 'thinking' | 'done';

export interface CharacterHandle<S extends string> {
  el: HTMLElement;
  set(state: S): void;
  /** Dim to grey — used by the ending when the tools close. */
  dark(on: boolean): void;
  state(): S;
}

/* Eager: Vite resolves each to a hashed asset URL at build time. */
const files = import.meta.glob('./cast/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const url = (name: string): string => files[`./cast/${name}.png`] ?? '';

/* Warm every pose now, so swapping state later never waits on the network. */
for (const src of Object.values(files)) {
  const pre = new Image();
  pre.src = src;
}

/** One figure whose art swaps between named poses. */
function figure<S extends string>(
  cls: string,
  name: string,
  initial: S,
  asset: (s: S) => string,
  label: (s: S) => string,
): CharacterHandle<S> {
  const img = h('img', {
    class: 'char__img',
    src: url(asset(initial)),
    alt: label(initial),
    width: 320,
    height: 416,
    decoding: 'async',
    draggable: 'false',
  }) as HTMLImageElement;
  const el = h('div', { class: `char ${cls}` }, img, h('span', { class: 'char__name' }, name));
  let current = initial;
  return {
    el,
    set(next: S) {
      current = next;
      img.src = url(asset(next));
      img.alt = label(next);
      el.classList.toggle('char--thinking', next === 'thinking');
    },
    dark(on: boolean) {
      el.classList.toggle('char--dark', on);
    },
    state: () => current,
  };
}

/** The visitor. Default mood: happy. */
export function human(mood: HumanMood = 'happy'): CharacterHandle<HumanMood> {
  return figure('char--human', 'you', mood, (m) => `human-${m}`, (m) => `the human, looking ${m}`);
}

/** The agent. Default state: idle. */
export function agent(state: AgentState = 'idle'): CharacterHandle<AgentState> {
  const handle = figure(
    'char--agent',
    'your agent',
    state,
    (s) => `agent-${s}`,
    (s) => `the agent, ${s}`,
  );
  // The class drives the "working" bob, so set it for the initial state too.
  handle.el.classList.toggle('char--thinking', state === 'thinking');
  return handle;
}

/** The seller's agent from room 4 — a counterpart, not on your side. */
export function seller(): HTMLElement {
  return h('img', {
    // Only `seller__art`: room 4 sizes this one itself, and `char__img`'s
    // width clamp would fight that rule.
    class: 'seller__art',
    src: url('seller-badge'),
    alt: "the seller's agent",
    width: 320,
    height: 416,
    decoding: 'async',
    draggable: 'false',
  });
}

/** Both characters side by side, ready to drop into a slide. */
export function cast(
  mood: HumanMood = 'happy',
  state: AgentState = 'idle',
): { el: HTMLElement; human: CharacterHandle<HumanMood>; agent: CharacterHandle<AgentState> } {
  const hu = human(mood);
  const ag = agent(state);
  return { el: h('div', { class: 'chars' }, hu.el, ag.el), human: hu, agent: ag };
}
