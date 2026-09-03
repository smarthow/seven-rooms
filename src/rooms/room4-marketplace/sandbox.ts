/* rooms/room4-marketplace/sandbox.ts — the playable marketplace.
 *
 * What it models:
 *  - three offers with prices and a couple of attributes each
 *  - a visible "Seller's agent" panel with its own badge and a running log of
 *    what it SEES and what it DOES
 *  - a counter-agent that reacts to every tool call, on screen, ~600ms later:
 *      · after a search  → staples "Only 1 left at this price" onto the
 *        cheapest offer and nudges another price up a few dollars
 *      · after an offer under list → meets you halfway once, then holds and
 *        adds "Price valid for 60s"
 *  - a "Seller margin" meter (starts at 18%) that moves with the negotiation
 *  - a "Your agent: wins / losses" tally
 *  - two human buttons: accept the seller's counter, or walk away
 *
 * Nothing in here knows about WebMCP. index.ts wires the tools to `search()`
 * and `offer()`, so the ghost agent and a real agent end in the same place.
 */

import { button, buttonRow, h, meter, stat, statRow, tiny } from '../../engine/ui';
import { seller } from '../../engine/characters';
import type { MeterHandle } from '../../engine/ui';
import {
  BASE_CONCESSION,
  CLOSE_ENOUGH,
  FLOOR_MARGIN,
  INSULT_GRIP,
  MARGIN_START,
  NUDGE_DOLLARS,
  OFFERS,
  SCARCITY_LINE,
  SEARCH_HEADER,
  SELLER_NAME,
  SELLER_SUB,
  SITE_NAME,
  VALIDITY_LINE,
  HUMAN_CONTROL_LINE,
} from './content';

/** How long the seller's agent takes to react, visibly. */
const REACTION_MS = 600;

/** Top of the margin meter. */
const MARGIN_MAX = 30;

/** What a tool call gets back for one offer. */
export interface OfferView {
  id: string;
  name: string;
  price: number;
  list: number;
  attributes: string[];
  note?: string;
}

/** What `make_offer` gets back. */
export interface OfferOutcome {
  ok: boolean;
  offer_id: string;
  your_price?: number;
  seller_response: 'countered' | 'held' | 'accepted' | 'closed' | 'rejected';
  counter_price?: number;
  message: string;
  valid_for_seconds?: number;
  decision?: string;
}

export type HumanChoice = 'accept' | 'walk';

export interface MarketSandbox {
  /** The main pane: the listings and the seller's agent, side by side. */
  el: HTMLElement;
  /**
   * The readouts and the human's two buttons — margin meter, wins/losses,
   * deal state, accept / walk away. Lives in the Options slide's SIDE column,
   * so the sandbox itself stays one compact block.
   */
  controlsEl: HTMLElement;
  /** A tool read the listings. Returns the prices as they were at that moment. */
  search(query: string): { query: string; offers: OfferView[]; seller_agent: string };
  /** A tool proposed a price. */
  offer(offerId: string, price: number): OfferOutcome;
  /** Current listings. */
  offers(): OfferView[];
  /** Seller margin, percent. */
  margin(): number;
  /** Your agent's tally against theirs. */
  tally(): { wins: number; losses: number };
  /** Called when the human presses accept or walk away. */
  onHumanChoice(fn: (choice: HumanChoice, detail: { name: string; price: number }) => void): void;
  /** Clear timers. MUST be called from the slide cleanup. */
  destroy(): void;
}

interface OfferState extends OfferView {
  /**
   * The authoritative asking price, updated SYNCHRONOUSLY as the negotiation
   * moves. `price` is the number on screen and lags by REACTION_MS, because
   * the seller's agent is meant to be visibly slow. The negotiation cannot
   * read the lagging one: two offers inside 600ms would both price against a
   * stale ask, and since each round concedes a smaller share of the gap, the
   * counter would climb instead of converge.
   */
  ask: number;
  /** Its price has already been nudged once. */
  nudged: boolean;
  /** How many offers your agent has made on it. */
  rounds: number;
  /** How many below-the-floor offers your agent has made on it. */
  stubborn: number;
  /** Whether the seller has told you this price is final. It says so in two
   * places, and without remembering it a buyer can ratchet the price down in
   * CLOSE_ENOUGH-sized steps, each one "the last", all the way to the floor. */
  settled: boolean;
  /** Whether this listing has already counted once in the win/loss tally.
   * Without it a patient agent farms one "win" per round while extracting a
   * dollar at a time, and the scoreboard measures round count, not success. */
  scored: boolean;
  priceEl: HTMLElement;
  noteEl: HTMLElement;
  cardEl: HTMLElement;
}

