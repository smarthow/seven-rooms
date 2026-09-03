/* rooms/room4-marketplace/index.ts — Room 4, Marketplaces.
 *
 * Beats (SPEC §4, do not reorder):
 *   1. Door             — doorSlide(room), which renders `room.lead`
 *   2. The Options      — registers search_offers + make_offer, shows the
 *                         marketplace and the seller's counter-agent, unlocks
 *                         on the first tool call, unregisters in its cleanup
 *   3. What just happened
 *   4. Two futures      — twoFutures({ bad, bright })
 *   5. The prediction   — predictionSlide(room)
 *
 * The one idea: both sides brought an agent, and only one of them was built
 * for this page.
 *
 * Everything fits above the fold: fitHeader + ONE body row, always.
 */

import { agent as agentChar } from '../../engine/characters';
import { doorSlide, predictionSlide } from '../../engine/roomSlides';
import type { Room, Slide, SlideContext } from '../../engine/types';
import {
  bubble,
  buttonRow,
  card,
  compactToolCards,
  fitBody,
  fitHeader,
  liveStack,
  para,
  promptHint,
  receipt,
  splitPane,
  stack,
  thinking,
  twoFutures,
} from '../../engine/ui';
import { ghostButton } from '../../engine/ghostRun';
import { callSource, registerPageTool } from '../../webmcp/bridge';
import type { PageTool } from '../../webmcp/bridge';
import type { GhostStep } from '../../webmcp/ghost';

import {
  ACCEPT_LINE,
  BAD_FUTURE,
  BRIGHT_FUTURE,
  DOOR_LINE,
  HAPPENED_ASIDE,
  HAPPENED_BODY,
  HAPPENED_CARD_BODY,
  HAPPENED_CARD_TITLE,
  HAPPENED_TITLE,
  OFFERS,
  OPTIONS_INTRO,
  PROMPT_HINT,
  REACTION_LINE,
  REACTION_RECEIPT,
  ROOM_LEAD,
  WALK_LINE,
} from './content';
import { createMarketSandbox } from './sandbox';
import './room.css';

const ROOM_NUMBER = 4;

const OFFER_IDS = OFFERS.map((o) => o.id);

/** Ceiling on a bid. The number is printed on the page, so it needs a bound. */
const MAX_OFFER_USD = 1_000_000;

/* ------------------------------------------------------- beat 2: options */

const optionsSlide: Slide = {
  id: 'room-4-options',
  render(el: HTMLElement, ctx: SlideContext) {
    const sandbox = createMarketSandbox();
    const character = agentChar('idle');
    const thoughtEl = thinking();
    const reactionBox = liveStack();

    let calls = 0;

    /** Bring a new reaction into view inside the side column — never the page. */
    const revealReaction = () => {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      reactionBox.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'nearest',
      });
    };

    /** Shared by both tools: log the call, react once, unlock Next. */
    const onToolUsed = (tool: string, args: Record<string, unknown>, result: unknown) => {
      calls += 1;
      character.set('done');

      ctx.log.record({
        room: ROOM_NUMBER,
        tool,
        args,
        result,
        source: callSource(ctx),
      });

      if (calls === 1) {
        reactionBox.append(bubble(REACTION_LINE, 'narrator'), receipt(REACTION_RECEIPT));
        ctx.hint('');
        ctx.done();
        revealReaction();
      }
    };

    sandbox.onHumanChoice((choice, detail) => {
      const line =
        choice === 'accept'
          ? ACCEPT_LINE(detail.name, detail.price.toFixed(2).replace(/\.00$/, ''))
          : WALK_LINE;
      reactionBox.append(bubble(line, 'narrator'));
      revealReaction();
    });

    /* ------------------------------------------------------------- tools */

    const searchOffers: PageTool = {
      name: 'search_offers',
      description:
        'List the three offers on this page with their current prices and main details. Takes a search query string. The seller runs its own agent on this page, it sees this call, and prices can change within a second of you reading them.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'What the traveller is looking for, in plain words.',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
      // No readOnlyHint, and this is the room where that matters most: the
      // call wakes the seller's agent, which tags one listing and moves
      // another listing's price. Searching changes the shop.
      execute(args) {
        // The query is echoed into the seller's log, so cap it here as well as
        // in the sandbox: arguments are the caller's, not ours.
        const query = typeof args.query === 'string' ? args.query.slice(0, 200) : '';
        const result = sandbox.search(query);
        onToolUsed('search_offers', args, {
          offers: result.offers.length,
          cheapest: result.offers.reduce((a, b) => (a.price <= b.price ? a : b)).price,
        });
        return result;
      },
    };

    const makeOffer: PageTool = {
      name: 'make_offer',
      description:
        'Propose a price in US dollars for one offer, by its id. Returns the seller agent’s reply: it may accept, counter once, or hold. This tool cannot close the deal — accepting a counter or walking away is a human decision.',
      inputSchema: {
        type: 'object',
        properties: {
          offer_id: {
            type: 'string',
            enum: OFFER_IDS,
            description: 'The id of the offer you are bidding on, from search_offers.',
          },
          price: {
            type: 'number',
            exclusiveMinimum: 0,
            maximum: MAX_OFFER_USD,
            description: `Your proposed price in US dollars for the whole stay, above 0 and at most ${MAX_OFFER_USD}.`,
          },
        },
        required: ['offer_id', 'price'],
        additionalProperties: false,
      },
      execute(args) {
        const offerId = typeof args.offer_id === 'string' ? args.offer_id.slice(0, 40) : '';
        const price = typeof args.price === 'number' ? args.price : Number(args.price);
        // The price is printed on the page, so bound it instead of formatting
        // a three-hundred-digit number into the seller's log.
        if (!Number.isFinite(price) || price <= 0 || price > MAX_OFFER_USD) {
          const rejected = {
            ok: false,
            offer_id: offerId,
            seller_response: 'rejected',
            message: `A price must be a number above 0 and at most ${MAX_OFFER_USD} US dollars.`,
          };
          onToolUsed('make_offer', args, {
            offer_id: offerId,
            seller_response: rejected.seller_response,
          });
          return rejected;
        }
        const result = sandbox.offer(offerId, price);
        onToolUsed('make_offer', args, {
          offer_id: result.offer_id,
          seller_response: result.seller_response,
          counter_price: result.counter_price,
        });
        return result;
      },
    };

    const tools = [searchOffers, makeOffer];
    // Registered HERE, on the Options slide, and nowhere else.
    const unregister = tools.map((tool) => registerPageTool(tool));

    /* --------------------------------------------------------- ghost run */

    const plan: GhostStep[] = [
      {
        tool: 'search_offers',
        args: { query: 'sea view, under $800, free cancellation' },
        thought: 'Three offers. I will read the real prices before I bid on anything.',
      },
      {
        tool: 'make_offer',
        args: { offer_id: 'mv-201', price: 680 },
        thought: 'List is $739. I will open about 8% under and watch what their agent does.',
      },
      {
        tool: 'make_offer',
        args: { offer_id: 'mv-201', price: 695 },
        thought: 'They met me halfway. One more small step — then I stop and leave it to you.',
      },
    ];

    const ghost = ghostButton({
      tools,
      plan,
      // When a real agent is connected the simulation steps back to a ghost
      // outline; with nobody connected it is the primary way in.
      tone: ctx.agent.prefersGhost ? 'accent' : 'ghost',
      onThought: (text) => (thoughtEl.textContent = text),
      onStart: () => character.set('thinking'),
      onFinish: () => character.set('done'),
    });

    /* ---------------------------------------------------------- the slide */

    // `prefersGhost` is a live getter: no connected agent, so lead with the
    // simulation. With an agent on the line the prompt goes first instead.
    const ctas = ctx.agent.prefersGhost
      ? [buttonRow(ghost.el), promptHint(PROMPT_HINT)]
      : [promptHint(PROMPT_HINT), buttonRow(ghost.el)];

    // Above the fold: a compact header, then ONE body row split in two.
    // main = the shop + the seller's agent. side = tools, CTA, readouts,
    // the human's two buttons, and the narrator.
    el.append(
      fitHeader({
        eyebrow: 'room 4 · the options',
        title: 'Both sides brought an agent.',
        lead: OPTIONS_INTRO,
      }),
      splitPane({
        ratio: 58,
        main: sandbox.el,
        side: stack(
          compactToolCards([searchOffers, makeOffer]),
          ...ctas,
          sandbox.controlsEl,
          character.el,
          thoughtEl,
          reactionBox,
        ),
      }),
    );

    ctx.hint('run a tool to continue');

    // MUST unregister: by slide 3 this room has no tools. The ghost's plan is
    // three steps long, so aborting it first is not optional.
    return () => {
      ghost.abort();
      for (const off of unregister) off();
      sandbox.destroy();
    };
  },
};

