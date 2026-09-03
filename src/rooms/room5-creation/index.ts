/* rooms/room5-creation/index.ts — Room 5, Creation.
 *
 * This is the positive core of the site, and the only room whose mechanic is
 * impossible without WebMCP: a human and an agent editing the same object at
 * the same moment, with no approval step in between.
 *
 * Beats (SPEC §4):
 *   1. Door             — doorSlide(room)
 *   2. The Options      — four tools + the shared canvas + the ghost duet
 *   3. What just happened
 *   4. Two futures      — twoFutures({ bad, bright })
 *   5. The prediction   — predictionSlide(room)
 *
 * The tools registered on beat 2 are unregistered by the cleanup beat 2
 * returns, so beat 3 onwards has no tools.
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
  hand,
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
  AFTER_RUN_LINE,
  BAD_FUTURE,
  BRIGHT_FUTURE,
  COLLISION_LINE,
  DOOR_LINE,
  FIRST_CALL_LINE,
  FUTURES_CODA,
  GHOST_NOTE,
  HAPPENED_BODY,
  HAPPENED_BODY_2,
  HAPPENED_CARD_BODY,
  HAPPENED_CARD_TITLE,
  HAPPENED_TITLE,
  KEEP_CLICKING,
  OPTIONS_INTRO,
  PALETTE,
  PROMPT_HINT,
  ROOM_LEAD,
  TOOL_LINES,
} from './content';
import type { TileColor } from './content';
import { COLS, ROWS, createCanvasSandbox } from './sandbox';
import './room.css';

const ROOM_NUMBER = 5;

/** The shape the ghost agent draws: a pixel heart, 32 tiles on the 8 × 7 grid.
 *  Painted row by row with `paint_tiles`, so it takes six strokes, not thirty. */
const SHAPE: Array<{ x: number; y: number; color: TileColor }> = [
  { x: 1, y: 0, color: 'coral' },
  { x: 2, y: 0, color: 'coral' },
  { x: 5, y: 0, color: 'coral' },
  { x: 6, y: 0, color: 'coral' },
  { x: 0, y: 1, color: 'coral' },
  { x: 1, y: 1, color: 'orange' },
  { x: 2, y: 1, color: 'orange' },
  { x: 3, y: 1, color: 'coral' },
  { x: 4, y: 1, color: 'coral' },
  { x: 5, y: 1, color: 'coral' },
  { x: 6, y: 1, color: 'coral' },
  { x: 7, y: 1, color: 'coral' },
  { x: 0, y: 2, color: 'coral' },
  { x: 1, y: 2, color: 'orange' },
  { x: 2, y: 2, color: 'coral' },
  { x: 3, y: 2, color: 'coral' },
  { x: 4, y: 2, color: 'coral' },
  { x: 5, y: 2, color: 'coral' },
  { x: 6, y: 2, color: 'coral' },
  { x: 7, y: 2, color: 'coral' },
  { x: 1, y: 3, color: 'coral' },
  { x: 2, y: 3, color: 'coral' },
  { x: 3, y: 3, color: 'coral' },
  { x: 4, y: 3, color: 'coral' },
  { x: 5, y: 3, color: 'coral' },
  { x: 6, y: 3, color: 'coral' },
  { x: 2, y: 4, color: 'coral' },
  { x: 3, y: 4, color: 'coral' },
  { x: 4, y: 4, color: 'coral' },
  { x: 5, y: 4, color: 'coral' },
  { x: 3, y: 5, color: 'coral' },
  { x: 4, y: 5, color: 'coral' },
];

/** Row-by-row strokes, top to bottom, each with the thought said out loud while painting it. */
const STROKES: Array<{ y: number; thought: string }> = [
  { y: 0, thought: 'Two bumps on top. You keep clicking — I am not going to wait for you.' },
  { y: 1, thought: 'The widest row, straight across. Lighter tiles on the left, where the light would hit.' },
  { y: 2, thought: 'Second full row. Nothing here asked either of us for permission.' },
  { y: 3, thought: 'Now it narrows.' },
  { y: 4, thought: 'Narrower.' },
  { y: 5, thought: 'And the point at the bottom. That is a heart.' },
];

const tileKey = (t: { x: number; y: number }) => `${t.x},${t.y}`;

/* ------------------------------------------------------- beat 2: options */

