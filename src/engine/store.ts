/* engine/store.ts — localStorage wrapper, namespaced `sevenrooms:`.
 *
 * Never throws: private browsing, blocked site data and quota errors all fall
 * back to an in-memory map so the site keeps working.
 */

import type { Store } from './types';

const PREFIX = 'sevenrooms:';

const memory = new Map<string, string>();

function readRaw(key: string): string | null {
  try {
    const v = localStorage.getItem(PREFIX + key);
    if (v !== null) return v;
  } catch {
    /* storage blocked — fall through to memory */
  }
  return memory.has(PREFIX + key) ? (memory.get(PREFIX + key) as string) : null;
}

function writeRaw(key: string, raw: string): void {
  memory.set(PREFIX + key, raw);
  try {
    localStorage.setItem(PREFIX + key, raw);
  } catch {
    /* storage blocked — memory copy is enough for this session */
  }
}

function createStore(): Store {
  return {
    get<T>(key: string, fallback: T): T {
      const raw = readRaw(key);
      if (raw === null) return fallback;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },

    set(key: string, value: unknown): void {
      try {
        writeRaw(key, JSON.stringify(value));
      } catch {
        /* value was not JSON-able — ignore rather than break a slide */
      }
    },

    remove(key: string): void {
      memory.delete(PREFIX + key);
      try {
        localStorage.removeItem(PREFIX + key);
      } catch {
        /* ignore */
      }
    },

    clear(): void {
      for (const k of [...memory.keys()]) memory.delete(k);
      try {
        const doomed: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(PREFIX)) doomed.push(k);
        }
        for (const k of doomed) localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    },
  };
}

/** The one store the whole site shares. */
export const store: Store = createStore();