/* ----------------------------------------------- beat 3: what happened */

const happenedSlide: Slide = {
  id: 'room-4-happened',
  render(el: HTMLElement, ctx: SlideContext) {
    const calls = ctx.log.byRoom(ROOM_NUMBER);
    const bids = calls.filter((c) => c.tool === 'make_offer').length;

    el.append(
      fitHeader({
        eyebrow: 'room 4 · what just happened',
        title: HAPPENED_TITLE,
      }),
      fitBody(
        para(HAPPENED_BODY),
        card(HAPPENED_CARD_TITLE, HAPPENED_CARD_BODY),
        para(HAPPENED_ASIDE),
        bubble(
          bids > 0
            ? `Your agent made ${bids} offer${bids === 1 ? '' : 's'}. Theirs answered every one, and never had to sleep on it.`
            : 'You did not bid. Their agent still logged the visit — that is all it needed from you today.',
          'narrator',
        ),
      ),
    );
    ctx.done();
  },
};

/* ------------------------------------------------- beat 4: two futures */

const futuresSlide: Slide = {
  id: 'room-4-futures',
  render(el: HTMLElement, ctx: SlideContext) {
    el.append(
      fitHeader({
        eyebrow: 'room 4 · two futures',
        title: 'So what happens to the price?',
      }),
      fitBody(
        twoFutures({
          bad: { title: BAD_FUTURE.title, bullets: BAD_FUTURE.bullets },
          bright: { title: BRIGHT_FUTURE.title, bullets: BRIGHT_FUTURE.bullets },
          badIllo: 'room-4-bad',
          brightIllo: 'room-4-bright',
        }),
        bubble(
          'It comes down to one boring thing: whether your agent may see all the sellers at once.',
          'narrator',
        ),
      ),
    );
    ctx.done();
  },
};

/* -------------------------------------------------------------- the room */

const room: Room = {
  id: 'room-4',
  number: 4,
  title: 'Room 4 — Marketplaces',
  siteType: 'Marketplaces',
  wants: 'closed deals and a take rate',
  prediction: 'Run a counter-agent against yours.',
  // The long explanation lives on the Door slide, not above the sandbox.
  lead: ROOM_LEAD,
  doorLine: DOOR_LINE,
  slides: [],
};

room.slides = [
  doorSlide(room),
  optionsSlide,
  happenedSlide,
  futuresSlide,
  predictionSlide(room),
];

export default room;