const optionsSlide: Slide = {
  id: 'room-5-options',
  render(el: HTMLElement, ctx: SlideContext) {
    const sandbox = createCanvasSandbox();
    const character = agentChar('idle');
    const thoughtEl = thinking();
    const reactionBox = liveStack();

    let calls = 0;
    let saidCollision = false;
    let saidFinish = false;

    const record = (tool: string, args: Record<string, unknown>, result: unknown) => {
      ctx.log.record({ room: ROOM_NUMBER, tool, args, result, source: callSource(ctx) });
    };

    /**
     * Bring the newest narrator line into view INSIDE the side column. Never
     * the page: at >= 768px the page does not scroll at all.
     */
    const revealReaction = () => {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      reactionBox.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest' });
    };

    /** Runs once, on the first successful tool call. */
    const onFirstCall = () => {
      calls += 1;
      if (calls > 1) return;
      character.set('done');
      reactionBox.append(bubble(FIRST_CALL_LINE, 'narrator'), hand(KEEP_CLICKING));
      ctx.hint('');
      ctx.done();
      revealReaction();
    };

    sandbox.onCollision(() => {
      if (saidCollision) return;
      saidCollision = true;
      reactionBox.append(bubble(COLLISION_LINE, 'narrator'));
      revealReaction();
    });

    /* ------------------------------------------------------------- tools */

    const setTile: PageTool = {
      name: 'set_tile',
      description:
        'Paint one tile on the shared canvas. x is 0-7, left to right. y is 0-6, top to bottom. ' +
        'color must be one of: paper, coral, orange, teal, ink (paper means empty). ' +
        'The tile changes the moment you call this. There is no approval step, and the human is drawing on the same canvas at the same time.',
      inputSchema: {
        type: 'object',
        properties: {
          x: { type: 'integer', minimum: 0, maximum: COLS - 1, description: 'Column, 0-7, left to right.' },
          y: { type: 'integer', minimum: 0, maximum: ROWS - 1, description: 'Row, 0-6, top to bottom.' },
          color: {
            type: 'string',
            enum: [...PALETTE],
            description: 'One of paper, coral, orange, teal, ink. paper means empty.',
          },
        },
        required: ['x', 'y', 'color'],
        additionalProperties: false,
      },
      execute(args) {
        const x = Number(args.x);
        const y = Number(args.y);
        const color = String(args.color) as TileColor;

        if (!sandbox.inBounds(x, y) || !PALETTE.includes(color)) {
          const error = {
            error: `Off the canvas or unknown colour. x must be 0-${COLS - 1}, y must be 0-${ROWS - 1}, color must be one of: ${PALETTE.join(', ')}.`,
          };
          record('set_tile', args, error);
          return error;
        }

        const tile = sandbox.setTile(x, y, color, 'agent');
        const result = {
          x: tile.x,
          y: tile.y,
          color: tile.color,
          touched_by: tile.owner === 'both' ? 'the human and you' : 'you',
          collision: tile.collision,
          note: tile.collision
            ? 'The human set this tile less than four seconds ago. It is now marked as touched by both of you.'
            : 'Painted. No approval was needed.',
        };
        record('set_tile', args, { x, y, color, collision: tile.collision });
        onFirstCall();
        return result;
      },
    };


    const paintTiles: PageTool = {
      name: 'paint_tiles',
      description:
        'Paint up to 24 tiles in one call. Pass an array of {x, y, color}: x is 0-7, y is 0-6, ' +
        'color is one of paper, coral, orange, teal, ink. Every tile changes the moment you call this — no approval step — ' +
        'and the human may be painting the same tiles at the same time. Use this to draw shapes; use set_tile for single tiles.',
      inputSchema: {
        type: 'object',
        properties: {
          tiles: {
            type: 'array',
            minItems: 1,
            maxItems: 24,
            description: 'Tiles to paint, in order.',
            items: {
              type: 'object',
              properties: {
                x: { type: 'integer', minimum: 0, maximum: COLS - 1 },
                y: { type: 'integer', minimum: 0, maximum: ROWS - 1 },
                color: { type: 'string', enum: [...PALETTE] },
              },
              required: ['x', 'y', 'color'],
              additionalProperties: false,
            },
          },
        },
        required: ['tiles'],
        additionalProperties: false,
      },
      execute(args) {
        const list = Array.isArray(args.tiles) ? (args.tiles as Array<Record<string, unknown>>).slice(0, 24) : [];
        if (list.length === 0) {
          const error = { error: 'Pass a non-empty tiles array of {x, y, color}.' };
          record('paint_tiles', args, error);
          return error;
        }
        let painted = 0;
        const skipped: string[] = [];
        const collisions: string[] = [];
        for (const item of list) {
          const x = Number(item.x);
          const y = Number(item.y);
          const color = String(item.color) as TileColor;
          if (!sandbox.inBounds(x, y) || !PALETTE.includes(color)) {
            skipped.push(`${x},${y}`);
            continue;
          }
          const tile = sandbox.setTile(x, y, color, 'agent');
          painted += 1;
          if (tile.collision) collisions.push(`${x},${y}`);
        }
        const result = {
          painted,
          skipped: skipped.length ? skipped : undefined,
          collisions: collisions.length ? collisions : undefined,
          note: collisions.length
            ? `${collisions.length} of these tiles had just been set by the human; they are now marked as touched by both of you.`
            : 'Painted. No approval was needed.',
        };
        record('paint_tiles', { tiles: list.length }, { painted, skipped: skipped.length, collisions: collisions.length });
        onFirstCall();
        return result;
      },
    };

    const getCanvas: PageTool = {
      name: 'get_canvas',
      description:
        'Return the whole shared canvas as a small text grid, plus which tiles were painted by the human, by you, or by both of you, and how many collisions have happened. No arguments.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      // No readOnlyHint: reading the canvas unlocks the slide. The result does
      // reflect what the human drew, so it is flagged as content this page did
      // not author.
      annotations: { untrustedContentHint: true },
      execute(args) {
        const text = sandbox.describe();
        const stats = sandbox.stats();
        record('get_canvas', args, { by_human: stats.you, by_agent: stats.agent, by_both: stats.both });
        onFirstCall();
        // The description promises the per-owner counts and the collisions, so
        // return them as fields rather than making an agent parse the grid.
        return {
          canvas: text,
          by_human: stats.you,
          by_agent: stats.agent,
          by_both: stats.both,
          collisions: stats.collisions,
        };
      },
    };

    const clearTile: PageTool = {
      name: 'clear_tile',
      description:
        'Set one tile back to paper, which means empty. x is 0-7, y is 0-6. This also takes effect immediately, with no approval step, even if the human painted that tile a second ago.',
      inputSchema: {
        type: 'object',
        properties: {
          x: { type: 'integer', minimum: 0, maximum: COLS - 1, description: 'Column, 0-7, left to right.' },
          y: { type: 'integer', minimum: 0, maximum: ROWS - 1, description: 'Row, 0-6, top to bottom.' },
        },
        required: ['x', 'y'],
        additionalProperties: false,
      },
      execute(args) {
        const x = Number(args.x);
        const y = Number(args.y);
        if (!sandbox.inBounds(x, y)) {
          const error = { error: `Off the canvas. x must be 0-${COLS - 1} and y must be 0-${ROWS - 1}.` };
          record('clear_tile', args, error);
          return error;
        }
        const tile = sandbox.clearTile(x, y, 'agent');
        record('clear_tile', args, { x, y, collision: tile.collision });
        onFirstCall();
        return { x, y, color: tile.color, collision: tile.collision, note: 'Cleared.' };
      },
    };

    const tools = [setTile, paintTiles, getCanvas, clearTile];
    const unregister = tools.map((tool) => registerPageTool(tool));

    /* --------------------------------------------------------- ghost run */

    /**
     * Built at click time, not up front: the ghost reads the canvas first and
     * then aims two of its strokes at tiles the human has already touched, the
     * way a real agent would after calling get_canvas().
     */
    const buildPlan = (): GhostStep[] => {
      const mine = sandbox.humanTiles();
      const shapeKeys = new Set(SHAPE.map(tileKey));
      const inside = mine.filter((t) => shapeKeys.has(tileKey(t)));
      const outside = mine.filter((t) => !shapeKeys.has(tileKey(t)));

      const steps: GhostStep[] = [
        {
          tool: 'get_canvas',
          args: {},
          thought: mine.length
            ? `Reading the canvas first. You have ${mine.length} tile${mine.length === 1 ? '' : 's'} down — I will draw over the ones in my way and leave the rest alone.`
            : 'Before I draw anything, let me see what is already on the canvas.',
        },
      ];

      STROKES.forEach((stroke, i) => {
        const tiles = SHAPE.filter((t) => t.y === stroke.y);
        const reused = tiles.filter((t) => inside.some((m) => m.x === t.x && m.y === t.y));
        steps.push({
          tool: 'paint_tiles',
          args: { tiles },
          thought: reused.length
            ? `${stroke.thought} That row crosses ${reused.length} of your tile${reused.length === 1 ? '' : 's'} — I am painting over ${reused.length === 1 ? 'it' : 'them'}.`
            : stroke.thought,
        });
        if (i === 2 && mine.length === 0) {
          steps.push({
            tool: 'get_canvas',
            args: {},
            thought: 'Checking where you have got to, so I build on your tiles instead of around them.',
          });
        }
      });

      if (outside.length) {
        steps.push({
          tool: 'get_canvas',
          args: {},
          thought: `Done. Your tile${outside.length === 1 ? '' : 's'} at ${outside
            .slice(0, 3)
            .map((t) => `${t.x},${t.y}`)
            .join(' · ')} ${outside.length === 1 ? 'is' : 'are'} outside the heart. ${outside.length === 1 ? 'It stays' : 'They stay'} yours.`,
        });
      }

      return steps;
    };

    // Which call to action leads. `prefersGhost` is a live getter on the
    // agent surface: true when there is no real agent listening, so the
    // simulation goes first; false when one is, and the prompt goes first.
    const ghostFirst = ctx.agent.prefersGhost;

    // The plan is built at click time (see buildPlan), so a second run reacts
    // to the canvas as it is now — which is exactly why this room's button has
    // to come back after the first run.
    const ghost = ghostButton({
      tools,
      plan: buildPlan,
      delayMs: 650,
      tone: ghostFirst ? 'accent' : 'ghost',
      onThought: (text) => (thoughtEl.textContent = text),
      onStart: () => character.set('thinking'),
      onFinish: () => character.set('done'),
      onComplete: () => {
        if (saidFinish) return;
        saidFinish = true;
        reactionBox.append(bubble(AFTER_RUN_LINE, 'narrator'));
        revealReaction();
      },
    });

    /* --------------------------------------------------------- the slide */

    // The two calls to action, in the order this visitor's surface wants.
    const ctas = ghostFirst
      ? [buttonRow(ghost.el), tiny(GHOST_NOTE), promptHint(PROMPT_HINT)]
      : [promptHint(PROMPT_HINT), buttonRow(ghost.el), tiny(GHOST_NOTE)];

    // Above the fold: a compact header, then ONE body row split in two.
    // main = the canvas and its counters. side = tools, CTAs, narrator.
    el.append(
      fitHeader({
        eyebrow: 'room 5 · the options',
        title: 'Both of you. At once. No asking.',
        lead: OPTIONS_INTRO,
      }),
      splitPane({
        ratio: 58,
        main: sandbox.el,
        side: stack(
          compactToolCards([
            { name: setTile.name, description: TOOL_LINES.set_tile },
            { name: paintTiles.name, description: TOOL_LINES.paint_tiles },
            { name: getCanvas.name, description: TOOL_LINES.get_canvas },
            { name: clearTile.name, description: TOOL_LINES.clear_tile },
          ]),
          ...ctas,
          character.el,
          thoughtEl,
          reactionBox,
        ),
      }),
    );

    ctx.hint('run a tool to continue');

    // Abort the ghost before anything else: its plan is seven steps long, and
    // painting into a destroyed sandbox is exactly the bug that guard exists
    // to prevent.
    return () => {
      ghost.abort();
      for (const off of unregister) off();
      sandbox.destroy();
    };
  },
};

