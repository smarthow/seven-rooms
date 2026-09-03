/* webmcp/bridge.ts — the ONLY file that knows what the WebMCP API looks like.
 *
 * Rooms call `registerPageTool(tool)` and get back an `unregister()`. Rooms
 * return plain JSON-able values from `execute`; the browser serializes them.
 * This file adds nothing to the payload. If the browser API changes shape,
 * this file is the single place to patch.
 *
 * Aligned with docs/webmcp-api.md (researched Sept 2026):
 *  - the surface is `document.modelContext`. The earlier prototype used
 *    `navigator.modelContext`, which is deprecated but still checked so an
 *    older preview build is not left out; see the CORRECTION note in
 *    docs/webmcp-api.md for why `document` is the live answer, not a hedge
 *  - `registerTool(descriptor, { signal })` returns a promise
 *  - there is no `unregisterTool()`: removal is `AbortController.abort()`
 *  - `execute(input, { signal })` returns a PLAIN JSON-able value (spec: Promise<any>,
 *    serialized by the browser). NOT the MCP `{content:[…]}` shape — that is the
 *    MCP-B polyfill's own convention; ChatGPT's reference example returns `{ title }`.
 *
 * The site works with no agent surface at all: see webmcp/ghost.ts. Both paths
 * call the SAME `execute`, so the UI never has two code paths.
 *
 * `src/main.ts` loads `@mcp-b/global` (v5.1.0) ONLY when no native implementation exists. Per its
 * README ("Wraps the native context when present; otherwise installs and wraps
 * the polyfill") native Chromium WebMCP wins when it exists — verified in
 * node_modules/@mcp-b/global/dist/index.js, which captures the existing
 * `document.modelContext` and delegates `getTools()`/`executeTool()` to it.
 * Either way `findModelContext()` below finds one object and does not care
 * which implementation is underneath.
 */

import { startDomBridge, syncDomManifest } from './domBridge';
import type { DomBridgeTool } from './domBridge';
import type { AgentMode, AgentSurface, SlideContext } from '../engine/types';
import { store } from '../engine/store';
import { activityLog } from './activity';
import { ghostIsRunning } from './ghost';

export { activityLog };

/* -------------------------------------------------------- the room-facing API */

/** What a room writes. Plain, honest, small. */
export interface PageTool {
  /** snake_case, unique while registered, keep it under ~30 chars. */
  name: string;
  /** Short human-readable label for tool pickers (ChatGPT's "Site tools"). Derived from the name if omitted. */
  title?: string;
  /** Plain, honest. This text is read by the agent — no marketing, no tricks. */
  description: string;
  /** JSON Schema object, e.g. { type:'object', properties:{…}, required:[…] }. */
  inputSchema: Record<string, unknown>;
  /**
   * Return a plain JSON-able value — an object, a string, a number. The
   * browser serializes it and hands it to the agent as-is; the bridge does
   * not wrap it in anything.
   */
  execute(args: Record<string, unknown>): Promise<unknown> | unknown;
  /**
   * Optional hints. The spec's dictionary has exactly two members:
   * `readOnlyHint` (this tool does not modify its environment — only set it
   * when that is literally true) and `untrustedContentHint` (the result
   * contains text this page did not author).
   */
  annotations?: Record<string, unknown>;
}

/* ------------------------------------------------- minimal API surface types */

interface ModelContextLike {
  registerTool(
    descriptor: {
      name: string;
      title?: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations?: Record<string, unknown>;
      execute(input: Record<string, unknown>, ctx?: { signal?: AbortSignal }): Promise<unknown>;
    },
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ): Promise<unknown> | unknown;
  /** Some prototypes exposed a direct removal call. Used only if present. */
  unregisterTool?(name: string): unknown;
}

