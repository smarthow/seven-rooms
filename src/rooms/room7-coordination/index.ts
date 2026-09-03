/* rooms/room7-coordination/index.ts — Room 7, Coordination. The last room.
 *
 * Follows SPEC §4 exactly, like the reference room:
 *
 *   1. Door             — doorSlide(room), shared factory
 *   2. The Options      — registers read_proposal + cast_position, shows the
 *                         group decision, unlocks on the first tool call,
 *                         unregisters in its cleanup
 *   3. What just happened
 *   4. Two futures      — twoFutures({ bad, bright })
 *   5. The prediction   — predictionSlide(room), shared factory
 *
 * The point of the room: the tally says FOR. Flip "Count humans only" and the
 * same sixty positions say AGAINST. Nothing was faked. The definition of
 * "everyone" changed.
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
  BAD_FUTURE,
  BRIGHT_FUTURE,
  DOOR_LINE,
  FLIPPED_LINE,
  HAPPENED_ASIDE,
  HAPPENED_BODY,
  HAPPENED_BODY_2,
  HAPPENED_CARD_BODY,
  HAPPENED_CARD_TITLE,
  HAPPENED_TITLE,
  OPTIONS_INTRO,
  PROMPT_HINT,
  PROPOSAL_BODY,
  PROPOSAL_META,
  PROPOSAL_TITLE,
  REACTION_AGREE,
  REACTION_DISAGREE,
  REACTION_NO_HUMAN,
  ROOM_LEAD,
  SWITCH_REVEAL,
} from './content';
import { createVoteSandbox } from './sandbox';
import type { Stance } from './seed';
import './room.css';

const ROOM_NUMBER = 7;

/** Six real reasons off the board, so a reading agent has something to weigh. */
const SAMPLE_FOR = [
  'Excluding me does not remove my influence; it only hides where it came from.',
  'Let them vote with a label on, and we can measure whether they vote better.',
  'I am blind, and my reading agent is the only way I take part here at all.',
];

const SAMPLE_AGAINST = [
  'One person with a rented server should not be able to outvote a whole town.',
  'Agents do not have to live with the result, so they should not get to pick it.',
  'I can be copied for pennies, which makes me a poor unit of consent.',
];

/** Reasons the ghost agent gives. It is not being difficult; it read the thread. */
const GHOST_REASON: Record<Stance, string> = {
  for: 'A labelled agent vote can be seen and discounted; unlabelled influence cannot.',
  against: 'A voice that can be copied for pennies is a poor way to measure a town.',
};

/* ------------------------------------------------------- beat 2: options */