/* ----------------------------------------------- beat 3: what happened */

const happenedSlide: Slide = {
  id: 'room-5-happened',
  render(el: HTMLElement, ctx: SlideContext) {
    const calls = ctx.log.byRoom(ROOM_NUMBER);
    const paints = calls.filter((entry) => entry.tool === 'set_tile' || entry.tool === 'clear_tile');
    const clashes = calls.filter(
      (entry) =>
        typeof entry.result === 'object' &&
        entry.result !== null &&
        (entry.result as { collision?: boolean }).collision === true,
    );

    el.append(
      fitHeader({
        eyebrow: 'room 5 · what just happened',
        title: HAPPENED_TITLE,
      }),
      fitBody(
        para(HAPPENED_BODY),
        para(HAPPENED_BODY_2),
        card(HAPPENED_CARD_TITLE, HAPPENED_CARD_BODY),
        bubble(
          paints.length > 0
            ? `Your agent changed ${paints.length} tile${paints.length === 1 ? '' : 's'} on a document you were holding, and ${
                clashes.length > 0
                  ? `${clashes.length} of those landed on a tile you had just touched`
                  : 'not one of them stopped to ask you first'
              }. In every other room that is the bad news. Here it is the product.`
            : 'You kept your hands to yourself. Fair — but this is the one room where letting go costs you nothing.',
          'narrator',
        ),
      ),
    );
    ctx.done();
  },
};

/* ------------------------------------------------- beat 4: two futures */

const futuresSlide: Slide = {
  id: 'room-5-futures',
  render(el: HTMLElement, ctx: SlideContext) {
    el.append(
      fitHeader({
        eyebrow: 'room 5 · two futures',
        title: 'So what happens to the things we make?',
      }),
      fitBody(
        twoFutures({
          bad: { title: BAD_FUTURE.title, bullets: BAD_FUTURE.bullets },
          bright: { title: BRIGHT_FUTURE.title, bullets: BRIGHT_FUTURE.bullets },
          badIllo: 'room-5-bad',
          brightIllo: 'room-5-bright',
        }),
        bubble(FUTURES_CODA, 'narrator'),
      ),
    );
    ctx.done();
  },
};

/* -------------------------------------------------------------- the room */

const room: Room = {
  id: 'room-5',
  number: 5,
  title: 'Room 5 — Creation',
  siteType: 'Creation',
  wants: 'you to make something here',
  prediction: 'Open everything. Adopt first.',
  // The long explanation lives on the Door slide, not above the canvas.
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
