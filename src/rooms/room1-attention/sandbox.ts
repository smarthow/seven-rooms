/* rooms/room1-attention/sandbox.ts — the playable article.
 *
 * What it models:
 *  - a scrollable news article with ads between the paragraphs
 *  - a reading-progress meter driven by real scrolling
 *  - an "ad revenue" counter that ticks at $0.0004/s ONLY while the human is
 *    actually scrolling the article (stop scrolling and the money stops)
 *  - a "seconds you spent" counter, counting the same active seconds
 *
 * The room's tools call `skipToEnd()`: progress jumps to 100%, the revenue
 * drops to $0.00 and the page marks itself as read by a machine.
 *
 * Nothing in here knows about WebMCP. That separation is deliberate: index.ts
 * wires tools to these methods, and the ghost agent and a real agent both end
 * up in the same place.
 */

import { h, meter } from '../../engine/ui';
import type { MeterHandle } from '../../engine/ui';
import {
  AD_SLOTS,
  ARTICLE_BYLINE,
  ARTICLE_PARAGRAPHS,
  ARTICLE_TITLE,
  SITE_NAME,
} from './content';

/** Money the page earns per second of human attention. */
export const RATE_PER_SECOND = 0.0004;

/** How long after a scroll event we still count the human as "reading". */
const ACTIVE_WINDOW_MS = 1200;

/** Tick resolution of the money/seconds counters. */
const TICK_MS = 100;

export interface ArticleSandbox {
  el: HTMLElement;
  /** Human-scroll reading progress, 0–100. */
  progress: MeterHandle;
  /** The agent read it: progress to 100%, revenue to zero. */
  skipToEnd(): void;
  /** Seconds the human actually spent reading. */
  humanSeconds(): number;
  /** Dollars the page earned from the human. */
  revenue(): number;
  /** True once a tool has read the article. */
  wasSkipped(): boolean;
  /** Stop timers and listeners. MUST be called from the slide cleanup. */
  destroy(): void;
}

const money = (v: number) => `$${v.toFixed(4)}`;

export function createArticleSandbox(): ArticleSandbox {
  /* ------------------------------------------------------------- the page */

  const body = h('div', { class: 'article__body' });
  ARTICLE_PARAGRAPHS.forEach((text, i) => {
    body.appendChild(h('p', { class: 'article__p' }, text));
    const ad = AD_SLOTS[i];
    if (ad) body.appendChild(h('div', { class: 'article__ad' }, ad));
  });

  const scroller = h(
    'div',
    { class: 'article__scroll', tabindex: '0', 'aria-label': 'the article' },
    h('div', { class: 'article__kicker' }, SITE_NAME),
    h('h3', { class: 'article__title' }, ARTICLE_TITLE),
    h('div', { class: 'article__byline' }, ARTICLE_BYLINE),
    body,
    h('div', { class: 'article__end' }, 'end of article'),
  );

  /* ------------------------------------------------------------- readouts */

  const progress = meter({
    label: 'you have read',
    value: 0,
    max: 100,
    tone: 'human',
    format: (v) => `${Math.round(v)}%`,
  });

  const revenueEl = h('div', { class: 'stat__value' }, money(0));
  const secondsEl = h('div', { class: 'stat__value' }, '0s');

  const readouts = h(
    'div',
    { class: 'statrow' },
    h(
      'div',
      { class: 'stat article__stat--money' },
      h('div', { class: 'stat__label' }, 'ad revenue from you'),
      revenueEl,
    ),
    h(
      'div',
      { class: 'stat' },
      h('div', { class: 'stat__label' }, 'seconds you spent'),
      secondsEl,
    ),
  );

  const badge = h('div', { class: 'article__badge', hidden: true }, 'read by a machine');

  const el = h(
    'div',
    { class: 'article' },
    h('div', { class: 'article__frame' }, scroller, badge),
    progress.el,
    readouts,
    h('p', { class: 'tiny' }, `This page earns ${money(RATE_PER_SECOND)} per second you keep reading.`),
  );

  /* --------------------------------------------------------------- state */

  let seconds = 0;
  let earned = 0;
  let lastScrollAt = 0;
  let skipped = false;
  let bestProgress = 0;

  let lastTop = 0;

  /** Read the scroll position and bank any progress the human just made. */
  const sampleScroll = (): boolean => {
    const top = scroller.scrollTop;
    const moved = Math.abs(top - lastTop) > 0.5;
    lastTop = top;
    const max = scroller.scrollHeight - scroller.clientHeight;
    const pct = max <= 0 ? 100 : (top / max) * 100;
    if (pct > bestProgress) {
      bestProgress = Math.min(100, pct);
      progress.set(bestProgress);
    }
    return moved;
  };

  /** Any of these means "the human is here, reading". */
  const markActive = () => {
    if (skipped) return;
    lastScrollAt = performance.now();
    el.classList.add('article--reading');
  };

  const onScroll = () => {
    if (skipped) return;
    sampleScroll();
    markActive();
  };

  scroller.addEventListener('scroll', onScroll, { passive: true });
  scroller.addEventListener('wheel', markActive, { passive: true });
  scroller.addEventListener('pointermove', markActive, { passive: true });
  scroller.addEventListener('touchmove', markActive, { passive: true });
  scroller.addEventListener('keydown', markActive);

  const timer = window.setInterval(() => {
    if (skipped) return;
    // Poll as well as listen: some browsers do not fire `scroll` for
    // programmatic or inertial movement, and the meter must never lie.
    if (sampleScroll()) markActive();
    const active = performance.now() - lastScrollAt < ACTIVE_WINDOW_MS;
    if (!active) {
      el.classList.remove('article--reading');
      return;
    }
    seconds += TICK_MS / 1000;
    earned += RATE_PER_SECOND * (TICK_MS / 1000);
    revenueEl.textContent = money(earned);
    secondsEl.textContent = `${seconds.toFixed(1)}s`;
  }, TICK_MS);

  /* --------------------------------------------------------- the skip */

  const skipToEnd = () => {
    if (skipped) return;
    skipped = true;
    el.classList.remove('article--reading');
    el.classList.add('article--skipped');
    badge.hidden = false;

    progress.set(100);
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });

    // The money the page made from this reader: nothing.
    earned = 0;
    revenueEl.textContent = money(0);
    revenueEl.classList.add('article__money--dropped');
  };

  return {
    el,
    progress,
    skipToEnd,
    humanSeconds: () => Number(seconds.toFixed(1)),
    revenue: () => earned,
    wasSkipped: () => skipped,
    destroy() {
      window.clearInterval(timer);
      scroller.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('wheel', markActive);
      scroller.removeEventListener('pointermove', markActive);
      scroller.removeEventListener('touchmove', markActive);
      scroller.removeEventListener('keydown', markActive);
    },
  };
}
