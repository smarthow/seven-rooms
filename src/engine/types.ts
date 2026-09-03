/* engine/types.ts — the whole contract of Seven Rooms in one file.
 *
 * Everything else (engine, webmcp, chapters, rooms) depends on these types and
 * nothing depends on the rooms. Interfaces live here — not in src/webmcp — so
 * that engine and webmcp never import each other in a circle.
 */

/**
 * The four honest states of this page's agent surface.
 *
 * Since we ship the `@mcp-b/global` polyfill, `document.modelContext` ALWAYS
 * exists — so feature detection can no longer mean "an agent is here". It only
 * means "tools are exposed". The only proof of a live agent is that it called
 * the `handshake` tool.
 *
 *  - `none`  — no tool API at all (polyfill failed / non-browser context)
 *  - `api`   — tools are registered and discoverable, nobody has called them
 *  - `agent` — a real agent called `handshake` on this page
 *  - `ghost` — the visitor chose the in-page simulation
 */
export type AgentMode = 'none' | 'api' | 'agent' | 'ghost';

/**
 * Every `AgentMode`, in order. Anything that iterates the four states (the
 * status chip's CSS classes) reads this instead of re-typing the union as
 * string literals, so adding a fifth state cannot leave a stale class behind.
 */
export const MODES: AgentMode[] = ['none', 'api', 'agent', 'ghost'];

/** How the page is talking to an agent right now. */
export interface AgentSurface {
  mode: AgentMode;
  /** Short human label, shown in the status chip. */
  label: string;
  /**
   * True when there is no connected agent, so a slide should lead with its
   * ghost/simulation CTA instead of a "ask your agent" one.
   * (`ghost` and `none`.)
   */
  prefersGhost: boolean;
}

/**
 * The only distinction the report card makes: was this call real, or was it
 * the in-page simulation? `'ghost'` is the simulation; `'webmcp'` is a real
 * call, whether or not the agent bothered to shake hands first.
 */
export type ActivitySource = 'webmcp' | 'ghost';

/** One tool call as the log stores it. This is what the ending report reads. */
export interface ActivityEntry {
  /** Room number, or 0 for calls made outside a room. */
  room: number;
  /** Tool name, snake_case. */
  tool: string;
  /** Arguments the agent passed (strings are capped before storing). */
  args: Record<string, unknown>;
  /** Whatever `execute` returned (kept small — it is stored in localStorage). */
  result: unknown;
  /** Real or simulated. Normalised by the log; never written by a caller. */
  source: ActivitySource;
  /** Epoch ms. Filled in by the log if a caller omits it. */
  at?: number;
}

/** What a caller hands to `log.record()`. */
export interface ActivityInput {
  room: number;
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  /**
   * The live agent mode. Rooms pass `callSource(ctx)` from webmcp/bridge,
   * which returns `'ghost'` while the simulation is running and
   * `ctx.agent.mode` otherwise. The log collapses it to an `ActivitySource`.
   */
  source: AgentMode;
  at?: number;
}

/** Shared, persisted record of every tool call in the session. */
export interface ActivityLog {
  record(entry: ActivityInput): void;
  all(): ActivityEntry[];
  byRoom(room: number): ActivityEntry[];
  /** Called on every new entry. Returns an unsubscribe function. */
  subscribe(fn: (entry: ActivityEntry, all: ActivityEntry[]) => void): () => void;
  clear(): void;
}

/** Namespaced localStorage helper (`sevenrooms:` prefix). Never throws. */
export interface Store {
  get<T>(key: string, fallback: T): T;
  set(key: string, value: unknown): void;
  remove(key: string): void;
  clear(): void;
}

/** What a slide is handed when it renders. */
export interface SlideContext {
  /** Unlock the Next button. Safe to call more than once. */
  done(): void;
  /** Shared agent-activity log. Every tool execute must record here. */
  log: ActivityLog;
  /**
   * The agent surface, read live — this is a getter, so a slide that keeps the
   * context around sees the handshake / ghost choice as soon as it happens.
   */
  readonly agent: AgentSurface;
  /** Programmatic advance. Rare — prefer done() and let the visitor click. */
  goNext(): void;
  /** Namespaced localStorage. */
  store: Store;
  /**
   * Optional short line shown near the Next button while the slide is locked,
   * e.g. "run a tool to continue". Pass '' to clear it.
   */
  hint(text: string): void;
}

export interface Slide {
  id: string;
  /** Render into `el`. Return an optional cleanup fn (unregister tools, clear timers). */
  render(el: HTMLElement, ctx: SlideContext): void | (() => void);
}

export interface Chapter {
  id: string; // 'intro' | 'types' | 'room-1' ... 'room-7' | 'ending'
  title: string; // shown in the progress bar tooltip
  slides: Slide[];
}

export interface Room extends Chapter {
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  siteType: string; // e.g. "Attention"
  wants: string; // e.g. "human seconds on the page"
  prediction: string; // one line: what this site type will most likely do about agents
  /**
   * Optional. The room's long explanation — the paragraph that used to sit
   * above the sandbox on the Options slide. It is shown on the Door slide
   * (beat 1) instead, so beat 2 fits above the fold. 2–3 sentences, max.
   */
  lead?: string;
  /**
   * The narrator's one-liner on the Door slide (beat 1). Every word of a room
   * lives in that room's folder, so this comes from its `content.ts` —
   * `doorSlide()` falls back to a generic line if a room leaves it out.
   */
  doorLine?: string;
}

/** The three answers offered by every room's prediction vote. */
export type VoteOption = 'open' | 'charge' | 'block';