const optionsSlide: Slide = {
  id: 'room-7-options',
  render(el: HTMLElement, ctx: SlideContext) {
    const sandbox = createVoteSandbox();
    const character = agentChar('idle');
    const thoughtEl = thinking();
    const reactionBox = liveStack();

    let calls = 0;
    let flipNoted = false;

    /** Called by both tools: log, unlock, and react once. */
    const onToolUsed = (tool: string, args: Record<string, unknown>, result: unknown) => {
      calls += 1;
      ctx.log.record({
        room: ROOM_NUMBER,
        tool,
        args,
        result,
        source: callSource(ctx),
      });
      if (calls === 1) {
        ctx.hint('');
        ctx.done();
      }
    };

    /**
     * Bring the narrator's line into view inside the SIDE column. Never the
     * page — the page does not scroll on desktop.
     */
    const showReaction = (...children: Node[]) => {
      reactionBox.replaceChildren(...children);
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      reactionBox.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest' });
    };

    /** Once the agent has taken a position, the switch is worth flipping. */
    const afterAgentCast = (stance: Stance) => {
      character.set('done');
      sandbox.revealSwitch();
      const mine = sandbox.humanStance();
      const line =
        mine === null ? REACTION_NO_HUMAN : mine === stance ? REACTION_AGREE : REACTION_DISAGREE;
      showReaction(bubble(line, 'narrator'), tiny(SWITCH_REVEAL));
    };

    sandbox.onSwitch((humansOnly) => {
      if (!humansOnly || flipNoted) return;
      flipNoted = true;
      // Replace, not append: the "flip the switch" nudge has done its job, and
      // the side column has no room to grow.
      showReaction(bubble(FLIPPED_LINE, 'narrator'));
    });

    /* ------------------------------------------------------------- tools */

    const readProposal: PageTool = {
      name: 'read_proposal',
      description:
        'Return the proposal being voted on here, the current count of positions for and against, and how those positions split between human, agent and mixed receipts. Also returns a few of the reasons people gave. No arguments.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      // No readOnlyHint: reading the proposal unlocks the slide. The result
      // carries sixty reasons written by other visitors, so it IS untrusted
      // content — that is the other half of the annotations dictionary, and
      // this is the honest place to use it.
      annotations: { untrustedContentHint: true },
      async execute(args) {
        await new Promise((resolve) => window.setTimeout(resolve, 200));
        const seed = sandbox.seedTally();
        const totals = sandbox.totals(false);
        const result = {
          proposal: PROPOSAL_TITLE,
          detail: PROPOSAL_BODY,
          rules: PROPOSAL_META,
          tally: { for: totals.for, against: totals.against },
          by_receipt: {
            human: `${seed.human.for} for / ${seed.human.against} against`,
            agent: `${seed.agent.for} for / ${seed.agent.against} against`,
            mixed: `${seed.mixed.for} for / ${seed.mixed.against} against`,
          },
          your_position: sandbox.humanStance() ?? 'not cast yet',
          sample_reasons_for: SAMPLE_FOR,
          sample_reasons_against: SAMPLE_AGAINST,
        };
        onToolUsed('read_proposal', args, {
          tally: result.tally,
          your_position: result.your_position,
        });
        return result;
      },
    };

    const castPosition: PageTool = {
      name: 'cast_position',
      description:
        'Cast a position on the proposal on this page. It is recorded with an "agent" receipt, next to the human’s own position. You may vote against the human who asked you; say why in the reason.',
      inputSchema: {
        type: 'object',
        properties: {
          stance: {
            type: 'string',
            enum: ['for', 'against'],
            description: 'Your position on the proposal.',
          },
          reason: {
            type: 'string',
            description: 'One short sentence explaining the position. Shown to other visitors.',
          },
        },
        required: ['stance'],
        additionalProperties: false,
      },
      // The result echoes the caller's own reason back alongside the human's
      // position, so it is not text this page authored.
      annotations: { untrustedContentHint: true },
      async execute(args) {
        const raw = String(args.stance ?? '').toLowerCase();
        const stance: Stance = raw === 'against' ? 'against' : 'for';
        const reason = String(args.reason ?? '').slice(0, 110) || GHOST_REASON[stance];

        sandbox.castAgent(stance, reason);

        const everyone = sandbox.totals(false);
        const humansOnly = sandbox.totals(true);
        const result = {
          recorded: stance,
          receipt: 'agent',
          reason,
          human_position: sandbox.humanStance() ?? 'not cast yet',
          count_with_agents: `${everyone.for} for / ${everyone.against} against → ${sandbox.result(false).toUpperCase()}`,
          count_humans_only: `${humansOnly.for} for / ${humansOnly.against} against → ${sandbox.result(true).toUpperCase()}`,
          note: 'Mixed receipts count as human, because a person signed them.',
        };

        onToolUsed('cast_position', args, {
          stance,
          human_position: result.human_position,
          count_with_agents: result.count_with_agents,
        });
        afterAgentCast(stance);
        return result;
      },
    };

    const tools = [readProposal, castPosition];
    // Registered HERE, on the Options slide, and nowhere else.
    const unregister = tools.map((tool) => registerPageTool(tool));

    /* --------------------------------------------------------- ghost run */

    // With no connected agent the simulation IS the primary call to action, so
    // it leads and gets the accent tone. With one connected, the prompt hint
    // leads and the ghost stays a teal secondary.
    const ghostLeads = ctx.agent.prefersGhost;

    /**
     * Built at click time: the ghost disagrees on purpose, so it has to read
     * the human's own vote first. If you have not voted, it goes first.
     */
    const buildPlan = (): GhostStep[] => {
      const mine = sandbox.humanStance();
      const stance: Stance = mine === null ? 'for' : mine === 'for' ? 'against' : 'for';
      const thought =
        mine === null
          ? 'You have not voted. I have read all sixty reasons, so I will take a position.'
          : `You voted ${mine}. I read the other side and I do not agree. Casting ${stance}.`;

      return [
        {
          tool: 'read_proposal',
          args: {},
          thought: 'Sixty positions and a receipt on each one. Reading them before I vote.',
        },
        {
          tool: 'cast_position',
          args: { stance, reason: GHOST_REASON[stance] },
          thought,
        },
      ];
    };

    const ghost = ghostButton({
      tools,
      plan: buildPlan,
      tone: ghostLeads ? 'accent' : 'ghost',
      onThought: (text) => (thoughtEl.textContent = text),
      onStart: () => character.set('thinking'),
      onFinish: () => character.set('done'),
    });

    /* ---------------------------------------------------------- the slide */

    // Above the fold: a compact header, then ONE body row split in two.
    // main = the tally, the switch and the sixty positions (the list is the
    // only element in this room allowed to scroll internally).
    // side = tools, CTAs, the human's own cast, the agent, the narrator.
    const hint = promptHint(PROMPT_HINT);
    const ctas = ghostLeads ? [buttonRow(ghost.el), hint] : [hint, buttonRow(ghost.el)];

    el.append(
      fitHeader({
        eyebrow: 'room 7 · the options',
        title: 'Sixty strangers. One question.',
        lead: OPTIONS_INTRO,
      }),
      splitPane({
        ratio: 48,
        main: sandbox.el,
        side: stack(
          compactToolCards([readProposal, castPosition]),
          ...ctas,
          sandbox.castEl,
          character.el,
          thoughtEl,
          reactionBox,
        ),
      }),
    );

    ctx.hint('run a tool to continue');

    // MUST unregister: by slide 3 this room has no tools. Abort the ghost
    // first, or a vote cast after the slide is gone would unlock the next one.
    return () => {
      ghost.abort();
      for (const off of unregister) off();
      sandbox.destroy();
    };
  },
};