/* No `declare global` here: `@mcp-b/webmcp-types` (pulled in by @mcp-b/global,
 * which main.ts imports) already declares `document.modelContext` and the
 * deprecated `navigator.modelContext`. We narrow those to the small structural
 * shape above so this file stays the only place that knows the real API. */

/** Find whichever surface this browser actually exposes. */
function findModelContext(): { mc: ModelContextLike; where: string } | null {
  const asLike = (mc: unknown) => mc as unknown as ModelContextLike;
  // document first: that is the canonical surface, and @mcp-b/global wraps a
  // native implementation there when Chromium already provides one.
  if (typeof document !== 'undefined' && typeof document.modelContext?.registerTool === 'function') {
    return { mc: asLike(document.modelContext), where: 'document.modelContext' };
  }
  // navigator.modelContext is the deprecated prototype surface. Still checked
  // so an older preview build is not left out.
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.modelContext?.registerTool === 'function'
  ) {
    return { mc: asLike(navigator.modelContext), where: 'navigator.modelContext' };
  }
  return null;
}

/* ------------------------------------------------------------- detection */

/**
 * The honest label for each state. `api` is the interesting one: with the
 * polyfill imported, `document.modelContext` exists on every browser, so its
 * presence proves only that the tools are *exposed* — not that anyone is
 * listening. Only a `handshake` call proves that.
 */
const MODE_LABELS: Record<AgentMode, string> = {
  none: 'No tool API in this browser',
  api: 'Tools exposed · waiting for an agent',
  agent: 'Agent connected',
  ghost: 'Ghost agent (simulation)',
};

/** Where the visitor's connected/ghost choice is remembered. */
const SURFACE_KEY = 'surface';

let cachedDetection: AgentSurface | null = null;
/** null = "nothing chosen yet, fall back to detection". */
let chosenMode: AgentMode | null = null;
let chosenLoaded = false;

function surfaceOf(mode: AgentMode): AgentSurface {
  return {
    mode,
    label: MODE_LABELS[mode],
    prefersGhost: mode === 'ghost' || mode === 'none',
  };
}

/**
 * What this browser can do, with no agent involved: `api` when a
 * `document.modelContext` (native or polyfilled) is present, else `none`.
 * It can never return `agent` or `ghost` — those are choices, not features.
 */
function detectAgentSurface(): AgentSurface {
  if (!cachedDetection) {
    cachedDetection = surfaceOf(findModelContext() ? 'api' : 'none');
  }
  return cachedDetection;
}

function loadChoice(): AgentMode | null {
  if (!chosenLoaded) {
    chosenLoaded = true;
    // Only the ghost choice is ever persisted (see setSurfaceMode). A stored
    // 'agent' can only be a leftover from an older build; ignore it.
    chosenMode = store.get<string | null>(SURFACE_KEY, null) === 'ghost' ? 'ghost' : null;
  }
  return chosenMode;
}

/** The live surface: the remembered choice if there is one, else detection. */
export function getAgentSurface(): AgentSurface {
  const chosen = loadChoice();
  return chosen ? surfaceOf(chosen) : detectAgentSurface();
}

type SurfaceListener = (surface: AgentSurface) => void;
const surfaceListeners = new Set<SurfaceListener>();

/** Watch the agent surface. Returns an unsubscribe function. */
export function onSurfaceChange(fn: SurfaceListener): () => void {
  surfaceListeners.add(fn);
  return () => surfaceListeners.delete(fn);
}

/**
 * Move to a new state and tell everyone.
 *
 * Only `ghost` is remembered in the store (`sevenrooms:surface`): it is a
 * preference, and the visitor should not have to pick the simulation twice.
 * `agent` is NOT remembered — a handshake proves an agent is here *now*, and a
 * chip that still says "Agent connected" after a reload in a browser with no
 * agent anywhere near it is exactly the dishonesty `AgentMode` exists to
 * avoid. `none`/`api` clear the choice and fall back to detection.
 */
