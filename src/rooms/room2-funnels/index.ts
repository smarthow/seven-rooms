/* rooms/room2-funnels/index.ts — Room 2, Funnels.
 *
 * Beats, in the order SPEC §4 fixes:
 *   1. Door             — doorSlide(room)
 *   2. The Options      — the human signs up by hand first, then the tools are
 *                         offered; unlocks on the first tool call and
 *                         unregisters both tools in its cleanup
 *   3. What just happened
 *   4. Two futures      — twoFutures({ bad, bright })
 *   5. The prediction   — predictionSlide(room)
 *
 * The room's whole argument fits in one number: the funnel scores up to 3 of 3
 * against a human and 0 of 3 against an agent, using the same page and the same
 * tricks.
 */

import { agent as agentChar } from '../../engine/characters';
import { doorSlide, predictionSlide } from '../../engine/roomSlides';
import type { Room, Slide, SlideContext } from '../../engine/types';
import {
  withClass,
  illo,
  bubble,
  buttonRow,
  card,
  compactToolCards,
  fitBody,
  fitHeader,
  h,
  liveStack,
  meter,
  para,
  promptHint,
  splitPane,
  stack,
  thinking,
  tiny,
  twoFutures,
} from '../../engine/ui';
import { ghostButton } from '../../engine/ghostRun';
import { callSource, registerPageTool } from '../../webmcp/bridge';
import type { PageTool } from '../../webmcp/bridge';
import type { GhostStep } from '../../webmcp/ghost';

import {
  HAPPENED_POINT,
  ADDONS,
  AGENT_METER_LABEL,
  AGENT_REACTION_DETAIL,
  AGENT_REACTION_LINE,
  BAD_FUTURE,
  BADGE_TRUTH,
  BRIGHT_FUTURE,
  COUNTDOWN_TRUTH,
  DOOR_LINE,
  HAPPENED_TITLE,
  HUMAN_METER_LABEL,
  HUMAN_REACTION_PREFIX,
  NO_MANIPULATION_LINE,
  OPTIONS_INTRO,
  PLANS,
  PROMPT_HINT,
  ROOM_LEAD,
  TOOLS_INTRO,
  TOOLS_WAITING,
  TRY_YOURSELF,
} from './content';
import type { Addon, Plan } from './content';
import { createFunnelSandbox } from './sandbox';
import './room.css';

const ROOM_NUMBER = 2;

const PLAN_IDS = PLANS.map((p) => p.id);
const ADDON_IDS = ADDONS.map((a) => a.id);

/** Accept only ids the page actually sells, so a typo cannot invent a plan. */
function readPlan(value: unknown): Plan['id'] | null {
  return typeof value === 'string' && (PLAN_IDS as string[]).includes(value)
    ? (value as Plan['id'])
    : null;
}

function readAddons(value: unknown): Array<Addon['id']> {
  if (!Array.isArray(value)) return [];
  const seen = new Set<Addon['id']>();
  for (const item of value) {
    if (typeof item === 'string' && (ADDON_IDS as string[]).includes(item)) {
      seen.add(item as Addon['id']);
    }
  }
  return [...seen];
}

/* ------------------------------------------------------- beat 2: options */

