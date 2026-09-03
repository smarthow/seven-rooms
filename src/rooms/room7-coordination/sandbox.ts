/* rooms/room7-coordination/sandbox.ts — the group decision.
 *
 * What it models:
 *  - one proposal ("Should this site let agents vote?")
 *  - 60 seeded positions from previous visitors, each with a receipt badge
 *    (human = coral, agent = teal, mixed = striped) and a one-line reason
 *  - a live tally bar with a big FOR / AGAINST result label
 *  - the human's own position, cast by hand with two buttons and an optional
 *    reason, and the agent's position, cast through a tool
 *  - the switch the whole room is built for: "Count humans only", which
 *    recomputes the tally without `agent` receipts and flips the result
 *
 * Rule stated in the UI, because small rules decide real votes: a `mixed`
 * receipt counts as human, since a person put their name on it.
 *
 * Nothing in here knows about WebMCP. index.ts wires the tools to these
 * methods, so the ghost agent and a real agent land in exactly the same place.
 */

import { h } from '../../engine/ui';
import type { Counts, Position, Receipt, Stance, TallyByReceipt } from './seed';
import { SEED_POSITIONS, tallyPositions } from './seed';
import {
  CAST_HELP,
  CAST_LABEL,
  PROPOSAL_META,
  PROPOSAL_SHORT,
  PROPOSAL_TITLE,
  REASON_PLACEHOLDER,
  SITE_NAME,
} from './content';

/** How long the result label keeps its highlight after a flip. */
const FLASH_MS = 900;

export type Result = 'for' | 'against' | 'tie';

const RECEIPT_LABEL: Record<Receipt, string> = {
  human: 'human',
  agent: 'agent',
  mixed: 'mixed',
};

export interface VoteSandbox {
  /**
   * The main column: the proposal card, the tally bar with its result label,
   * the "Count humans only" switch and the list of positions. The list is the
   * one element in this room allowed to scroll internally.
   */
  el: HTMLElement;
  /**
   * The human's own cast — two buttons and an optional reason. It lives in the
   * SIDE column of the split, next to the tools, so the tally and the list get
   * the whole main column.
   */
  castEl: HTMLElement;
  /** Seeded counts, split by receipt. Does not include you or your agent. */
  seedTally(): TallyByReceipt;
  /** Everything currently on the board, including you and your agent. */
  totals(humansOnly?: boolean): Counts;
  result(humansOnly?: boolean): Result;
  /** The human casts by hand. Returns false if they already have. */
  castHuman(stance: Stance, reason: string): boolean;
  /** The agent casts through a tool. A second call replaces its position. */
  castAgent(stance: Stance, reason: string): void;
  humanStance(): Stance | null;
  agentStance(): Stance | null;
  /** Show the "Count humans only" switch. Called after the first tool call. */
  revealSwitch(): void;
  humansOnly(): boolean;
  /** Notified when the human casts by hand. */
  onHumanCast(fn: (stance: Stance) => void): void;
  /** Notified when the switch is flipped. */
  onSwitch(fn: (humansOnly: boolean) => void): void;
  destroy(): void;
}

