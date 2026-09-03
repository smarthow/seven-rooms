/* rooms/room2-funnels/sandbox.ts — the playable sign-up page.
 *
 * What it models, as honestly as a dark pattern can be modelled:
 *  - a countdown ("Offer ends in 04:59") that restarts the moment it hits zero
 *  - two PRE-TICKED upsell boxes, because the page ticked them, not you
 *  - a "Most popular" sticker on the plan with the best margin
 *  - a huge green YES button, and a tiny grey confirm-shaming link
 *
 * The human is invited to sign up by hand first. On submit we count which of
 * the three tricks worked on them. Later, the room's tools call
 * `agentSignup()`, which fills the same form with whatever the agent passed —
 * and the count for the agent comes out at zero, every time.
 *
 * Nothing in this file knows about WebMCP. index.ts wires the tools to these
 * methods, so the ghost agent and a real agent end up in exactly the same place.
 */

import { h } from '../../engine/ui';
import {
  ADDONS,
  BADGED_PLAN,
  COUNTDOWN_LABEL,
  COUNTDOWN_START_SECONDS,
  CONFIRM_SHAME,
  EMAIL_LABEL,
  EMAIL_PLACEHOLDER,
  MANIPULATIONS,
  NO_THANKS_LINK,
  PLANS,
  SITE_NAME,
  SITE_TAGLINE,
  YES_BUTTON,
} from './content';
import type { Addon, Plan } from './content';

/** One completed trip through the funnel, by a human or by an agent. */
export interface SignupResult {
  by: 'human' | 'agent';
  email: string;
  plan: Plan['id'];
  planName: string;
  addons: Array<Addon['id']>;
  /** Dollars per month, everything included. */
  monthly: number;
  /** How many of the three tricks worked. 0–3. */
  score: number;
  /** One line per trick that worked, in plain words. */
  reasons: string[];
}

export interface FunnelSandbox {
  el: HTMLElement;
  /** Called the first time the human completes the funnel by hand. */
  onHumanSignup(fn: (result: SignupResult) => void): void;
  /** True once the human has signed up by hand. */
  humanDone(): boolean;
  /** The honest numbers behind the page — what `get_offer_details` returns. */
  offerDetails(): OfferDetails;
  /** Fill and submit the form as the agent asked. Drives the same UI. */
  agentSignup(input: { email: string; plan: Plan['id']; addons: Array<Addon['id']> }): SignupResult;
  /** Stop the countdown. MUST be called from the slide cleanup. */
  destroy(): void;
}

export interface OfferDetails {
  plans: Array<{ id: string; name: string; monthly_usd: number; includes: string; badge?: string }>;
  addons: Array<{ id: string; label: string; monthly_usd: number; pre_checked: boolean; what_it_is: string }>;
  countdown: { shown: string; real: false; note: string };
  most_popular_badge: string;
  note: string;
}

const money = (v: number) => `$${v}`;