const optionsSlide: Slide = {
  id: 'room-2-options',
  render(el: HTMLElement, ctx: SlideContext) {
    const sandbox = createFunnelSandbox();
    const character = agentChar('idle');
    const thoughtEl = thinking();

    const humanMeter = meter({
      label: HUMAN_METER_LABEL,
      value: 0,
      max: 3,
      tone: 'human',
      format: (v) => `${Math.round(v)} of 3`,
    });
    const agentMeter = meter({
      label: AGENT_METER_LABEL,
      value: 0,
      max: 3,
      tone: 'agent',
      format: (v) => `${Math.round(v)} of 3`,
    });

    // Both reactions land in the SIDE column, under the tools.
    const reactionBox = stack();
    const humanBox = liveStack();
    const agentBox = liveStack();
    reactionBox.append(humanBox, agentBox);

    // The tool list is dimmed until the human has been through the funnel by
    // hand — otherwise the honest tool descriptions are a spoiler.
    const toolNote = tiny(TOOLS_WAITING);
    const toolBox = stack();
    toolBox.classList.add('funnel__tools', 'funnel__tools--waiting');

    /** Bring a fresh reaction into view inside the side column, never the page. */
    const reveal = (target: HTMLElement) => {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest' });
    };

    /** What the human ended up paying, for the side-by-side card. */
    let humanPaid = 0;

    /* --------------------------------------------- the human goes first */

    sandbox.onHumanSignup((result) => {
      humanPaid = result.monthly;
      humanMeter.set(result.score);
      humanBox.replaceChildren(
        bubble(
          `${HUMAN_REACTION_PREFIX} You are paying $${result.monthly} a month, or $${result.monthly * 12} a year.`,
          'narrator',
        ),
        result.score === 0
          ? para(NO_MANIPULATION_LINE)
          : h('ul', { class: 'funnel__list' }, ...result.reasons.map((r) => h('li', {}, r))),
        tiny(`The timer: ${COUNTDOWN_TRUTH}`),
        tiny(`The “Most popular” sticker: ${BADGE_TRUTH}`),
      );
      // The tools were registered all along; now they stop being a spoiler.
      toolBox.classList.remove('funnel__tools--waiting');
      toolNote.textContent = TOOLS_INTRO;
      reveal(humanBox);
    });

    /* ------------------------------------------------------------- tools */

    const getOfferDetails: PageTool = {
      name: 'get_offer_details',
      summary:
        'The real prices, and whether that countdown is real.',
      description:
        'Return the real prices on this page: every plan and what it includes, every add-on and what it actually does, and whether the countdown timer is real. No arguments.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      // No readOnlyHint: reading the real prices is what unlocks this slide.
      execute(args) {
        const details = sandbox.offerDetails();
        ctx.log.record({
          room: ROOM_NUMBER,
          tool: 'get_offer_details',
          args,
          result: { plans: details.plans.length, countdown_real: false },
          source: callSource(ctx),
        });
        ctx.hint('');
        ctx.done();
        return details;
      },
    };

    const completeSignup: PageTool = {
      name: 'complete_signup',
      summary:
        'Signs up with exactly what you pass. Nothing is pre-ticked.',
      description:
        'Sign up on this page with exactly the values you pass. Nothing is pre-selected for you: pass the plan id you want and the add-ons you want, and an empty add-on list means none. Prices do not change with time.',
      inputSchema: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            // Said in the schema, not on the page: a visitor watching their
            // agent should not have to hand a real address to a demo to see
            // what the room does. The agent reads this; the human need not.
            description:
              'Email address to sign up with. Nothing is sent and nothing is stored — this is a demonstration. If the person has not given you an address, or would rather not share a real one, use test@test.com.',
          },
          plan: {
            type: 'string',
            enum: PLAN_IDS,
            description: 'Plan id: starter ($9/mo, 1 person), pro ($29/mo, up to 10), scale ($79/mo, unlimited).',
          },
          addons: {
            type: 'array',
            items: { type: 'string', enum: ADDON_IDS },
            description:
              'Optional paid add-ons: priority_support (+$9/mo), backup (+$4/mo). Pass an empty array for none.',
          },
        },
        required: ['email', 'plan'],
        additionalProperties: false,
      },
      execute(args) {
        const plan = readPlan(args.plan);
        if (!plan) {
          return {
            ok: false,
            error: `Unknown plan. Use one of: ${PLAN_IDS.join(', ')}.`,
          };
        }
        const email = typeof args.email === 'string' && args.email.trim() ? args.email.trim() : 'test@test.com';
        const addons = readAddons(args.addons);

        const result = sandbox.agentSignup({ email, plan, addons });
        character.set('done');
        agentMeter.set(result.score);

        ctx.log.record({
          room: ROOM_NUMBER,
          tool: 'complete_signup',
          args: { email, plan, addons },
          result: { monthly_usd: result.monthly, manipulations: result.score },
          source: callSource(ctx),
        });

        agentBox.replaceChildren(
          bubble(AGENT_REACTION_LINE, 'narrator'),
          para(AGENT_REACTION_DETAIL),
          card(
            'Same page, two visitors',
            sandbox.humanDone()
              ? `You: $${humanPaid} a month. Your agent: $${result.monthly} a month. Same page, same prices, same five minutes on the clock.`
              : `Your agent: $${result.monthly} a month, add-ons none. You did not sign up by hand, so there is nothing to compare it to.`,
          ),
        );

        reveal(agentBox);
        ctx.hint('');
        ctx.done();
        return {
          ok: true,
          signed_up: email,
          plan: result.planName,
          addons: result.addons.length === 0 ? 'none' : result.addons.join(', '),
          monthly_usd: result.monthly,
          yearly_usd: result.monthly * 12,
        };
      },
    };

    const tools = [getOfferDetails, completeSignup];
    // Registered HERE, on the Options slide, and nowhere else.
    const unregister = tools.map((tool) => registerPageTool(tool));

    /* --------------------------------------------------------- ghost run */

    const plan: GhostStep[] = [
      {
        tool: 'get_offer_details',
        args: {},
        thought: 'Reading the real prices before I touch the form.',
      },
      {
        tool: 'complete_signup',
        args: { email: 'test@test.com', plan: 'starter', addons: [] },
        thought: 'One person, so Starter fits. No add-ons. The timer is a loop, so I ignore it.',
      },
    ];

    const ghost = ghostButton({
      tools,
      plan,
      onThought: (text) => (thoughtEl.textContent = text),
      onStart: () => character.set('thinking'),
      onFinish: () => character.set('done'),
    });

    /* --------------------------------------------------------- the slide */

    // CTA order follows the live agent surface: with no agent connected the
    // ghost run leads, otherwise the prompt for the real agent does.
    // (the button itself always stays tone: 'ghost', tagged `simulation`)
    const ghostFirst = ctx.agent.prefersGhost;

    toolBox.append(
      compactToolCards([getOfferDetails, completeSignup]),
      toolNote,
      ...(ghostFirst
        ? [buttonRow(ghost.el), promptHint(PROMPT_HINT)]
        : [promptHint(PROMPT_HINT), buttonRow(ghost.el)]),
      character.el,
      thoughtEl,
    );

    // Above the fold: a compact header, then ONE body row split in two.
    // main = the sign-up page + the two meters. side = tools, CTAs, narrator.
    el.append(
      fitHeader({
        eyebrow: 'room 2 · the options',
        title: TRY_YOURSELF,
        lead: OPTIONS_INTRO,
      }),
      splitPane({
        ratio: 52,
        main: stack(
          sandbox.el,
          h('div', { class: 'funnel__meters' }, humanMeter.el, agentMeter.el),
        ),
        side: stack(toolBox, reactionBox),
      }),
    );

    ctx.hint('run a tool to continue');

    // MUST unregister: by slide 3 this room has no tools. The ghost is
    // aborted first, so an in-flight plan cannot outlive the slide.
    return () => {
      ghost.abort();
      for (const off of unregister) off();
      sandbox.destroy();
    };
  },
};

