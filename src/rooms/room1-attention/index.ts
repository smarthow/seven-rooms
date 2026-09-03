/* rooms/room1-attention/index.ts — Room 1, Attention. THE REFERENCE ROOM.
 *
 * Rooms 2–7 are built by copying this file. It follows SPEC §4 exactly:
 *
 *   1. Door             — doorSlide(room), shared factory
 *   2. The Options      — registers the tools, shows the sandbox, unlocks on
 *                         the first tool call, unregisters in its cleanup
 *   3. What just happened
 *   4. Two futures      — twoFutures({ bad, bright })
 *   5. The prediction   — predictionSlide(room), shared factory
 *
 * Two rules this file exists to demonstrate:
 *   - a tool's `execute` drives the sandbox AND records to `ctx.log`;
 *   - the tools registered on slide 2 are gone before slide 3 renders,
 *     because slide 2's render returns a cleanup that unregisters them.
 */

import { agent as agentChar } from '../../engine/characters';
import { doorSlide, predictionSlide } from '../../engine/roomSlides';
import type { Room, Slide, SlideContext } from '../../engine/types';
import {
  withClass,
  illo,
  bubble,
  buttonRow,
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
  tiny,
  twoFutures,
} from '../../engine/ui';
import { ghostButton } from '../../engine/ghostRun';
import { callSource, registerPageTool } from '../../webmcp/bridge';
import type { PageTool } from '../../webmcp/bridge';
import type { GhostStep } from '../../webmcp/ghost';

import {
  HAPPENED_POINT,
  ARTICLE_PARAGRAPHS,
  ARTICLE_SUMMARY,
  ARTICLE_TITLE,
  BAD_FUTURE,
  BRIGHT_FUTURE,
  HAPPENED_TITLE,
  DOOR_LINE,
  OPTIONS_INTRO,
  PROMPT_HINT,
  ROOM_LEAD,
  REACTION_DETAIL,
  REACTION_LINE,
  TOOLS_INTRO,
} from './content';
import { createArticleSandbox } from './sandbox';
import './room.css';

const ROOM_NUMBER = 1;

const FULL_TEXT = ARTICLE_PARAGRAPHS.join('\n\n');

/* ------------------------------------------------------- beat 2: options */

