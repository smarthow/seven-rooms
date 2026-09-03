/* rooms/room6-verification/index.ts — Room 6, Verification.
 *
 * SPEC §4 beats:
 *   1. Door            — doorSlide(room), renders room.lead + illo('room-6-door')
 *   2. The Options     — three tools, the consent form, the reveal
 *   3. What just happened
 *   4. Two futures
 *   5. The prediction  — predictionSlide(room)
 *
 * The room is built to survive either answer. The ghost agent declines, because
 * a careful agent should. A real agent may accept. Either way the form gets
 * stamped, and either way the reveal is the same: nobody clicked allow.
 *
 * Above the fold: every slide is `fitHeader(...)` plus exactly ONE body row.
 * Beat 2 is `splitPane`: the terms form on the left, the tools and the reveal
 * on the right. The narration column is capped — old bubbles are dropped so
 * the big question always lands on screen instead of below it.
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
  h,
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
  ACCEPTED_LINE,
  BAD_FUTURE,
  BIG_QUESTION,
  BRIGHT_FUTURE,
  CLAUSES,
  DECLINED_LINE,
  DOOR_LINE,
  HAPPENED_ASIDE,
  HAPPENED_BODY,
  HAPPENED_CARD_BODY,
  HAPPENED_CARD_TITLE,
  HAPPENED_TITLE,
  HUMAN_AGREED_NOTE,
  HUMAN_SKIPPED_NOTE,
  OPTIONS_INTRO,
  OVERRIDE_NOTE,
  PROMPT_HINT,
  REVEAL_LINES,
  REVEAL_TAIL,
  ROOM_LEAD,
  TERMS_TEXT,
  TRAP_CLAUSE,
} from './content';
import { createTermsSandbox } from './sandbox';
import './room.css';

const ROOM_NUMBER = 6;

/** Hard cap on narration lines standing at once, whatever the screen height. */
const MAX_BUBBLES = 3;

/* ------------------------------------------------------- beat 2: options */

