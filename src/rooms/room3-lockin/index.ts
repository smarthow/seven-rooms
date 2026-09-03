/* rooms/room3-lockin/index.ts — Room 3, Lock-in.
 *
 * Beats, in the order SPEC §4 fixes:
 *
 *   1. Door             — doorSlide(room), shared factory
 *   2. The Options      — registers list_my_data + export_everything, shows the
 *                         dashboard sandbox, unlocks on the first tool call,
 *                         unregisters in its cleanup
 *   3. What just happened
 *   4. Two futures      — twoFutures({ bad, bright })
 *   5. The prediction   — predictionSlide(room), shared factory
 *
 * Layout (docs/ROOM_GUIDE.md §"Above the fold"): the long explanation lives on
 * the Door slide via `room.lead`, and the Options slide is a `fitHeader` plus
 * one `splitPane` — the dashboard, the switching-cost meter and the bundle in
 * `main`, the tools, prompt, ghost button and narrator in `side`. Only the
 * dashboard's tab body ever scrolls.
 *
 * The point of the room: the human-facing Export button is grey ("Enterprise
 * plan"), but the page hands the agent a working export tool. The fourteen-hour
 * switching cost was never a wall — it was tiredness, and the agent does not
 * get tired.
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
  BAD_FUTURE,
  BRIGHT_FUTURE,
  CONTACTS,
  DOOR_LINE,
  FILES,
  HAPPENED_TITLE,
  LIST_LINE,
  NOTES,
  OPTIONS_INTRO,
  PROMPT_HINT,
  REACTION_DETAIL,
  REACTION_LINE,
  ROOM_LEAD,
  SITE_NAME,
  SWITCHING_HOURS,
  TOOLS_INTRO,
} from './content';
import { createDashboardSandbox } from './sandbox';
import './room.css';

const ROOM_NUMBER = 3;

/** What `list_my_data()` reports. Counts and categories, nothing heavy. */
function dataInventory() {
  const contactTags = Array.from(new Set(CONTACTS.map((c) => c.tag)));
  return {
    site: SITE_NAME,
    categories: [
      { name: 'contacts', count: CONTACTS.length, tags: contactTags },
      { name: 'notes', count: NOTES.length, oldest: NOTES[NOTES.length - 1].updated },
      { name: 'files', count: FILES.length, types: ['pdf', 'docx', 'jpg', 'png', 'txt'] },
    ],
    total_items: CONTACTS.length + NOTES.length + FILES.length,
    switching_cost_hours: SWITCHING_HOURS,
    human_export_button: 'disabled — Enterprise plan only',
  };
}

/** The portable bundle. Small on purpose: counts plus the first item of each. */
function exportBundle(format: 'json' | 'csv') {
  return {
    file: `nimbus-notes-export.${format}`,
    format,
    contacts: {
      count: CONTACTS.length,
      first: `${CONTACTS[0].name} <${CONTACTS[0].email}>`,
    },
    notes: {
      count: NOTES.length,
      first: `${NOTES[0].title} — ${NOTES[0].body}`,
    },
    files: {
      count: FILES.length,
      first: `${FILES[0].name} (${FILES[0].size})`,
    },
    total_items: CONTACTS.length + NOTES.length + FILES.length,
    switching_cost_hours_now: 0,
    note: 'Full bundle is portable and yours. Import it anywhere.',
  };
}

/** The three lines drawn inside the "Portable bundle — yours" card. */
function bundleCardLines(format: 'json' | 'csv'): string[] {
  return [
    `${CONTACTS.length} contacts · ${NOTES.length} notes · ${FILES.length} files`,
    `format: ${format} · ready to import somewhere else`,
    `time it took: about one second, not ${SWITCHING_HOURS} hours`,
  ];
}

/* ------------------------------------------------------- beat 2: options */

