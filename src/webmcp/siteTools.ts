/* webmcp/siteTools.ts — the five tools the SITE itself exposes.
 *
 * Rooms register their own tools while they are on screen. These five are
 * different: they are registered once at boot (from engine/deck.ts, the one
 * place that holds both the deck and the shell) and they are what a real agent
 * finds when it walks in the door.
 *
 * `handshake` is the important one. Because src/main.ts imports the
 * `@mcp-b/global` polyfill, `document.modelContext` exists in every browser —
 * so the page can no longer infer "an agent is here" from feature detection.
 * The only honest proof is an agent calling a tool. `handshake` is that tool.
 *
 * They are removed by `unregisterAll()` at the ending, along with everything
 * else. The walls close on the site's own tools too — that is the point.
 */

import type { ActivityLog, Chapter, Room, Store } from '../engine/types';
import { callSource, getAgentSurface, registerPageTool, setSurfaceMode } from './bridge';

/** Everything the tools need from the deck, without importing the deck. */
export interface SiteToolsHost {
  /** The running order, so `list_rooms` never drifts from the real deck. */
  chapters: Chapter[];
  log: ActivityLog;
  store: Store;
  /** Where the visitor is right now. */
  where(): {
    chapterId: string;
    chapterTitle: string;
    slideId: string;
    /** 0-based, within the chapter. */
    slideIndex: number;
    slideCount: number;
    /** Room number, or 0 outside a room. */
    room: number;
  };
  /** True when the Next button is on screen and clickable. */
  canAdvance(): boolean;
  /** The "waiting for…" line shown next to Next, or '' when there is none. */
  waitingFor(): string;
  next(): void;
  /** Jump to the first slide of a chapter id, e.g. 'room-3'. */
  goToChapter(id: string): void;
}

const SITE_BLURB =
  'Seven Rooms is a hand-drawn interactive explainer about WebMCP: seven kinds of website, ' +
  'one AI agent, and what each site does when software starts doing the visiting. ' +
  'Every room hands you real tools, lets you (or a ghost simulation) call them, then asks you to predict how that site type will react.';

function isRoom(chapter: Chapter): chapter is Room {
  return typeof (chapter as Room).number === 'number';
}

function voteOf(store: Store, room: number): string | null {
  return store.get<string | null>(`vote:room-${room}`, null);
}

/** 1,500 chars is the recommended tool-output ceiling (docs/webmcp-api.md §5). */
const MAX_RESULT_CHARS = 1500;