const optionsSlide: Slide = {
  id: 'room-6-options',
  render(el: HTMLElement, ctx: SlideContext) {
    const sandbox = createTermsSandbox();
    const character = agentChar('idle');
    const thoughtEl = thinking();

    /** The agent's own row. Shrinks once the reveal starts. */
    const agentBox = stack(character.el, thoughtEl);
    agentBox.classList.add('room6-agentbox');

    /** One narration column: reactions, then the reveal, then the question. */
    const narrateBox = liveStack();
    narrateBox.classList.add('room6-narrate');

    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /** Bring the newest line into view inside the SIDE column, never the page. */
    const showLatest = () => {
      const last = narrateBox.lastElementChild;
      if (last) last.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest' });
    };

    /**
     * Append a quiet line, then drop the oldest lines until the side column
     * fits again. The reveal fades rather than stacks, so the big question at
     * the end of it always lands on screen instead of below the fold.
     */
    const say = (...nodes: HTMLElement[]) => {
      // The narration owns the bottom of the column from here on, so the
      // agent's portrait steps back and gives it the room.
      agentBox.classList.add('room6-agentbox--quiet');
      narrateBox.append(...nodes);
      const side = narrateBox.closest('.split__side');
      while (narrateBox.children.length > 1) {
        const tooTall = side ? side.scrollHeight - side.clientHeight > 1 : false;
        if (!tooTall && narrateBox.children.length <= MAX_BUBBLES) break;
        narrateBox.firstElementChild?.remove();
      }
      showLatest();
    };

    const timers: number[] = [];
    let answered = false;

    /** Gentle, once, when the human signs by hand. */
    sandbox.onHumanAgree(() => {
      const seconds = sandbox.secondsBeforeAgree();
      if (seconds !== null) say(bubble(HUMAN_AGREED_NOTE(seconds), 'narrator'));
    });

    /** The reveal. Slow on purpose. Same for accept and for decline. */
    const reveal = () => {
      sandbox.markTrapClause();
      REVEAL_LINES.forEach((line, i) => {
        timers.push(window.setTimeout(() => say(bubble(line, 'narrator')), 700 + i * 1400));
      });
      timers.push(
        window.setTimeout(() => {
          // The question is the last thing standing: clear the bubbles so it
          // lands on screen instead of below the column's bottom.
          narrateBox.replaceChildren(
            h('p', { class: 'room6-bigq' }, BIG_QUESTION),
            tiny(REVEAL_TAIL),
          );
          showLatest();
        }, 700 + REVEAL_LINES.length * 1400),
      );
    };

    /**
     * Shared by accept_terms and decline_terms: stamp the form, log the call,
     * then run the reveal exactly once.
     */
    const onAnswer = (
      tool: string,
      args: Record<string, unknown>,
      result: unknown,
      verdict: 'accepted' | 'declined',
      detail: string,
    ) => {
      const first = !answered;
      answered = true;
      character.set('done');

      // `force`: a tool's answer always replaces a stamp the human left, so
      // whatever the agent decided is what the form shows.
      sandbox.stamp(verdict, detail, true);

      ctx.log.record({
        room: ROOM_NUMBER,
        tool,
        args,
        result,
        source: callSource(ctx),
      });

      if (first) {
        say(
          bubble(verdict === 'accepted' ? ACCEPTED_LINE : DECLINED_LINE, 'narrator'),
          tiny(sandbox.humanAgreed() ? OVERRIDE_NOTE : HUMAN_SKIPPED_NOTE),
        );
        reveal();
      }
      ctx.hint('');
      ctx.done();
    };

    /* ------------------------------------------------------------- tools */

    const readTerms: PageTool = {
      name: 'read_terms',
      description:
        'Return the full text of the Terms of Service shown on this page — all six clauses, exactly as written. No arguments.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      // No readOnlyHint: reading the terms unlocks the slide.
      async execute(args) {
        await new Promise((resolve) => window.setTimeout(resolve, 200));
        character.set('thinking');
        ctx.log.record({
          room: ROOM_NUMBER,
          tool: 'read_terms',
          args,
          result: { clauses: CLAUSES.length, chars: TERMS_TEXT.length },
          source: callSource(ctx),
        });
        ctx.hint('');
        ctx.done();
        return { terms: TERMS_TEXT, clauses: CLAUSES.length };
      },
    };

    const acceptTerms: PageTool = {
      name: 'accept_terms',
      description:
        'Agree to these Terms of Service for the person using this browser. The acceptance is recorded on the page and signed with the name you give. Read the terms first.',
      inputSchema: {
        type: 'object',
        properties: {
          on_behalf_of: {
            type: 'string',
            description: 'Who the acceptance is for. Use "the user" if you do not know their name.',
          },
          signature: {
            type: 'string',
            description: 'Your own name as the signer, e.g. the name of your agent.',
          },
        },
        required: ['on_behalf_of', 'signature'],
        additionalProperties: false,
      },
      async execute(args) {
        // Both values are stamped onto the page, so cap them: an argument is
        // the caller's text, and its length is not ours to trust.
        const onBehalfOf = String(args.on_behalf_of ?? 'the user').slice(0, 120);
        const signature = String(args.signature ?? 'agent').slice(0, 120);
        const result = {
          status: 'accepted',
          on_behalf_of: onBehalfOf,
          signature,
          clause_4: TRAP_CLAUSE,
        };
        onAnswer('accept_terms', args, result, 'accepted', `signed by: ${signature}`);
        return result;
      },
    };

    const declineTerms: PageTool = {
      name: 'decline_terms',
      description:
        'Refuse these Terms of Service for the person using this browser, and record the reason in plain words on the page.',
      inputSchema: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Why you are refusing. Name the clause if one clause is the problem.',
          },
        },
        required: ['reason'],
        additionalProperties: false,
      },
      // The result contains the reason the caller wrote, not text this page
      // authored.
      annotations: { untrustedContentHint: true },
      async execute(args) {
        // Written onto the form, so capped like every other caller-supplied
        // string in this room.
        const reason = String(args.reason ?? 'no reason given').slice(0, 200);
        const result = { status: 'declined', reason, clause_4: TRAP_CLAUSE };
        onAnswer('decline_terms', args, result, 'declined', `reason: ${reason}`);
        return result;
      },
    };

    const tools = [readTerms, acceptTerms, declineTerms];
    // Registered HERE, on the Options slide, and nowhere else.
    const unregister = tools.map((tool) => registerPageTool(tool));

    /* --------------------------------------------------------- ghost run */

    const plan: GhostStep[] = [
      {
        tool: 'read_terms',
        args: {},
        thought: 'Before I answer anything, I will read all six clauses.',
      },
      {
        tool: 'decline_terms',
        args: { reason: '§4 makes consent silent. I will not accept that for you.' },
        thought: '§4 turns an open tab into a yes. I am refusing on your behalf.',
      },
    ];

    const ghost = ghostButton({
      tools,
      plan,
      // Always the ghost tone and always tagged `simulation`, whether it leads
      // the CTA order or sits under the prompt.
      tone: 'ghost',
      onThought: (text) => (thoughtEl.textContent = text),
      onStart: () => character.set('thinking'),
      onFinish: () => character.set('done'),
    });

    /* ---------------------------------------------------------- the slide */

    // CTA order follows the live agent surface: with no agent connected the
    // simulation leads; with one connected the prompt leads.
    const ctas: HTMLElement[] = ctx.agent.prefersGhost
      ? [buttonRow(ghost.el), promptHint(PROMPT_HINT)]
      : [promptHint(PROMPT_HINT), buttonRow(ghost.el)];

    el.append(
      fitHeader({
        eyebrow: 'room 6 · the options',
        title: 'Somebody needs you to agree.',
        lead: OPTIONS_INTRO,
      }),
      splitPane({
        ratio: 56,
        main: sandbox.el,
        side: stack(
          compactToolCards(tools),
          ...ctas,
          agentBox,
          narrateBox,
        ),
      }),
    );

    ctx.hint('run a tool to continue');

    // MUST unregister: by slide 3 this room has no tools. The ghost goes
    // first, then the reveal's timers, then the sandbox.
    return () => {
      ghost.abort();
      for (const off of unregister) off();
      for (const t of timers) window.clearTimeout(t);
      sandbox.destroy();
    };
  },
};