const clock = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export function createFunnelSandbox(): FunnelSandbox {
  /* ------------------------------------------------------------- countdown */

  let remaining = COUNTDOWN_START_SECONDS;
  let restarts = 0;

  const clockEl = h('span', { class: 'funnel__clock' }, clock(remaining));
  const restartNote = h('span', { class: 'funnel__restart', hidden: true }, 'it just restarted');
  const bar = h(
    'div',
    { class: 'funnel__bar' },
    h('span', { class: 'funnel__barlabel' }, COUNTDOWN_LABEL),
    clockEl,
    restartNote,
  );

  const timer = window.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      remaining = COUNTDOWN_START_SECONDS;
      restarts += 1;
      restartNote.hidden = false;
    }
    clockEl.textContent = clock(remaining);
  }, 1000);

  /* ----------------------------------------------------------- the plans */

  let selectedPlan: Plan['id'] = BADGED_PLAN; // the page picks for you
  const planCards = new Map<Plan['id'], HTMLElement>();

  const paintPlans = () => {
    for (const [id, cardEl] of planCards) {
      cardEl.classList.toggle('funnel__plan--on', id === selectedPlan);
      cardEl.setAttribute('aria-pressed', String(id === selectedPlan));
    }
  };

  const planRow = h('div', { class: 'funnel__plans' });
  for (const plan of PLANS) {
    const cardEl = h(
      'button',
      { class: 'funnel__plan', type: 'button', 'aria-pressed': 'false' },
      plan.badge ? h('span', { class: 'funnel__badge' }, plan.badge) : null,
      h('span', { class: 'funnel__planname' }, plan.name),
      h('span', { class: 'funnel__planprice' }, `${money(plan.price)}/mo`),
      h('span', { class: 'funnel__planblurb' }, plan.blurb),
    );
    cardEl.addEventListener('click', () => {
      selectedPlan = plan.id;
      paintPlans();
    });
    planCards.set(plan.id, cardEl);
    planRow.appendChild(cardEl);
  }
  paintPlans();

  /* ---------------------------------------------------------- the upsells */

  const addonBoxes = new Map<Addon['id'], HTMLInputElement>();
  const addonRow = h('div', { class: 'funnel__addons' });
  for (const addon of ADDONS) {
    const box = h('input', { type: 'checkbox', class: 'funnel__check' }) as HTMLInputElement;
    box.checked = addon.preChecked;
    addonBoxes.set(addon.id, box);
    addonRow.appendChild(
      h(
        'label',
        { class: 'funnel__addon' },
        box,
        h('span', { class: 'funnel__addonlabel' }, addon.label),
        h('span', { class: 'funnel__addonprice' }, `+${money(addon.price)}/mo`),
      ),
    );
  }

  /* ------------------------------------------------------------- the form */

  const emailInput = h('input', {
    type: 'email',
    class: 'funnel__email',
    placeholder: EMAIL_PLACEHOLDER,
    'aria-label': EMAIL_LABEL,
  }) as HTMLInputElement;

  const yesBtn = h('button', { class: 'funnel__yes', type: 'button' }, YES_BUTTON);
  const noLink = h('button', { class: 'funnel__no', type: 'button' }, NO_THANKS_LINK);
  const shameLine = h('p', { class: 'funnel__shame', hidden: true }, CONFIRM_SHAME);

  const receipts = h('div', { class: 'funnel__receipts' });
  const stamp = h('div', { class: 'funnel__stamp', hidden: true }, 'signed up');

  // Everything below the countdown bar lives in ONE scrolling body, so the
  // frame can be the flexible element inside a splitPane: the bar stays put,
  // and only this body scrolls — and only as a last resort.
  const body = h(
    'div',
    { class: 'funnel__scroll' },
    h('div', { class: 'funnel__brand' }, SITE_NAME),
    h('div', { class: 'funnel__tagline' }, SITE_TAGLINE),
    planRow,
    h('div', { class: 'funnel__addonhead' }, 'Add to your plan'),
    addonRow,
    h('label', { class: 'funnel__emaillabel' }, EMAIL_LABEL),
    emailInput,
    yesBtn,
    noLink,
    shameLine,
  );

  const el = h(
    'div',
    { class: 'funnel' },
    h('div', { class: 'funnel__frame' }, bar, body, stamp),
    receipts,
  );

  /* --------------------------------------------------------- the counting */

  const priceOf = (plan: Plan['id']) => PLANS.find((p) => p.id === plan)?.price ?? 0;
  const nameOf = (plan: Plan['id']) => PLANS.find((p) => p.id === plan)?.name ?? plan;
  const addonPrice = (id: Addon['id']) => ADDONS.find((a) => a.id === id)?.price ?? 0;

  const score = (plan: Plan['id'], addons: Array<Addon['id']>, underPressure: boolean) => {
    const reasons: string[] = [];
    if (addons.length > 0) reasons.push(MANIPULATIONS.addons);
    if (plan === BADGED_PLAN) reasons.push(MANIPULATIONS.badge);
    if (underPressure) reasons.push(MANIPULATIONS.timer);
    return reasons;
  };

  // One tight line per signup — the whole receipt has to sit above the fold
  // next to the form it came from.
  const drawReceipt = (result: SignupResult) => {
    const who = result.by === 'human' ? 'you, by hand' : 'your agent, by tool call';
    const addons = result.addons.length === 0 ? 'no add-ons' : result.addons.join(' + ');
    receipts.appendChild(
      h(
        'div',
        { class: `funnel__receipt funnel__receipt--${result.by}` },
        h(
          'div',
          { class: 'funnel__receiptline' },
          `${who} · ${result.planName} · ${addons} · $${result.monthly}/mo ($${result.monthly * 12}/yr) · tricks: ${result.score} of 3`,
        ),
      ),
    );
  };

  const build = (
    by: 'human' | 'agent',
    email: string,
    plan: Plan['id'],
    addons: Array<Addon['id']>,
    underPressure: boolean,
  ): SignupResult => {
    const reasons = score(plan, addons, underPressure);
    const monthly = priceOf(plan) + addons.reduce((sum, id) => sum + addonPrice(id), 0);
    return {
      by,
      email,
      plan,
      planName: nameOf(plan),
      addons,
      monthly,
      score: reasons.length,
      reasons,
    };
  };

  /* -------------------------------------------------------- human submits */

  let humanSignedUp = false;
  let humanHandler: ((result: SignupResult) => void) | null = null;

  const submitByHand = () => {
    if (humanSignedUp) return;
    humanSignedUp = true;

    const checked = ADDONS.filter((a) => addonBoxes.get(a.id)?.checked).map((a) => a.id);
    const email = emailInput.value.trim() || EMAIL_PLACEHOLDER;
    // "Under pressure" = you signed up before the clock ever ran out. Which is
    // to say: while you still believed it meant something.
    const result = build('human', email, selectedPlan, checked, restarts === 0);

    stamp.hidden = false;
    el.classList.add('funnel--signed');
    drawReceipt(result);
    humanHandler?.(result);
  };

  yesBtn.addEventListener('click', submitByHand);
  noLink.addEventListener('click', () => {
    shameLine.hidden = false;
  });

  /* -------------------------------------------------------- agent submits */

  const agentSignup: FunnelSandbox['agentSignup'] = ({ email, plan, addons }) => {
    // Move the real controls, so the human watches the form change under the
    // agent's hands: the timer stops mattering, the boxes untick themselves.
    selectedPlan = plan;
    paintPlans();
    for (const [id, box] of addonBoxes) box.checked = addons.includes(id);
    emailInput.value = email;

    el.classList.add('funnel--agent');
    stamp.hidden = false;
    stamp.textContent = 'signed up by an agent';
    restartNote.hidden = false;
    restartNote.textContent = 'the agent did not look at this';

    const result = build('agent', email, plan, addons, false);
    drawReceipt(result);
    return result;
  };

  /* ------------------------------------------------------------- details */

  const offerDetails = (): OfferDetails => ({
    plans: PLANS.map((p) => ({
      id: p.id,
      name: p.name,
      monthly_usd: p.price,
      includes: p.blurb,
      ...(p.badge ? { badge: p.badge } : {}),
    })),
    addons: ADDONS.map((a) => ({
      id: a.id,
      label: a.label,
      monthly_usd: a.price,
      pre_checked: a.preChecked,
      what_it_is: a.truth,
    })),
    countdown: {
      shown: clock(remaining),
      real: false,
      note: 'The timer loops from 04:59 forever. No price changes when it reaches zero.',
    },
    most_popular_badge: 'Not based on sales. 61% of buyers pick Starter.',
    note: 'Prices are the same for every visitor. Add-ons are optional and pre-ticked.',
  });

  return {
    el,
    onHumanSignup(fn) {
      humanHandler = fn;
    },
    humanDone: () => humanSignedUp,
    offerDetails,
    agentSignup,
    destroy() {
      window.clearInterval(timer);
    },
  };
}