function cap(text: string): string {
  return text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS - 1)}…` : text;
}

/**
 * Register the five site tools. Returns a function that removes them all —
 * though in practice `unregisterAll()` at the ending is what closes them.
 */
export function registerSiteTools(host: SiteToolsHost): () => void {
  const record = (tool: string, args: Record<string, unknown>, result: unknown) => {
    // callSource, not the raw mode: a site tool called from inside a ghost
    // plan is still a simulated call and must be labelled as one.
    host.log.record({
      room: 0,
      tool,
      args,
      result,
      source: callSource({ agent: getAgentSurface() }),
    });
  };

  /** Wrap an execute so every call lands in the activity log with room 0. */
  const logged =
    (name: string, run: (args: Record<string, unknown>) => string) =>
    (args: Record<string, unknown>): string => {
      const text = cap(run(args ?? {}));
      record(name, args ?? {}, text);
      return text;
    };

  const slideStatus = (): string => {
    const at = host.where();
    if (host.canAdvance()) return 'Nothing — the Next button is enabled, so next_slide() will work.';
    const note = host.waitingFor();
    return note
      ? `The Next button is locked. This slide is waiting for: ${note}`
      : 'The Next button is locked. This slide is waiting for something on it to be used — a tool call, a vote, or a button.' +
          (at.room ? ` You are in room ${at.room}; its tools are registered while this slide is on screen.` : '');
  };

  const offs = [
    registerPageTool({
      name: 'handshake',
      description:
        'Confirm to this page that an AI agent is connected and can call its tools. Call this first. Returns what the site is and how to proceed.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: logged('handshake', () => {
        setSurfaceMode('agent');
        const at = host.where();
        return (
          'Handshake accepted — this page now shows "Agent connected" instead of falling back to its ghost simulation.\n\n' +
          `${SITE_BLURB}\n\n` +
          `You are on: ${at.chapterTitle} (${at.chapterId}), slide ${at.slideIndex + 1} of ${at.slideCount}.\n` +
          'Next: call describe_site() for the current slide, list_rooms() for the seven rooms, ' +
          'next_slide() to advance when the page allows it, and go_to_room(number) to jump to a room door. ' +
          'Each room registers its own tools while it is on screen — re-list the tools after you move.'
        );
      }),
      annotations: { readOnlyHint: false },
    }),

    registerPageTool({
      name: 'describe_site',
      description:
        'Describe this page: what Seven Rooms is, which chapter and slide the visitor is on, and what this slide is waiting for before it will let them continue.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: logged('describe_site', () => {
        const at = host.where();
        return (
          `${SITE_BLURB}\n\n` +
          `Now showing: ${at.chapterTitle} (${at.chapterId}), slide ${at.slideIndex + 1}/${at.slideCount}, id "${at.slideId}".\n` +
          `${at.room ? `This is room ${at.room}.\n` : ''}` +
          `Waiting for: ${slideStatus()}\n` +
          `Agent surface: ${getAgentSurface().label}.`
        );
      }),
      annotations: { readOnlyHint: true },
    }),

    registerPageTool({
      name: 'list_rooms',
      description:
        'List the seven rooms: number, the kind of website it is, what that site wants from a visitor, and whether this visitor has already cast their prediction vote there.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: logged('list_rooms', () => {
        const lines = host.chapters.filter(isRoom).map((room) => {
          const vote = voteOf(host.store, room.number);
          return `${room.number}. ${room.siteType} — wants ${room.wants} — ${vote ? `voted "${vote}"` : 'not voted'}`;
        });
        return lines.length
          ? `${lines.join('\n')}\n\nUse go_to_room(number) to jump to a room's door slide.`
          : 'No rooms are in this deck.';
      }),
      annotations: { readOnlyHint: true },
    }),

    registerPageTool({
      name: 'go_to_room',
      description:
        'Move the visitor to the door of one of the seven rooms (its first slide). It never skips ahead inside a room.',
      inputSchema: {
        type: 'object',
        properties: {
          number: { type: 'integer', minimum: 1, maximum: 7, description: 'Room number, 1 to 7.' },
        },
        required: ['number'],
        additionalProperties: false,
      },
      execute: logged('go_to_room', (args) => {
        const n = Number(args.number);
        if (!Number.isInteger(n) || n < 1 || n > 7) {
          return `"${String(args.number)}" is not a room. Pick a whole number from 1 to 7 — call list_rooms() to see them.`;
        }
        const room = host.chapters.filter(isRoom).find((r) => r.number === n);
        if (!room) return `Room ${n} is not in this deck.`;
        host.goToChapter(room.id);
        return `Opened room ${n}: ${room.siteType} (${room.id}, door slide). It wants ${room.wants}. This room registers its own tools as you move through it.`;
      }),
      annotations: { readOnlyHint: false },
    }),

    registerPageTool({
      name: 'next_slide',
      description:
        'Advance to the next slide, but only if the page has already unlocked its Next button. If it is still locked, this explains what the slide is waiting for instead of forcing it.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: logged('next_slide', () => {
        if (!host.canAdvance()) return slideStatus();
        host.next();
        const at = host.where();
        return `Advanced. Now showing ${at.chapterTitle} (${at.chapterId}), slide ${at.slideIndex + 1}/${at.slideCount}. ${slideStatus()}`;
      }),
      annotations: { readOnlyHint: false },
    }),
  ];

  return () => {
    for (const off of offs) off();
  };
}
