/* webmcp/activity.ts — the shared record of every tool call in the session.
 *
 * Why it is persisted: the ending builds a report card out of it. A visitor who
 * reloads on room 5 should not lose rooms 1–4. It lives in the same namespaced
 * localStorage as everything else (`sevenrooms:activity`).
 *
 * Results are truncated before storing so one chatty tool cannot blow the
 * localStorage quota.
 */

import { store } from '../engine/store';
import type { ActivityEntry, ActivityInput, ActivityLog, ActivitySource } from '../engine/types';

const KEY = 'activity';
const MAX_ENTRIES = 300;
const MAX_RESULT_CHARS = 600;
/** Arguments are agent-supplied prose. Cap each one before it is persisted. */
const MAX_ARG_CHARS = 200;

/**
 * Rooms pass `callSource(ctx)`, which has four states. The report card only
 * distinguishes real from simulated, so collapse it here — once, in one place.
 *
 * `'ghost'` is the only simulated source. Everything else is a real call:
 * `'api'` in particular means an agent called a tool before it bothered to
 * shake hands, which is still an agent doing real work.
 */
function normaliseSource(source: ActivityInput['source']): ActivitySource {
  return source === 'ghost' ? 'ghost' : 'webmcp';
}

/** Keep a stored value small and JSON-able. */
function shrink(value: unknown, max = MAX_RESULT_CHARS): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.length > max ? `${value.slice(0, max)}…` : value;
  }
  try {
    const json = JSON.stringify(value);
    if (json.length <= max) return JSON.parse(json) as unknown;
    return `${json.slice(0, max)}…`;
  } catch {
    return String(value);
  }
}

/**
 * Arguments come from the caller, so their size is not ours to trust. One
 * `accept_terms({ signature: "A".repeat(200_000) })` would otherwise put
 * 200 KB in localStorage — which survives reloads, can trip the quota (the
 * store swallows that failure, so the log would silently stop persisting) and
 * turns the report card into a wall of text.
 */
function shrinkArgs(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args ?? {})) {
    out[key.slice(0, 64)] = shrink(value, MAX_ARG_CHARS);
  }
  return out;
}

function createActivityLog(): ActivityLog {
  let entries: ActivityEntry[] = store.get<ActivityEntry[]>(KEY, []);
  if (!Array.isArray(entries)) entries = [];

  const listeners = new Set<(entry: ActivityEntry, all: ActivityEntry[]) => void>();

  const persist = () => store.set(KEY, entries);

  return {
    record(entry: ActivityInput): void {
      const full: ActivityEntry = {
        room: entry.room,
        tool: entry.tool,
        args: shrinkArgs(entry.args ?? {}),
        result: shrink(entry.result),
        source: normaliseSource(entry.source),
        at: entry.at ?? Date.now(),
      };
      entries.push(full);
      if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES);
      persist();
      for (const fn of listeners) {
        try {
          fn(full, entries);
        } catch {
          /* a broken listener must not break a tool call */
        }
      }
    },

    all(): ActivityEntry[] {
      return entries.slice();
    },

    byRoom(room: number): ActivityEntry[] {
      return entries.filter((e) => e.room === room);
    },

    subscribe(fn: (entry: ActivityEntry, all: ActivityEntry[]) => void): () => void {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    clear(): void {
      entries = [];
      persist();
    },
  };
}

/** The one log the whole site shares. */
export const activityLog: ActivityLog = createActivityLog();