const optionsSlide: Slide = {
  id: 'room-1-options',
  render(el: HTMLElement, ctx: SlideContext) {
    const sandbox = createArticleSandbox();
    const character = agentChar('idle');
    const thoughtEl = thinking();
    const reactionBox = liveStack();

    let calls = 0;

    /** Shared by both tools: move the page, log the call, react once. */
    const onToolUsed = (tool: string, args: Record<string, unknown>, result: unknown) => {
      calls += 1;
      sandbox.skipToEnd();
      character.set('done');

      ctx.log.record({
        room: ROOM_NUMBER,
        tool,
        args,
        result,
        source: callSource(ctx),
      });

      if (calls === 1) {
        reactionBox.append(
          bubble(REACTION_LINE, 'narrator'),
          receipt(
            [
              `agent called: ${tool}()`,
              `human seconds spent: ${sandbox.humanSeconds()}s`,
              'ads seen by the agent: 0',
              'ad revenue from this read: $0.0000',
            ],
            'article__receipt',
          ),
          para(REACTION_DETAIL),
        );
        ctx.hint('');
        ctx.done();
        // the side column may have grown past its own bottom — bring the
        // narrator's line into view without moving the page
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        reactionBox.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
          block: 'nearest',
        });
      }
    };

    /* ------------------------------------------------------------- tools */

    const readArticle: PageTool = {
      name: 'read_article',
      summary:
        'Returns the whole article, so nothing has to be scrolled.',
      description:
        'Return the full text of the article on this page, so you can read it without scrolling. No arguments.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      // No readOnlyHint: "read" is the honest name, but calling this skips the
      // article to the end, zeroes the page's revenue for this read and
      // unlocks the slide. Even reading has a side effect here — which is the
      // whole argument of the room.
      async execute(args) {
        // 200ms: about as long as an agent needs. About as long as it takes a
        // human to read the headline.
        await new Promise((resolve) => window.setTimeout(resolve, 200));
        const result = {
          title: ARTICLE_TITLE,
          text: FULL_TEXT,
          words: FULL_TEXT.split(/\s+/).length,
        };
        onToolUsed('read_article', args, { title: result.title, words: result.words });
        return result;
      },
    };

    const getSummary: PageTool = {
      name: 'get_summary',
      summary:
        'One sentence instead of the whole article.',
      description:
        'Return a short, one-sentence summary of the article on this page. No arguments.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      // Not read-only either: same skip, same zeroed revenue.
      async execute(args) {
        await new Promise((resolve) => window.setTimeout(resolve, 200));
        onToolUsed('get_summary', args, ARTICLE_SUMMARY);
        return { summary: ARTICLE_SUMMARY };
      },
    };

    const tools = [readArticle, getSummary];
    // Registered HERE, on the Options slide, and nowhere else.
    const unregister = tools.map((tool) => registerPageTool(tool));

    /* --------------------------------------------------------- ghost run */

    const plan: GhostStep[] = [
      {
        tool: 'read_article',
        args: {},
        thought: 'The page offers read_article(). That is cheaper than scrolling. Calling it.',
      },
      {
        tool: 'get_summary',
        args: {},
        thought: 'Got the text. Asking for the page’s own summary to check I read it right.',
      },
    ];

    const ghost = ghostButton({
      tools,
      plan,
      onThought: (text) => (thoughtEl.textContent = text),
      onStart: () => character.set('thinking'),
      onFinish: () => character.set('done'),
    });

    /* ---------------------------------------------------------- the slide */

    // Above the fold: a compact header, then ONE body row split in two.
    // main = the sandbox. side = tools, prompt, ghost button, narrator.
    el.append(
      fitHeader({
        eyebrow: 'room 1 · the options',
        title: 'Read it yourself. Or don’t.',
        lead: OPTIONS_INTRO,
      }),
      splitPane({
        ratio: 58,
        main: sandbox.el,
        side: stack(
          compactToolCards([readArticle, getSummary]),
          tiny(TOOLS_INTRO),
          promptHint(PROMPT_HINT),
          buttonRow(ghost.el),
          character.el,
          thoughtEl,
          reactionBox,
        ),
      }),
    );

    ctx.hint('run a tool to continue');

    // MUST unregister: by slide 3 this room has no tools. Abort the ghost
    // FIRST — a plan still in flight would otherwise keep calling these tools
    // and drive a sandbox that no longer exists.
    return () => {
      ghost.abort();
      for (const off of unregister) off();
      sandbox.destroy();
    };
  },
};

/* ----------------------------------------------- beat 3: what happened */

const happenedSlide: Slide = {
  id: 'room-1-happened',
  render(el: HTMLElement, ctx: SlideContext) {
    const calls = ctx.log.byRoom(ROOM_NUMBER);
    el.append(
      fitHeader({
        eyebrow: 'room 1 · what just happened',
        title: HAPPENED_TITLE,
      }),
      fitBody(
        // The drawing is the explanation on this slide, so it gets the same
        // generous scale as the type slides rather than the deck's `lg`.
        withClass(illo('room-1-happened', { size: 'lg' }), 'illo--type'),
        para(HAPPENED_POINT),
        bubble(
          calls.length > 0
            ? `Your agent made ${calls.length} call${calls.length === 1 ? '' : 's'} in this room. The page earned nothing from any of them.`
            : 'You walked past the tools. Fair enough — but every other visitor’s agent will not.',
          'narrator',
        ),
      ),
    );
    ctx.done();
  },
};

/* ------------------------------------------------- beat 4: two futures */

const futuresSlide: Slide = {
  id: 'room-1-futures',
  render(el: HTMLElement, ctx: SlideContext) {
    el.append(
      fitHeader({
        eyebrow: 'room 1 · two futures',
        title: 'So what happens to the news?',
      }),
      fitBody(
        twoFutures({
          bad: { title: BAD_FUTURE.title, bullets: BAD_FUTURE.bullets },
          bright: { title: BRIGHT_FUTURE.title, bullets: BRIGHT_FUTURE.bullets },
          badIllo: 'room-1-bad',
          brightIllo: 'room-1-bright',
        }),
        bubble(
          'Both futures are already being built. The cheap one is the bad one.',
          'narrator',
        ),
      ),
    );
    ctx.done();
  },
};

/* -------------------------------------------------------------- the room */

const room: Room = {
  id: 'room-1',
  number: 1,
  title: 'Room 1 — Attention',
  siteType: 'Attention',
  wants: 'human seconds on the page',
  prediction: 'Block agents, or charge them per call.',
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