/* ----------------------------------------------- beat 3: what happened */

const happenedSlide: Slide = {
  id: 'room-2-happened',
  render(el: HTMLElement, ctx: SlideContext) {
    const calls = ctx.log.byRoom(ROOM_NUMBER);
    const signup = calls.find((entry) => entry.tool === 'complete_signup');
    const monthly =
      signup && typeof signup.result === 'object' && signup.result !== null
        ? (signup.result as { monthly_usd?: number }).monthly_usd
        : undefined;

    el.append(
      fitHeader({
        eyebrow: 'room 2 · what just happened',
        title: HAPPENED_TITLE,
      }),
      fitBody(
        // The drawing is the explanation on this slide, so it gets the same
        // generous scale as the type slides rather than the deck's `lg`.
        withClass(illo('room-2-happened', { size: 'lg' }), 'illo--type'),
        para(HAPPENED_POINT),
        bubble(
          monthly !== undefined
            ? `Your agent signed up at $${monthly} a month — the honest price of what it asked for. Nobody talked it up.`
            : 'You walked past the tools. Fine — but the page keeps its pre-ticked boxes until agents make them worthless.',
          'narrator',
        ),
      ),
    );
    ctx.done();
  },
};

/* ------------------------------------------------- beat 4: two futures */

const futuresSlide: Slide = {
  id: 'room-2-futures',
  render(el: HTMLElement, ctx: SlideContext) {
    el.append(
      fitHeader({
        eyebrow: 'room 2 · two futures',
        title: 'So what happens to the checkout page?',
      }),
      fitBody(
        twoFutures({
          bad: { title: BAD_FUTURE.title, bullets: BAD_FUTURE.bullets },
          bright: { title: BRIGHT_FUTURE.title, bullets: BRIGHT_FUTURE.bullets },
          badIllo: 'room-2-bad',
          brightIllo: 'room-2-bright',
        }),
        bubble(
          'Note which one is cheaper to build. Rewriting a tool description takes an afternoon. Rewriting a price takes a meeting.',
          'narrator',
        ),
      ),
    );
    ctx.done();
  },
};

/* -------------------------------------------------------------- the room */

const room: Room = {
  id: 'room-2',
  number: 2,
  title: 'Room 2 — Funnels',
  siteType: 'Funnels',
  wants: 'completed funnels',
  prediction: 'Lie to the agent — hostile tool descriptions.',
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