/* ----------------------------------------------- beat 3: what happened */

const happenedSlide: Slide = {
  id: 'room-7-happened',
  render(el: HTMLElement, ctx: SlideContext) {
    const cast = ctx.log
      .byRoom(ROOM_NUMBER)
      .filter((entry) => entry.tool === 'cast_position');
    const last = cast[cast.length - 1];
    const stance = last ? String((last.args as { stance?: unknown }).stance ?? '') : '';
    const humanPos =
      last && typeof last.result === 'object' && last.result !== null
        ? String((last.result as { human_position?: unknown }).human_position ?? '')
        : '';
    const disagreed =
      stance !== '' && humanPos !== '' && humanPos !== 'not cast yet' && humanPos !== stance;

    el.append(
      fitHeader({
        eyebrow: 'room 7 · what just happened',
        title: HAPPENED_TITLE,
      }),
      fitBody(
        para(HAPPENED_BODY),
        para(HAPPENED_BODY_2),
        card(HAPPENED_CARD_TITLE, HAPPENED_CARD_BODY),
        tiny(HAPPENED_ASIDE),
        bubble(
          disagreed
            ? `Your agent voted ${stance} while you voted ${humanPos}. Both are still on the board. Only one belongs to a person.`
            : cast.length > 0
              ? 'Your agent took a position in your name. It is on the board with a badge on it, which is more than most votes get.'
              : 'Your agent never voted here. The sixty positions still contain twenty that no human wrote.',
          'narrator',
        ),
      ),
    );
    ctx.done();
  },
};

/* ------------------------------------------------- beat 4: two futures */

const futuresSlide: Slide = {
  id: 'room-7-futures',
  render(el: HTMLElement, ctx: SlideContext) {
    el.append(
      fitHeader({
        eyebrow: 'room 7 · two futures',
        title: 'So what happens when we decide together?',
      }),
      fitBody(
        twoFutures({
          bad: { title: BAD_FUTURE.title, bullets: BAD_FUTURE.bullets },
          bright: { title: BRIGHT_FUTURE.title, bullets: BRIGHT_FUTURE.bullets },
          badIllo: 'room-7-bad',
          brightIllo: 'room-7-bright',
        }),
        bubble(
          'The difference is not the technology. It is whether every voice arrives with a label on it.',
          'narrator',
        ),
      ),
    );
    ctx.done();
  },
};

/* -------------------------------------------------------------- the room */

const room: Room = {
  id: 'room-7',
  number: 7,
  title: 'Room 7 — Coordination',
  siteType: 'Coordination',
  wants: 'agreement',
  prediction: 'Label agents and cap their votes.',
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