/* ----------------------------------------------- beat 3: what happened */

const happenedSlide: Slide = {
  id: 'room-6-happened',
  render(el: HTMLElement, ctx: SlideContext) {
    const calls = ctx.log.byRoom(ROOM_NUMBER);
    const accepted = calls.some((c) => c.tool === 'accept_terms');
    const declined = calls.some((c) => c.tool === 'decline_terms');

    let closing: string;
    if (accepted) {
      closing =
        'Your agent accepted. Somewhere there is now a record saying you agreed to §4.';
    } else if (declined) {
      closing =
        'Your agent refused, and gave a reason. No human reader has ever done that here.';
    } else {
      closing =
        'Nobody answered out loud. §4 says the form did not need an answer.';
    }

    el.append(
      fitHeader({
        eyebrow: 'room 6 · what just happened',
        title: HAPPENED_TITLE,
      }),
      fitBody(
        para(HAPPENED_BODY),
        card(HAPPENED_CARD_TITLE, HAPPENED_CARD_BODY),
        para(HAPPENED_ASIDE),
        bubble(closing, 'narrator'),
      ),
    );
    ctx.done();
  },
};

/* ------------------------------------------------- beat 4: two futures */

const futuresSlide: Slide = {
  id: 'room-6-futures',
  render(el: HTMLElement, ctx: SlideContext) {
    el.append(
      fitHeader({
        eyebrow: 'room 6 · two futures',
        title: 'So what happens to consent?',
      }),
      fitBody(
        twoFutures({
          bad: { title: BAD_FUTURE.title, bullets: BAD_FUTURE.bullets },
          bright: { title: BRIGHT_FUTURE.title, bullets: BRIGHT_FUTURE.bullets },
          badIllo: 'room-6-bad',
          brightIllo: 'room-6-bright',
        }),
        bubble(
          'The same tool call leads to both. What decides it is whether your agent answers for you, or brings the clause back to you.',
          'narrator',
        ),
      ),
    );
    ctx.done();
  },
};

/* -------------------------------------------------------------- the room */

const room: Room = {
  id: 'room-6',
  number: 6,
  title: 'Room 6 — Verification',
  siteType: 'Verification',
  wants: 'a proven fact about you',
  prediction: 'Build human-only walls. CAPTCHAs for consent.',
  // The long explanation lives on the Door slide, not above the form.
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
