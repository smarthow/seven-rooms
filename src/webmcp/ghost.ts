/* webmcp/ghost.ts — the ghost agent.
 *
 * Most visitors will not have a WebMCP-enabled browser. So the site plays the
 * agent's part: it steps through a small, room-written plan, says what it is
 * "thinking", and calls the SAME `execute` functions a real agent would call.
 *
 * It is a simulation and the UI always says so. But it is an honest one: no
 * separate code path, no faked results. Whatever the ghost sees, a real agent
 * would have seen too.
 */

import type { PageTool } from './bridge';

export interface GhostStep {
  /** Tool name to call. Must be one of `tools`. */
  tool: string;
  /** Arguments to pass. */
  args: Record<string, unknown>;
  /** One short line of "thinking", shown before the call. */
  thought: string;
}

export interface RunGhostAgentOptions {
  /** The tools the room registered (the ghost only calls these). */
  tools: PageTool[];
  /** The room-specific script. */
  plan: GhostStep[];
  /** Show a thinking bubble. Called with '' when the run finishes. */
  onThought(text: string): void;
  /** Pause between steps. Default 900ms — slow enough to read. */
  delayMs?: number;
  /** Optional per-step hook, handy for logging or highlighting. */
  onResult?(step: GhostStep, result: unknown): void;
  /**
   * Abort the run. A plan takes seconds and the visitor can leave the slide
   * mid-flight; without this the remaining steps would keep calling tools the
   * slide has already unregistered, against a sandbox it has already
   * destroyed, and would unlock whatever slide is now on screen.
   */
  signal?: AbortSignal;
}

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** How many ghost plans are executing right now. */
let ghostDepth = 0;

/**
 * True while a ghost plan is executing. Rooms use it (through `callSource()`
 * in bridge.ts) to label their activity-log entries, so a simulated call is
 * never filed as a real one.
 */
export const ghostIsRunning = (): boolean => ghostDepth > 0;

/**
 * Run a plan. Resolves when every step is done, or as soon as `signal` aborts.
 *
 * The delay is deliberate: the point of the room is that the human SEES the
 * agent do in one second what the site wanted them to spend two minutes on.
 */
export async function runGhostAgent(opts: RunGhostAgentOptions): Promise<void> {
  const delay = opts.delayMs ?? 900;
  const byName = new Map(opts.tools.map((t) => [t.name, t]));

  ghostDepth += 1;
  try {
    for (const step of opts.plan) {
      if (opts.signal?.aborted) return;
      opts.onThought(step.thought);
      await sleep(delay);
      if (opts.signal?.aborted) return;

      const tool = byName.get(step.tool);
      if (!tool) {
        opts.onThought(`(no tool named ${step.tool} — skipping)`);
        await sleep(delay / 2);
        continue;
      }

      // Same execute a real agent reaches through the bridge. This is the point.
      const result = await tool.execute(step.args);
      opts.onResult?.(step, result);
      await sleep(Math.round(delay * 0.4));
    }

    opts.onThought('');
  } finally {
    ghostDepth -= 1;
  }
}
