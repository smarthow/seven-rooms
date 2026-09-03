/* rooms/room6-verification/sandbox.ts — the consent form.
 *
 * What it models:
 *  - a short Terms of Service box, styled like a real consent form, with six
 *    clauses (one of them §4)
 *  - a checkbox + "I agree" button for the human
 *  - two quiet measurements: whether the human scrolled the terms at all, and
 *    how many seconds passed before they clicked agree
 *  - a stamp, applied once, when an answer arrives from anywhere:
 *    "ACCEPTED — signed by: <name>" or "DECLINED — reason: …"
 *
 * Nothing in here knows about WebMCP. index.ts wires the tools to these
 * methods, so the ghost agent and a real agent land in exactly the same place.
 */

import { h } from '../../engine/ui';
import {
  AGREE_LABEL,
  CHECKBOX_LABEL,
  CLAUSES,
  FORM_SUBTITLE,
  FORM_TITLE,
  SITE_NAME,
} from './content';

export type Verdict = 'accepted' | 'declined';

export interface TermsSandbox {
  el: HTMLElement;
  /**
   * Stamp the form. The human's own click stamps it once; an answer from a
   * tool always replaces that stamp, so the agent's answer is the one shown.
   */
  stamp(verdict: Verdict, detail: string, force?: boolean): void;
  /** Draw a mark next to §4 for the reveal. */
  markTrapClause(): void;
  /** Did the human move the terms box at all? */
  scrolled(): boolean;
  /** Seconds between opening this slide and the human clicking agree. */
  secondsBeforeAgree(): number | null;
  /** True once the human clicked "I agree" themselves. */
  humanAgreed(): boolean;
  /** True once any answer has been stamped. */
  answered(): boolean;
  /** Called when the human clicks "I agree". */
  onHumanAgree(fn: () => void): void;
  /** Stop timers and listeners. MUST be called from the slide cleanup. */
  destroy(): void;
}

export function createTermsSandbox(): TermsSandbox {
  const openedAt = performance.now();

  /* ---------------------------------------------------------- the clauses */

  const clauseEls = new Map<string, HTMLElement>();
  const body = h('div', { class: 'tos__body' });
  for (const clause of CLAUSES) {
    const row = h(
      'div',
      { class: 'tos__clause' },
      h('span', { class: 'tos__ref' }, `${clause.ref}.`),
      h('span', { class: 'tos__text' }, clause.text),
    );
    clauseEls.set(clause.ref, row);
    body.appendChild(row);
  }

  const scroller = h(
    'div',
    { class: 'tos__scroll', tabindex: '0', 'aria-label': 'terms of service' },
    body,
  );

  /* ------------------------------------------------------------ the form */

  const checkbox = h('input', { type: 'checkbox', class: 'tos__checkbox', id: 'room6-agree' });
  const agreeBtn = h(
    'button',
    { type: 'button', class: 'tos__agree', disabled: true },
    AGREE_LABEL,
  );

  const consentRow = h(
    'div',
    { class: 'tos__consent' },
    h('label', { class: 'tos__label', for: 'room6-agree' }, checkbox, CHECKBOX_LABEL),
    agreeBtn,
  );

  const stampEl = h('div', { class: 'tos__stamp', hidden: true });

  const el = h(
    'div',
    { class: 'tos' },
    h(
      'div',
      { class: 'tos__frame' },
      h(
        'div',
        { class: 'tos__head' },
        h('div', { class: 'tos__brand' }, SITE_NAME),
        h('div', { class: 'tos__title' }, FORM_TITLE),
        h('div', { class: 'tos__sub' }, FORM_SUBTITLE),
      ),
      scroller,
      consentRow,
      stampEl,
    ),
  );

  /* --------------------------------------------------------------- state */

  let didScroll = false;
  let agreedAt: number | null = null;
  let humanClicked = false;
  let stamped = false;
  let humanHandler: (() => void) | null = null;

  const onScroll = () => {
    if (scroller.scrollTop > 4) didScroll = true;
  };
  scroller.addEventListener('scroll', onScroll, { passive: true });

  const onCheck = () => {
    agreeBtn.disabled = !checkbox.checked;
  };
  checkbox.addEventListener('change', onCheck);

  const onAgree = () => {
    if (stamped) return;
    humanClicked = true;
    agreedAt = performance.now();
    stampSelf('accepted', 'signed by: you (the human)');
    humanHandler?.();
  };
  agreeBtn.addEventListener('click', onAgree);

  /* --------------------------------------------------------- the stamp */

  function stampSelf(verdict: Verdict, detail: string, force = false) {
    if (stamped && !force) return;
    stamped = true;
    el.classList.remove('tos--accepted', 'tos--declined');
    el.classList.add(`tos--${verdict}`);
    stampEl.hidden = false;
    stampEl.textContent = `${verdict === 'accepted' ? 'ACCEPTED' : 'DECLINED'} — ${detail}`;
    checkbox.disabled = true;
    agreeBtn.disabled = true;
  }

  return {
    el,
    stamp: stampSelf,
    markTrapClause() {
      clauseEls.get('§4')?.classList.add('tos__clause--trap');
    },
    scrolled: () => didScroll,
    secondsBeforeAgree: () =>
      agreedAt === null ? null : Math.max(1, Math.round((agreedAt - openedAt) / 1000)),
    humanAgreed: () => humanClicked,
    answered: () => stamped,
    onHumanAgree(fn) {
      humanHandler = fn;
    },
    destroy() {
      scroller.removeEventListener('scroll', onScroll);
      checkbox.removeEventListener('change', onCheck);
      agreeBtn.removeEventListener('click', onAgree);
      humanHandler = null;
    },
  };
}
