/* engine/ghostRun.ts — the one "Run ghost agent" button.
 *
 * All seven rooms need the same button with the same five behaviours, and
 * seven copies of it drifted apart:
 *
 *   1. one run at a time (a second click while a plan is in flight is ignored);
 *   2. the button comes back when the run ends — including when it throws —
 *      relabelled, because a second run is often the interesting one (watch
 *      room 5's duet again after the canvas has changed);
 *   3. an `AbortController` whose signal goes into `runGhostAgent`, exposed as
 *      `abort()` so the slide's cleanup can stop a run it is about to outlive.
 *      Without it the plan keeps calling tools the slide has unregistered,
 *      against a destroyed sandbox, and unlocks whatever slide is now on
 *      screen — which skipped a room's vote;
 *   4. the ghost-running flag, so every call the plan makes is labelled
 *      `ghost` in the activity log (see `callSource()` in webmcp/bridge);
 *   5. the character portrait's thinking / done states.
 *
 * A room writes:
 *
 *   const ghost = ghostButton({
 *     tools, plan, onThought: (t) => (thoughtEl.textContent = t),
 *     onStart: () => character.set('thinking'),
 *     onFinish: () => character.set('done'),
 *   });
 *   // …ghost.el goes in the side column…
 *   return () => { ghost.abort(); for (const off of unregister) off(); sandbox.destroy(); };
 */

import { button } from './ui';
import { runGhostAgent } from '../webmcp/ghost';
import type { GhostStep } from '../webmcp/ghost';
import type { PageTool } from '../webmcp/bridge';

export interface GhostButtonOptions {
  /** The tools the room registered. The plan may only name these. */
  tools: PageTool[];
  /**
   * The plan. Pass a function to build it at click time — rooms 5 and 7 read
   * the sandbox first so the ghost reacts to what the human already did.
   */
  plan: GhostStep[] | (() => GhostStep[]);
  /** Show a line of "thinking". Called with '' when the run finishes. */
  onThought(text: string): void;
  /** Pause between steps, in ms. Default 900 — slow enough to read. */
  delayMs?: number;
  /** Button label before the first run. */
  label?: string;
  /** Button label from the second run on. */
  againLabel?: string;
  /** Visual role. 'accent' when the simulation is the room's primary way in. */
  tone?: 'ghost' | 'accent';
  /** Small hand-written tag inside the button. Default 'simulation'. */
  tag?: string;
  /** Before the first step. Usually `character.set('thinking')`. */
  onStart?(): void;
  /** After the run, whether it finished, aborted or threw. */
  onFinish?(): void;
  /** Only after a run that finished on its own. Room 5's closing line. */
  onComplete?(): void;
}

export interface GhostButtonHandle {
  el: HTMLButtonElement;
  /**
   * Stop the run in flight. MUST be called from the slide's cleanup, before
   * the tools are unregistered and the sandbox is destroyed.
   */
  abort(): void;
}

export function ghostButton(opts: GhostButtonOptions): GhostButtonHandle {
  const label = opts.label ?? 'Run ghost agent';
  const againLabel = opts.againLabel ?? 'Run ghost agent again';

  let running = false;
  let controller: AbortController | null = null;
  let dead = false;
  /** Filled in below: the label's own text node, so the tag span survives. */
  let labelNode: ChildNode | null = null;

  const el = button(label, {
    tone: opts.tone ?? 'ghost',
    tag: opts.tag ?? 'simulation',
    onClick: async () => {
      if (running || dead) return;
      running = true;
      el.disabled = true;
      opts.onStart?.();

      const ac = new AbortController();
      controller = ac;

      try {
        await runGhostAgent({
          tools: opts.tools,
          plan: typeof opts.plan === 'function' ? opts.plan() : opts.plan,
          delayMs: opts.delayMs ?? 900,
          onThought: opts.onThought,
          signal: ac.signal,
        });
      } finally {
        running = false;
        controller = null;
        opts.onFinish?.();
        // The slide may be gone by now (that is what abort() means), so touch
        // nothing else — but a run that ended on its own leaves the button
        // ready for another go.
        if (!ac.signal.aborted && !dead) {
          el.disabled = false;
          if (labelNode) labelNode.textContent = againLabel;
          opts.onComplete?.();
        }
      }
    },
  });

  labelNode = el.firstChild;

  return {
    el,
    abort() {
      dead = true;
      controller?.abort();
    },
  };
}