export function setSurfaceMode(mode: AgentMode): void {
  chosenLoaded = true;
  if (mode === 'agent') {
    chosenMode = 'agent';
    store.remove(SURFACE_KEY);
  } else if (mode === 'ghost') {
    chosenMode = 'ghost';
    store.set(SURFACE_KEY, 'ghost');
  } else {
    chosenMode = null;
    store.remove(SURFACE_KEY);
  }
  const surface = getAgentSurface();
  for (const fn of [...surfaceListeners]) {
    try {
      fn(surface);
    } catch {
      /* a broken listener must not break a handshake */
    }
  }
}

/**
 * Who is making the call that is happening right now.
 *
 * Every room stamps its activity-log entries with this, so the ending's report
 * card can label them honestly. The simulation must say so even when a real
 * agent has already shaken hands: pressing "Run ghost agent" is not the
 * connected agent doing the work.
 */
export function callSource(ctx: Pick<SlideContext, 'agent'>): AgentMode {
  return ghostIsRunning() ? 'ghost' : ctx.agent.mode;
}

/* ---------------------------------------------------------------- naming */

/** "go_to_room" -> "Go to room". Used when a tool has no explicit title. */
function titleFromName(name: string): string {
  const words = name.replace(/[_-]+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : name;
}

/* ---------------------------------------------------------- registration */

/** Everything currently registered, so `unregisterAll()` can close the walls. */
interface LiveEntry {
  tool: PageTool;
  unregister: () => void;
}
const live = new Map<string, LiveEntry>();

type CallListener = (info: { name: string; args: Record<string, unknown> }) => void;
const callListeners = new Set<CallListener>();

/** Watch every tool call as it starts (used by the agent status chip ticker). */
export function onToolCall(fn: CallListener): () => void {
  callListeners.add(fn);
  return () => callListeners.delete(fn);
}

type RegistryListener = () => void;
const registryListeners = new Set<RegistryListener>();

/**
 * Watch the registry itself: fired whenever a tool is registered or removed.
 * The agent console uses it to keep its "tools on this page right now" line
 * true while it is left open and the visitor walks from room to room.
 * Returns an unsubscribe function.
 */
export function onRegistryChange(fn: RegistryListener): () => void {
  registryListeners.add(fn);
  return () => registryListeners.delete(fn);
}

/**
 * The registry as the DOM manifest publishes it. An isolated-world agent must
 * not get less than a native one, so this includes the derived title and the
 * annotations — including the readOnlyHint / untrustedContentHint it would use
 * to decide what is safe to call.
 */
function manifestTools(): DomBridgeTool[] {
  return listPageTools().map((t) => ({
    name: t.name,
    title: t.title ?? titleFromName(t.name),
    description: t.description,
    inputSchema: t.inputSchema,
    ...(t.annotations ? { annotations: t.annotations } : {}),
  }));
}

/** Rewrite the DOM manifest and tell anyone watching the registry. */
function registryChanged(): void {
  syncDomManifest(manifestTools());
  for (const fn of [...registryListeners]) {
    try {
      fn();
    } catch {
      /* a broken listener must not break a registration */
    }
  }
}

function announce(name: string, args: Record<string, unknown>): void {
  for (const fn of callListeners) {
    try {
      fn({ name, args });
    } catch {
      /* ignore */
    }
  }
}

/**
 * Register one tool on the page's agent surface.
 *
 * Returns an `unregister()` function. Call it from the slide's cleanup — a room
 * MUST NOT leave tools registered after its Options slide.
 *
 * Safe to call with no agent surface present: the tool is still tracked here so
 * the ghost agent can run it and the UI stays identical.
 */
export function registerPageTool(tool: PageTool): () => void {
  const found = findModelContext();
  const controller = new AbortController();
  let removed = false;

  // Spec: `execute(inputObject, { signal })` returns Promise<any>; the browser
  // JSON-serializes it for the agent. So we hand back the room's plain value
  // untouched. A thrown error becomes `{ error }` rather than a rejection, so
  // the agent gets a readable reason instead of a bare failure.
  const wrappedExecute = async (input: Record<string, unknown>): Promise<unknown> => {
    const args = input ?? {};
    announce(tool.name, args);
    try {
      return await tool.execute(args);
    } catch (err) {
      return { error: `Tool "${tool.name}" failed: ${String(err)}` };
    }
  };

  if (found) {
    try {
      // `found.mc` IS the standard surface — `document.modelContext` (or the
      // deprecated `navigator.modelContext`), resolved once by
      // findModelContext() above. So this is the spec call, verbatim:
      //
      //   document.modelContext.registerTool({
      //     name, description, inputSchema, execute,
      //   });
      //
      // It goes through the resolved reference only so one code path can serve
      // the native surface and the polyfill.
      const registration = found.mc.registerTool(
        {
          name: tool.name,
          title: tool.title ?? titleFromName(tool.name),
          description: tool.description,
          inputSchema: tool.inputSchema,
          annotations: tool.annotations,
          execute: wrappedExecute,
        },
        { signal: controller.signal },
      );
      // registerTool returns a promise; a rejection (duplicate name, bad
      // schema) used to vanish silently. Surface it.
      Promise.resolve(registration).catch((err: unknown) =>
        console.warn(`[webmcp] registerTool("${tool.name}") rejected:`, err),
      );
    } catch (err) {
      console.warn(`[webmcp] could not register "${tool.name}":`, err);
    }
  }

  const entry: LiveEntry = { tool, unregister: () => {} };

  const unregister = () => {
    if (removed) return;
    removed = true;
    // Only remove OUR entry. If the same name was registered again after us,
    // that registration is the live one and must not be evicted by our stale
    // closure — the registry and the browser would then disagree about
    // whether the tool exists.
    if (live.get(tool.name) === entry) {
      live.delete(tool.name);
      registryChanged();
    }
    try {
      controller.abort();
      // Some prototype surfaces also offered a direct removal call.
      found?.mc.unregisterTool?.(tool.name);
    } catch {
      /* ignore */
    }
  };

  entry.unregister = unregister;
  live.set(tool.name, entry);
  registryChanged();
  return unregister;
}

/** Every tool registered right now, in registration order. */
export function listPageTools(): PageTool[] {
  return [...live.values()].map((entry) => entry.tool);
}

/** Look one up by name — the ghost agent uses this to find its targets. */
export function getPageTool(name: string): PageTool | undefined {
  return live.get(name)?.tool;
}

/**
 * Close every tool on the page. The ending calls this for real: the site does
 * what it predicts the web will do.
 */
export function unregisterAll(): void {
  for (const entry of [...live.values()]) entry.unregister();
  live.clear();
  registryChanged();
}

/**
 * Call a tool exactly the way a real agent would — through the same wrapper.
 * Used by the ghost agent, the agent console and the DOM bridge, so there is
 * only ever one execution path and one failure shape.
 *
 * A thrown error comes back as `{ error }` rather than a rejection, matching
 * the native path above. That means an agent never sees an MCP `isError`; for
 * this site a readable reason in the payload is the more useful answer, and
 * every caller here renders the payload as text.
 */
export async function invokePageTool(
  name: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const tool = getPageTool(name);
  if (!tool) throw new Error(`No tool named "${name}" is registered.`);
  announce(name, args);
  try {
    return await tool.execute(args);
  } catch (err) {
    return { error: `Tool "${name}" failed: ${String(err)}` };
  }
}

/* The DOM bridge mirrors the registry for agents whose scripts live in an
 * isolated world (see domBridge.ts). Same execution path: invokePageTool.
 * It gets the title and annotations too, so an isolated-world agent reads
 * exactly what a native one does. */
startDomBridge({
  list: manifestTools,
  invoke: (name, args) => invokePageTool(name, args),
});