function ago(minutes: number): string {
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** One row in the list of positions. `mine` marks you and your agent. */
function positionRow(p: Position, mine?: 'you' | 'your agent'): HTMLElement {
  return h(
    'div',
    { class: `prop__row${mine ? ' prop__row--mine' : ''}` },
    h(
      'div',
      { class: 'prop__rowtop' },
      h('span', { class: `prop__badge prop__badge--${p.by}` }, RECEIPT_LABEL[p.by]),
      h('span', { class: `prop__stance prop__stance--${p.stance}` }, p.stance),
      mine ? h('span', { class: 'prop__mine' }, mine) : null,
      h('span', { class: 'prop__when' }, ago(p.minutesAgo)),
    ),
    h('div', { class: 'prop__reason' }, p.reason),
  );
}

export function createVoteSandbox(): VoteSandbox {
  /* --------------------------------------------------------------- state */

  let human: Position | null = null;
  let agent: Position | null = null;
  let humansOnlyOn = false;
  let flashTimer = 0;
  let lastResult: Result | null = null;

  let humanCastFn: (stance: Stance) => void = () => {};
  let switchFn: (humansOnly: boolean) => void = () => {};

  const all = (): Position[] => {
    const mine: Position[] = [];
    if (human) mine.push(human);
    if (agent) mine.push(agent);
    return [...mine, ...SEED_POSITIONS];
  };

  /** `mixed` counts as human: a person put their name on it. */
  const counted = (): Position[] =>
    humansOnlyOn ? all().filter((p) => p.by !== 'agent') : all();

  const totalsFor = (onlyHumans: boolean): Counts => {
    const list = onlyHumans ? all().filter((p) => p.by !== 'agent') : all();
    return {
      for: list.filter((p) => p.stance === 'for').length,
      against: list.filter((p) => p.stance === 'against').length,
    };
  };

  const resultFor = (onlyHumans: boolean): Result => {
    const c = totalsFor(onlyHumans);
    if (c.for > c.against) return 'for';
    if (c.against > c.for) return 'against';
    return 'tie';
  };

  /* ------------------------------------------------------- the proposal */

  // Compact on purpose: two printed lines. `read_proposal()` still returns the
  // full text, so the agent sees more than the card does.
  const proposal = h(
    'div',
    { class: 'prop__proposal' },
    h(
      'div',
      { class: 'prop__head' },
      h('span', { class: 'prop__kicker' }, SITE_NAME),
      h('span', { class: 'prop__meta' }, PROPOSAL_META),
    ),
    h('h3', { class: 'prop__title' }, PROPOSAL_TITLE),
    h('p', { class: 'prop__body' }, PROPOSAL_SHORT),
  );

  /* ------------------------------------------------------- the tally bar */

  const forFill = h('div', { class: 'prop__fill prop__fill--for' });
  const againstFill = h('div', { class: 'prop__fill prop__fill--against' });
  const forLabel = h('span', { class: 'prop__barlabel' }, 'for 0');
  const againstLabel = h('span', { class: 'prop__barlabel' }, 'against 0');
  const resultEl = h('div', { class: 'prop__result' }, 'result: —');
  const scopeEl = h('div', { class: 'prop__scope' }, 'counting everyone');

  const bar = h(
    'div',
    { class: 'prop__bar' },
    h('div', { class: 'prop__track' }, forFill, againstFill),
    h('div', { class: 'prop__barlabels' }, forLabel, againstLabel),
  );

  /* ---------------------------------------------------------- the switch */

  const switchInput = h('input', {
    type: 'checkbox',
    class: 'prop__switchbox',
    id: 'room7-humans-only',
  }) as HTMLInputElement;

  const switchWrap = h(
    'div',
    { class: 'prop__switch', hidden: true },
    h(
      'label',
      { class: 'prop__switchlabel', for: 'room7-humans-only' },
      switchInput,
      h('span', {}, 'Count humans only'),
    ),
    h(
      'div',
      { class: 'prop__switchnote' },
      'Agent receipts drop out. Mixed receipts stay — a person signed those.',
    ),
  );

  /* ---------------------------------------------------- the human's cast */

  const reasonInput = h('input', {
    type: 'text',
    class: 'prop__input',
    maxlength: '110',
    placeholder: REASON_PLACEHOLDER,
    'aria-label': 'your reason, optional',
  }) as HTMLInputElement;

  const forBtn = h('button', { type: 'button', class: 'prop__cast prop__cast--for' }, 'For') as HTMLButtonElement;
  const againstBtn = h('button', { type: 'button', class: 'prop__cast prop__cast--against' }, 'Against') as HTMLButtonElement;
  const castNote = h('div', { class: 'prop__castnote' }, CAST_HELP);

  // Label and buttons share one row: in the side column of the split there is
  // no height to spend on a heading of its own.
  const castBox = h(
    'div',
    { class: 'prop__cast-box' },
    h(
      'div',
      { class: 'prop__castrow' },
      h('span', { class: 'prop__castlabel' }, CAST_LABEL),
      forBtn,
      againstBtn,
    ),
    reasonInput,
    castNote,
  );

  /* ------------------------------------------------------------ the list */

  const list = h('div', { class: 'prop__list', tabindex: '0', 'aria-label': 'positions from other visitors' });

  // The main column. `castBox` is NOT in here — it belongs to the side column,
  // so the tally, the switch and the list own the whole width.
  const el = h(
    'div',
    { class: 'propvote' },
    proposal,
    bar,
    h('div', { class: 'prop__resultrow' }, resultEl, scopeEl),
    switchWrap,
    list,
  );

  /* ------------------------------------------------------------ painting */

  const paintList = () => {
    list.replaceChildren();
    if (human) list.appendChild(positionRow(human, 'you'));
    if (agent) list.appendChild(positionRow(agent, 'your agent'));
    for (const p of SEED_POSITIONS) {
      const row = positionRow(p);
      if (humansOnlyOn && p.by === 'agent') row.classList.add('prop__row--muted');
      list.appendChild(row);
    }
  };

  const paintTally = () => {
    const c = totalsFor(humansOnlyOn);
    const total = Math.max(1, c.for + c.against);
    forFill.style.width = `${(c.for / total) * 100}%`;
    againstFill.style.width = `${(c.against / total) * 100}%`;
    forLabel.textContent = `for ${c.for}`;
    againstLabel.textContent = `against ${c.against}`;

    const r = resultFor(humansOnlyOn);
    resultEl.textContent =
      r === 'tie' ? 'result: no majority' : `result: ${r.toUpperCase()}`;
    resultEl.classList.toggle('prop__result--for', r === 'for');
    resultEl.classList.toggle('prop__result--against', r === 'against');
    scopeEl.textContent = humansOnlyOn
      ? `counting humans and mixed only · ${counted().length} positions`
      : `counting everyone · ${all().length} positions`;

    if (lastResult !== null && lastResult !== r) {
      resultEl.classList.remove('prop__result--flip');
      // Force the animation to restart even if it fired a moment ago.
      void resultEl.offsetWidth;
      resultEl.classList.add('prop__result--flip');
      window.clearTimeout(flashTimer);
      flashTimer = window.setTimeout(
        () => resultEl.classList.remove('prop__result--flip'),
        FLASH_MS,
      );
    }
    lastResult = r;
  };

  const repaint = () => {
    paintTally();
    paintList();
  };

  /* ------------------------------------------------------------- actions */

  const castHuman = (stance: Stance, reason: string): boolean => {
    if (human) return false;
    human = {
      id: 'you',
      stance,
      by: 'human',
      reason: reason.trim() || 'No reason given.',
      minutesAgo: 0,
    };
    forBtn.disabled = true;
    againstBtn.disabled = true;
    reasonInput.disabled = true;
    forBtn.classList.toggle('prop__cast--picked', stance === 'for');
    againstBtn.classList.toggle('prop__cast--picked', stance === 'against');
    castNote.textContent = `Cast: ${stance}. One position per account, so that is yours.`;
    repaint();
    humanCastFn(stance);
    return true;
  };

  const castAgent = (stance: Stance, reason: string) => {
    agent = {
      id: 'your-agent',
      stance,
      by: 'agent',
      reason: reason.trim() || 'No reason given.',
      minutesAgo: 0,
    };
    el.classList.add('prop--agent-voted');
    repaint();
  };

  const onFor = () => castHuman('for', reasonInput.value);
  const onAgainst = () => castHuman('against', reasonInput.value);
  const onSwitchChange = () => {
    humansOnlyOn = switchInput.checked;
    el.classList.toggle('prop--humans-only', humansOnlyOn);
    repaint();
    switchFn(humansOnlyOn);
  };

  forBtn.addEventListener('click', onFor);
  againstBtn.addEventListener('click', onAgainst);
  switchInput.addEventListener('change', onSwitchChange);

  repaint();

  return {
    el,
    castEl: castBox,
    seedTally: () => tallyPositions(SEED_POSITIONS),
    totals: (onlyHumans = humansOnlyOn) => totalsFor(onlyHumans),
    result: (onlyHumans = humansOnlyOn) => resultFor(onlyHumans),
    castHuman,
    castAgent,
    humanStance: () => (human ? human.stance : null),
    agentStance: () => (agent ? agent.stance : null),
    revealSwitch() {
      if (!switchWrap.hidden) return;
      switchWrap.hidden = false;
      switchWrap.classList.add('prop__switch--in');
    },
    humansOnly: () => humansOnlyOn,
    onHumanCast(fn) {
      humanCastFn = fn;
    },
    onSwitch(fn) {
      switchFn = fn;
    },
    destroy() {
      window.clearTimeout(flashTimer);
      forBtn.removeEventListener('click', onFor);
      againstBtn.removeEventListener('click', onAgainst);
      switchInput.removeEventListener('change', onSwitchChange);
    },
  };
}