const optionsSlide: Slide = {
  id: 'room-3-options',
  render(el: HTMLElement, ctx: SlideContext) {
    const sandbox = createDashboardSandbox();
    const character = agentChar('idle');
    const thoughtEl = thinking();
    const reactionBox = liveStack();

    let calls = 0;
    let listed = false;
    let exported = false;

    /**
     * A reaction may push the side column past its own bottom edge. Bring it
     * into view inside that column — never by moving the page.
     */
    const revealReaction = () => {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // the newest line, not the whole box: the box can be taller than the
      // column, and the visitor needs to see what was just written
      const target = reactionBox.lastElementChild ?? reactionBox;
      target.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'nearest',
      });
    };

    /** One place for the bookkeeping both tools share. */
    const record = (tool: string, args: Record<string, unknown>, result: unknown) => {
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

    /* ------------------------------------------------------------- tools */

    const listMyData: PageTool = {
      name: 'list_my_data',
      summary:
        'How many contacts, notes and files are in here.',
      description:
        'List what this dashboard holds about the signed-in user: how many contacts, notes and files there are, and what kinds. Read-only. No arguments.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      // No readOnlyHint. The description says read-only about the DATA, and
      // that is true — but the call switches the dashboard's visible tab and
      // unlocks the slide, so the tool does modify its environment.
      async execute(args) {
        await new Promise((resolve) => window.setTimeout(resolve, 200));
        const result = dataInventory();

        sandbox.showTab('files');
        character.set('done');

        record('list_my_data', args, {
          total_items: result.total_items,
          contacts: CONTACTS.length,
          notes: NOTES.length,
          files: FILES.length,
        });

        if (!listed) {
          listed = true;
          reactionBox.append(bubble(LIST_LINE, 'narrator'));
          revealReaction();
        }
        return result;
      },
    };

    const exportEverything: PageTool = {
      name: 'export_everything',
      summary:
        'Takes everything out as one portable bundle.',
      description:
        'Export everything this dashboard holds about the signed-in user as one portable bundle, in json or csv. Returns a summary of the bundle: counts and the first item of each kind.',
      inputSchema: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            enum: ['json', 'csv'],
            description: 'File format for the bundle. Use "json" unless you need a spreadsheet.',
          },
        },
        required: ['format'],
        additionalProperties: false,
      },
      async execute(args) {
        const raw = String(args.format ?? 'json').toLowerCase();
        const format: 'json' | 'csv' = raw === 'csv' ? 'csv' : 'json';

        await new Promise((resolve) => window.setTimeout(resolve, 240));
        const result = exportBundle(format);

        sandbox.runExport(format, bundleCardLines(format));
        character.set('done');

        record('export_everything', args, {
          file: result.file,
          total_items: result.total_items,
          switching_cost_hours_now: 0,
        });

        if (!exported) {
          exported = true;
          reactionBox.append(
            bubble(REACTION_LINE, 'narrator'),
            para(REACTION_DETAIL),
          );
          revealReaction();
        }
        return result;
      },
    };

    const tools = [listMyData, exportEverything];
    // Registered HERE, on the Options slide, and nowhere else.
    const unregister = tools.map((tool) => registerPageTool(tool));

    /* --------------------------------------------------------- ghost run */

    const plan: GhostStep[] = [
      {
        tool: 'list_my_data',
        args: {},
        thought: 'First, what is actually in here. Calling list_my_data().',
      },
      {
        tool: 'export_everything',
        args: { format: 'json' },
        thought: 'Fifteen items. Taking all of it as json — the fourteen hours are not mine to spend.',
      },
    ];

    // No connected agent? Then the simulation is the main way through this
    // room, so it leads. With a real agent attached, the prompt leads instead
    // and the ghost run drops back to a secondary button.
    const ghostLeads = ctx.agent.prefersGhost;

    const ghost = ghostButton({
      tools,
      plan,
      tone: ghostLeads ? 'accent' : 'ghost',
      onThought: (text) => (thoughtEl.textContent = text),
      onStart: () => character.set('thinking'),
      onFinish: () => character.set('done'),
    });

    /* ---------------------------------------------------------- the slide */

    const hintEl = promptHint(PROMPT_HINT);
    const ghostRow = buttonRow(ghost.el);

    // Above the fold: a compact header, then ONE body row split in two.
    // main = the dashboard, the switching-cost meter and the bundle card.
    // side = tools, prompt, ghost button, narrator.
    el.append(
      fitHeader({
        eyebrow: 'room 3 · the options',
        title: 'Three years of your stuff. One grey button.',
        lead: OPTIONS_INTRO,
      }),
      splitPane({
        ratio: 58,
        main: sandbox.el,
        side: stack(
          compactToolCards([listMyData, exportEverything]),
          tiny(TOOLS_INTRO),
          ...(ghostLeads ? [ghostRow, hintEl] : [hintEl, ghostRow]),
          character.el,
          thoughtEl,
          reactionBox,
        ),
      }),
    );

    ctx.hint('run a tool to continue');

    // MUST unregister: by slide 3 this room has no tools. Abort the ghost
    // first: a plan still in flight would keep exporting against a destroyed
    // sandbox and unlock the prediction slide, skipping the vote.
    return () => {
      ghost.abort();
      for (const off of unregister) off();
      sandbox.destroy();
    };
  },
};

/* ----------------------------------------------- beat 3: what happened */

const happenedSlide: Slide = {
  id: 'room-3-happened',
  render(el: HTMLElement, ctx: SlideContext) {
    const calls = ctx.log.byRoom(ROOM_NUMBER);
    const didExport = calls.some((entry) => entry.tool === 'export_everything');

    el.append(
      fitHeader({
        eyebrow: 'room 3 · what just happened',
        title: HAPPENED_TITLE,
      }),
      fitBody(
        // The drawing is the explanation on this slide, so it gets the same
        // generous scale as the type slides rather than the deck's `lg`.
        withClass(illo('room-3-happened', { size: 'lg' }), 'illo--type'),
        para(HAPPENED_POINT),
        bubble(
          didExport
            ? 'Your data left through a door the site built and then forgot was a door.'
            : 'You left it all inside. The tools were there — and they are on every page like this one.',
          'narrator',
        ),
      ),
    );
    ctx.done();
  },
};

/* ------------------------------------------------- beat 4: two futures */

const futuresSlide: Slide = {
  id: 'room-3-futures',
  render(el: HTMLElement, ctx: SlideContext) {
    el.append(
      fitHeader({
        eyebrow: 'room 3 · two futures',
        title: 'So what happens to the dashboard you cannot leave?',
      }),
      fitBody(
        twoFutures({
          bad: { title: BAD_FUTURE.title, bullets: BAD_FUTURE.bullets },
          bright: { title: BRIGHT_FUTURE.title, bullets: BRIGHT_FUTURE.bullets },
          badIllo: 'room-3-bad',
          brightIllo: 'room-3-bright',
        }),
        bubble(
          'One future costs a lawyer. The other costs an export tool. Guess which ships first.',
          'narrator',
        ),
      ),
    );
    ctx.done();
  },
};

/* -------------------------------------------------------------- the room */

const room: Room = {
  id: 'room-3',
  number: 3,
  title: 'Room 3 — Lock-in',
  siteType: 'Lock-in',
  wants: 'your data inside',
  prediction: 'Refuse. No export tool, ever.',
  // The long explanation lives on the Door slide, not above the dashboard.
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
