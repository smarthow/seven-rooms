/* engine/characters.ts — the two actors, drawn as inline SVG.
 *
 * Human: round head, two dot eyes, coral. happy | surprised | worried.
 * Agent: rounded square head, one wide visor eye, teal. idle | thinking | done.
 *
 * Deliberately simple: a few strokes, no gradients. Every character returns a
 * handle so a slide can change the expression later (`.set('worried')`) or dim
 * the agent at the end (`.dark(true)`).
 */

import { h, raw } from './ui';

export type HumanMood = 'happy' | 'surprised' | 'worried';
export type AgentState = 'idle' | 'thinking' | 'done';

export interface CharacterHandle<S extends string> {
  el: HTMLElement;
  set(state: S): void;
  /** Dim to grey — used by the ending when the tools close. */
  dark(on: boolean): void;
  state(): S;
}

const INK = 'var(--ink)';
const HUMAN = 'var(--human)';
const AGENT = 'var(--agent)';
const PAPER = 'var(--paper-card)';

/* ------------------------------------------------------------------ human */

function humanSvg(mood: HumanMood): string {
  // eyes: dots, except "surprised" which widens them
  const eyeR = mood === 'surprised' ? 5 : 3.6;
  const brows =
    mood === 'worried'
      ? `<path d="M20 25 L31 29" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
         <path d="M60 25 L49 29" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
      : '';
  const mouth =
    mood === 'happy'
      ? `<path d="M30 55 Q40 64 50 55" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
      : mood === 'surprised'
        ? `<circle cx="40" cy="57" r="5.5" fill="none" stroke="${INK}" stroke-width="3"/>`
        : `<path d="M30 60 Q40 52 50 60" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;

  return `<svg viewBox="0 0 80 104" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="the human, looking ${mood}">
    <path d="M22 96 L22 78 M58 96 L58 78" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <rect x="20" y="72" width="40" height="12" rx="6" fill="${HUMAN}" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="40" cy="42" r="32" fill="${HUMAN}" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="29" cy="38" r="${eyeR}" fill="${INK}"/>
    <circle cx="51" cy="38" r="${eyeR}" fill="${INK}"/>
    ${brows}
    ${mouth}
  </svg>`;
}

/** The visitor. Default mood: happy. */
export function human(mood: HumanMood = 'happy'): CharacterHandle<HumanMood> {
  const art = raw(humanSvg(mood));
  const el = h('div', { class: 'char char--human' }, art, h('span', { class: 'char__name' }, 'you'));
  let current = mood;
  return {
    el,
    set(next: HumanMood) {
      current = next;
      art.innerHTML = humanSvg(next);
    },
    dark(on: boolean) {
      el.classList.toggle('char--dark', on);
    },
    state: () => current,
  };
}

/* ------------------------------------------------------------------ agent */

function agentSvg(state: AgentState): string {
  // one wide visor eye; the pupil moves and the visor changes with the state
  const visor =
    state === 'thinking'
      ? `<rect x="20" y="34" width="40" height="14" rx="7" fill="${PAPER}" stroke="${INK}" stroke-width="2.5"/>
         <circle cx="30" cy="41" r="3.4" fill="${AGENT}">
           <animate attributeName="cx" values="30;50;30" dur="1.6s" repeatCount="indefinite"/>
         </circle>`
      : state === 'done'
        ? `<rect x="20" y="34" width="40" height="14" rx="7" fill="${PAPER}" stroke="${INK}" stroke-width="2.5"/>
           <path d="M32 41 L38 46 L50 35" fill="none" stroke="${AGENT}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<rect x="20" y="34" width="40" height="14" rx="7" fill="${PAPER}" stroke="${INK}" stroke-width="2.5"/>
           <circle cx="40" cy="41" r="3.4" fill="${AGENT}"/>`;

  return `<svg viewBox="0 0 80 104" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="the agent, ${state}">
    <path d="M22 96 L22 80 M58 96 L58 80" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <rect x="20" y="72" width="40" height="12" rx="6" fill="${AGENT}" stroke="${INK}" stroke-width="2.5"/>
    <path d="M40 14 L40 6" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="40" cy="4" r="3.2" fill="${INK}"/>
    <rect x="10" y="14" width="60" height="48" rx="16" fill="${AGENT}" stroke="${INK}" stroke-width="2.5"/>
    ${visor}
    <path d="M28 55 L52 55" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity="0.55"/>
  </svg>`;
}

/** The agent. Default state: idle. */
export function agent(state: AgentState = 'idle'): CharacterHandle<AgentState> {
  const art = raw(agentSvg(state));
  const el = h(
    'div',
    { class: 'char char--agent' },
    art,
    h('span', { class: 'char__name' }, 'your agent'),
  );
  let current = state;
  const apply = (next: AgentState) => {
    current = next;
    art.innerHTML = agentSvg(next);
    el.classList.toggle('char--thinking', next === 'thinking');
  };
  apply(state);
  return {
    el,
    set: apply,
    dark(on: boolean) {
      el.classList.toggle('char--dark', on);
    },
    state: () => current,
  };
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