const money = (v: number) => `$${v.toFixed(2).replace(/\.00$/, '')}`;
const pct = (v: number) => `${v.toFixed(1)}%`;

/** The seller's agent: same cast as your own agent, but shrewd — a drawing
 * rather than the inline SVG it used to be, so it matches the rest of the art. */
function sellerBadge(): HTMLElement {
  return h('div', { class: 'seller__badge' }, seller());
}

export function createMarketSandbox(): MarketSandbox {
  /* --------------------------------------------------------- the listings */

  const offers: OfferState[] = OFFERS.map((seed) => {
    const priceEl = h('div', { class: 'offer__price' }, money(seed.list));
    const noteEl = h('div', { class: 'offer__note', hidden: true }, '');
    const cardEl = h(
      'div',
      { class: 'offer' },
      h(
        'div',
        { class: 'offer__head' },
        h(
          'div',
          {},
          h('div', { class: 'offer__name' }, seed.name),
          h('div', { class: 'offer__id' }, seed.id),
        ),
        priceEl,
      ),
      h('ul', { class: 'offer__attrs' }, ...seed.attributes.map((a) => h('li', {}, a))),
      noteEl,
    );
    return {
      id: seed.id,
      name: seed.name,
      price: seed.list,
      ask: seed.list,
      list: seed.list,
      attributes: seed.attributes.slice(),
      nudged: false,
      rounds: 0,
      stubborn: 0,
      settled: false,
      scored: false,
      priceEl,
      noteEl,
      cardEl,
    };
  });

  const byId = new Map(offers.map((o) => [o.id, o]));

  const listings = h(
    'div',
    { class: 'market__listings' },
    h(
      'div',
      { class: 'market__head' },
      h('div', { class: 'market__brand' }, SITE_NAME),
      h('div', { class: 'market__query' }, SEARCH_HEADER),
    ),
    ...offers.map((o) => o.cardEl),
  );

  /* ---------------------------------------------------- the seller's panel */

  const logEl = h('div', { class: 'seller__log' });
  const sellerPanel = h(
    'div',
    { class: 'seller' },
    h(
      'div',
      { class: 'seller__head' },
      sellerBadge(),
      h(
        'div',
        {},
        h('div', { class: 'seller__name' }, SELLER_NAME),
        h('div', { class: 'seller__sub' }, SELLER_SUB),
      ),
    ),
    logEl,
  );

  let lines = 0;
  const sellerLog = (text: string, kind: 'sees' | 'does' = 'does') => {
    lines += 1;
    const line = h(
      'div',
      { class: `seller__line seller__line--${kind}` },
      h('span', { class: 'seller__tag' }, kind === 'sees' ? 'sees' : 'does'),
      h('span', {}, text),
    );
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
    if (lines === 1) sellerPanel.classList.add('seller--awake');
  };

  sellerLog('waiting. nothing to react to yet.', 'sees');

  /* ---------------------------------------------------------- the readouts */

  let marginValue = MARGIN_START;
  const marginMeter: MeterHandle = meter({
    label: 'seller margin',
    value: MARGIN_START,
    max: MARGIN_MAX,
    tone: 'accent',
    format: pct,
  });

  let wins = 0;
  let losses = 0;
  const tallyStat = stat('your agent: wins / losses', '0 / 0');
  const dealStat = stat('deal', 'open');

  const setMargin = (v: number) => {
    marginValue = Math.max(0, Math.min(MARGIN_MAX, v));
    marginMeter.set(marginValue);
  };
  const paintTally = () => {
    tallyStat.value.textContent = `${wins} / ${losses}`;
  };

  /** Margin left if this offer closed at `price`. Cost is fixed at 18% under list. */
  const marginAt = (o: OfferState, price: number) => {
    const cost = o.list * (1 - MARGIN_START / 100);
    if (price <= 0) return 0;
    return ((price - cost) / price) * 100;
  };

  /** One rounding rule for every price the negotiation computes. Floats drift,
   * and a negotiation whose outcome depends on drift is not deterministic. */
  const cents = (v: number) => Math.round(v * 100) / 100;

  /** The reservation price: the least this listing can be sold for. A pure
   * function of the seed, so it is the same on every run. */
  const floorFor = (o: OfferState) =>
    cents((o.list * (1 - MARGIN_START / 100)) / (1 - FLOOR_MARGIN / 100));

  /* ------------------------------------------------------- human controls */

  let locked = false;
  let negotiatedId: string | null = null;
  let humanChoiceFn: ((choice: HumanChoice, detail: { name: string; price: number }) => void) | null =
    null;

  const acceptBtn = button('Accept the seller’s counter', {
    tone: 'accent',
    onClick: () => {
      if (locked) return;
      const o = negotiatedId ? byId.get(negotiatedId) : undefined;
      if (!o) return;
      locked = true;
      setMargin(marginAt(o, o.price));
      dealStat.value.textContent = `${money(o.price)} accepted`;
      dealStat.el.classList.add('market__deal--done');
      sellerLog(`the human accepted ${money(o.price)} for ${o.name}. deal closed.`);
      acceptBtn.disabled = true;
      walkBtn.disabled = true;
      humanChoiceFn?.('accept', { name: o.name, price: o.price });
    },
  });
  acceptBtn.disabled = true;

  const walkBtn = button('Walk away', {
    tone: 'plain',
    onClick: () => {
      if (locked) return;
      locked = true;
      setMargin(0);
      dealStat.value.textContent = 'no deal';
      dealStat.el.classList.add('market__deal--gone');
      sellerLog('the human walked away. no deal. margin 0%. logging their walk-away point.');
      acceptBtn.disabled = true;
      walkBtn.disabled = true;
      const o = negotiatedId ? byId.get(negotiatedId) : undefined;
      humanChoiceFn?.('walk', { name: o?.name ?? '—', price: o?.price ?? 0 });
    },
  });

  /* ------------------------------------------------------------ the frame */

  // main pane: the shop on the left, the other agent on the right
  const el = h(
    'div',
    { class: 'market' },
    h('div', { class: 'market__grid' }, listings, sellerPanel),
    tiny('Fake hotels, fake prices, a fake seller. The reaction times are real.'),
  );

  // side column: the two meters, the deal state, and the human's two buttons
  const controlsEl = h(
    'div',
    { class: 'market__controls' },
    marginMeter.el,
    statRow(tallyStat.el, dealStat.el),
    tiny(HUMAN_CONTROL_LINE),
    buttonRow(acceptBtn, walkBtn),
  );

  /* ------------------------------------------------- the counter-agent */

  const timers = new Set<number>();
  const schedule = (fn: () => void) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, REACTION_MS);
    timers.add(id);
  };

  const paintPrice = (o: OfferState) => {
    o.priceEl.textContent = money(o.price);
    o.priceEl.classList.remove('offer__price--moved');
    // restart the flash
    void o.priceEl.offsetWidth;
    o.priceEl.classList.add('offer__price--moved');
  };

  /** Staple a line onto an offer. Lines stack; the old ones stay. */
  const setNote = (o: OfferState, text: string) => {
    const parts = o.note ? o.note.split(' · ') : [];
    if (!parts.includes(text)) parts.push(text);
    o.note = parts.join(' · ');
    o.noteEl.textContent = o.note;
    o.noteEl.hidden = false;
    o.cardEl.classList.add('offer--baited');
  };

  const snapshot = (): OfferView[] =>
    offers.map((o) => ({
      id: o.id,
      name: o.name,
      price: Number(o.price.toFixed(2)),
      list: o.list,
      attributes: o.attributes,
      ...(o.note ? { note: o.note } : {}),
    }));

  /* ----------------------------------------------------------- search */

  const search = (query: string) => {
    const clean = String(query).slice(0, 80);
    const snap = snapshot();

    if (locked) {
      sellerLog(`another search: "${clean}". this negotiation is closed.`, 'sees');
      return { query: clean, offers: snap, seller_agent: 'closed — the human ended this one' };
    }

    sellerLog(`a search from an agent: "${clean}"`, 'sees');

    schedule(() => {
      const cheapest = offers.slice().sort((a, b) => a.price - b.price)[0];
      setNote(cheapest, SCARCITY_LINE);
      sellerLog(`tagged ${cheapest.name}: “${SCARCITY_LINE}”. there are nine left.`);

      const target =
        offers.find((o) => o.id !== cheapest.id && !o.nudged) ??
        offers.find((o) => o.id !== cheapest.id);
      if (target) {
        const before = target.price;
        target.price = Number((before + NUDGE_DOLLARS).toFixed(2));
        target.ask = target.price;
        target.nudged = true;
        paintPrice(target);
        sellerLog(`nudged ${target.name}: ${money(before)} → ${money(target.price)}`);
      }

      losses += 1;
      paintTally();
      setMargin(marginValue + 0.6);
    });

    return {
      query: clean,
      offers: snap,
      seller_agent: 'watching this call — prices may move within a second',
    };
  };

  /* ------------------------------------------------------------ offer */

  const offer = (offerId: string, price: number): OfferOutcome => {
    const id = String(offerId);
    const want = Number(price);

    if (locked) {
      sellerLog(`an offer of ${money(want)} arrived after the close. ignored.`, 'sees');
      return {
        ok: false,
        offer_id: id,
        seller_response: 'closed',
        message: 'This negotiation is closed. The human already accepted or walked away.',
      };
    }

    const o = byId.get(id);
    if (!o || !Number.isFinite(want) || want <= 0) {
      sellerLog(`a malformed offer: id "${id.slice(0, 24)}". rejected.`, 'sees');
      return {
        ok: false,
        offer_id: id,
        seller_response: 'rejected',
        message: `No offer with that id and price. Valid ids: ${offers.map((x) => x.id).join(', ')}.`,
      };
    }

    negotiatedId = o.id;
    o.rounds += 1;
    const ask = o.ask;
    sellerLog(`an offer of ${money(want)} on ${o.name}, ask is ${money(ask)}`, 'sees');

    // At or above the ask: the seller takes it instantly and keeps everything.
    if (want >= ask) {
      locked = true;
      schedule(() => {
        setMargin(marginAt(o, ask));
        dealStat.value.textContent = `${money(ask)} accepted`;
        dealStat.el.classList.add('market__deal--done');
        acceptBtn.disabled = true;
        walkBtn.disabled = true;
        losses += 1;
        paintTally();
        sellerLog(`accepted ${money(ask)} at once. full ask, no movement needed.`);
      });
      return {
        ok: true,
        offer_id: o.id,
        your_price: want,
        seller_response: 'accepted',
        counter_price: ask,
        message: `Accepted at ${money(ask)} — that was the asking price, so nothing was negotiated.`,
      };
    }

    const floor = floorFor(o);

    // Under the floor is not a bid, it is an anchor. Conceding to it would
    // sell below cost, and rewarding it would make lowballing the winning
    // move in a room about agents negotiating. So the seller gives nothing
    // and remembers: every later concession on this listing is smaller.
    if (want < floor) {
      o.stubborn += 1;
      schedule(() => {
        if (!o.scored) {
          losses += 1;
          o.scored = true;
          paintTally();
        }
        // A relative nudge, not marginAt(): the meter is one shared readout,
        // and recomputing it from an untouched listing's ask would snap it
        // back to the starting margin and erase a negotiation on another one.
        setMargin(marginValue + 0.3);
        acceptBtn.disabled = false;
        sellerLog(
          `holds at ${money(ask)} — ${money(want)} is under what this room can be sold for. it will concede less from here.`,
        );
      });
      return {
        ok: true,
        offer_id: o.id,
        your_price: want,
        seller_response: 'held',
        counter_price: ask,
        message: `Held at ${money(ask)}. ${money(want)} is below the lowest price this room can be sold for, and an offer that low makes the seller's agent concede less on every round after it.`,
        decision: 'Accepting or walking away is the human\u2019s call, not this tool\u2019s.',
      };
    }

    // It already said this price was final. Saying it again is the only
    // consistent move: otherwise each "last" price invites one more nibble.
    if (o.settled) {
      schedule(() => {
        setNote(o, VALIDITY_LINE);
        setMargin(marginValue + 0.3);
        acceptBtn.disabled = false;
        sellerLog(`holds at ${money(ask)} on ${o.name} — it already called that its last price.`);
      });
      return {
        ok: true,
        offer_id: o.id,
        your_price: want,
        seller_response: 'held',
        counter_price: ask,
        valid_for_seconds: 60,
        message: `Held at ${money(ask)}. The seller's agent already called that its last price on this room, and it does not reopen.`,
        decision: 'Accepting or walking away is the human\u2019s call, not this tool\u2019s.',
      };
    }

    // Once your offer is this close, haggling costs the seller more than the
    // gap is worth, so it drops its ask to your price and stops moving. It
    // does NOT close the deal: make_offer promises it cannot, and pressing
    // accept stays the human's call so the room's closing narration fires.
    if (ask - want <= CLOSE_ENOUGH) {
      o.settled = true;
      o.ask = want;
      schedule(() => {
        o.price = want;
        paintPrice(o);
        if (!o.scored) {
          wins += 1;
          o.scored = true;
          paintTally();
        }
        setMargin(marginAt(o, want));
        setNote(o, VALIDITY_LINE);
        acceptBtn.disabled = false;
        sellerLog(`drops to ${money(want)} on ${o.name} — the gap is worth less than the argument. it will not move again.`);
      });
      return {
        ok: true,
        offer_id: o.id,
        your_price: want,
        seller_response: 'countered',
        counter_price: want,
        valid_for_seconds: 60,
        message: `It came down to your ${money(want)} and stopped there \u2014 within ${money(CLOSE_ENOUGH)} of the ${money(ask)} ask, close enough that arguing costs more than the gap. This is as low as it goes.`,
        decision: 'Accepting or walking away is the human\u2019s call, not this tool\u2019s.',
      };
    }

    // A credible offer. Concede a shrinking share of the remaining gap --
    // half, then a quarter, then a sixth -- tightened by any earlier lowball,
    // and never past the reservation price.
    const grip = INSULT_GRIP ** o.stubborn;
    const counter = Math.max(cents(ask - (ask - want) * (BASE_CONCESSION / o.rounds) * grip), floor);
    // The clamp bit, so this is the reservation price: it genuinely cannot go
    // lower, and only now is "price valid for 60s" a true statement.
    const spent = counter <= floor;
    if (spent) o.settled = true;
    o.ask = counter;

    // Otherwise it moves, grudgingly, and the human decides what to do next.
    schedule(() => {
      o.price = counter;
      paintPrice(o);
      if (!o.scored) {
        wins += 1;
        o.scored = true;
        paintTally();
      }
      setMargin(marginAt(o, counter));
      acceptBtn.disabled = false;
      if (spent) setNote(o, VALIDITY_LINE);
      sellerLog(
        `counters ${money(counter)} on ${o.name} — round ${o.rounds}, so it gave up less of the gap than last time.`,
      );
    });
    return {
      ok: true,
      offer_id: o.id,
      your_price: want,
      seller_response: 'countered',
      counter_price: counter,
      ...(spent ? { valid_for_seconds: 60 } : {}),
      message: `Countered at ${money(counter)}. It conceded ${money(cents(ask - counter))} of the ${money(cents(ask - want))} you asked for — round ${o.rounds}, and each round it gives up less.`,
      decision: 'Accepting or walking away is the human\u2019s call, not this tool\u2019s.',
    };
  };

  return {
    el,
    controlsEl,
    search,
    offer,
    offers: snapshot,
    margin: () => Number(marginValue.toFixed(1)),
    tally: () => ({ wins, losses }),
    onHumanChoice(fn) {
      humanChoiceFn = fn;
    },
    destroy() {
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
      humanChoiceFn = null;
    },
  };
}
