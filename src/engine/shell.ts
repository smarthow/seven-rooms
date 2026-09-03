/* engine/shell.ts — the page chrome that never changes.
 *
 * Top bar: the title, a 10-segment chapter progress bar, and the persistent
 * Agent status chip (top-right) with a live ticker of the last tool call.
 * Bottom-right: the Next button, hidden until the slide calls `ctx.done()`.
 *
 * The shell owns no story logic. deck.ts drives it.
 */

import { store } from './store';
import { h } from './ui';
import { MODES } from './types';
import type { ActivityLog, AgentSurface, Chapter } from './types';
import {
  getAgentSurface,
  invokePageTool,
  listPageTools,
  onRegistryChange,
  onSurfaceChange,
  onToolCall,
} from '../webmcp/bridge';

/**
 * Fired on `window` when the site locks the agent out (the ending).
 * `dispatchEvent(new Event(LOCKOUT_EVENT))` and the status chip goes dark.
 */
export const LOCKOUT_EVENT = 'sevenrooms:lockout';

export interface ProgressHandle {
  /** Highlight chapter `index` (0-based) and mark earlier ones done. */
  set(index: number): void;
}

export interface AgentChipHandle {
  el: HTMLElement;
  /** Show a tool call in the ticker. */
  tick(text: string): void;
  /** Dim the chip — used by the ending when the walls close. */
  dark(on: boolean, note?: string): void;
}

export interface Shell {
  root: HTMLElement;
  /** Where the current slide is rendered. deck.ts adds `room-N` here. */
  stage: HTMLElement;
  progress: ProgressHandle;
  chip: AgentChipHandle;
  nextBtn: HTMLButtonElement;
  waitNote: HTMLElement;
  /** Drop every subscription (only used in tests / hot reload). */
  destroy(): void;
}

/* ----------------------------------------------------------- progress bar */

function buildProgress(chapters: Chapter[]): { el: HTMLElement; handle: ProgressHandle } {
  const segs = chapters.map((c) =>
    h('li', { class: 'progress__seg', title: c.title, 'aria-label': c.title }),
  );
  const el = h(
    'ol',
    { class: 'progress', 'aria-label': 'chapter progress' },
    ...segs,
  );
  return {
    el,
    handle: {
      set(index: number) {
        segs.forEach((seg, i) => {
          seg.classList.toggle('progress__seg--done', i < index);
          seg.classList.toggle('progress__seg--current', i === index);
        });
      },
    },
  };
}

/* ------------------------------------------------------- agent status chip */

/**
 * Four honest states, four dots:
 *   none  — grey, "No tool API in this browser"
 *   api   — teal and slowly pulsing: the tools are out there, nobody has called
 *           them yet. The pulse is the page waiting.
 *   agent — solid agent colour, "Agent connected"
 *   ghost — faint, "Ghost agent (simulation)"
 * Plus the existing dark "locked out" state, which the ending fires.
 */
function buildAgentChip(agent: AgentSurface, log: ActivityLog): {
  handle: AgentChipHandle;
  stop(): void;
} {
  let surface = agent;
  const modeEl = h('span', { class: 'agentchip__mode' }, surface.label);
  const tickerEl = h('span', { class: 'agentchip__ticker' }, 'no tool calls yet');
  const el = h(
    'div',
    {
      class: `agentchip agentchip--${surface.mode}`,
      title: surface.label,
      role: 'status',
      'aria-live': 'polite',
    },
    h('span', { class: 'agentchip__dot' }),
    h('span', { class: 'agentchip__text' }, modeEl, tickerEl),
  );
  let lastTick = 'no tool calls yet';
  let dark = false;

  const paint = (next: AgentSurface) => {
    surface = next;
    for (const mode of MODES) {
      el.classList.toggle(`agentchip--${mode}`, mode === surface.mode);
    }
    el.title = surface.label;
    if (!dark) modeEl.textContent = surface.label;
  };

  const offSurface = onSurfaceChange(paint);

  const tick = (text: string) => {
    tickerEl.textContent = text;
    lastTick = tickerEl.textContent ?? lastTick;
    tickerEl.classList.remove('agentchip__ticker--flash');
    // restart the flash animation
    void tickerEl.offsetWidth;
    tickerEl.classList.add('agentchip__ticker--flash');
  };

  // Two sources, one ticker: the bridge announces calls as they start, and the
  // activity log confirms them as they finish.
  const offCall = onToolCall(({ name }) => tick(`→ ${name}()`));
  const offLog = log.subscribe((entry) => tick(`✓ ${entry.tool}() · ${entry.source}`));

  return {
    handle: {
      el,
      tick,
      dark(on: boolean, note?: string) {
        dark = on;
        el.classList.toggle('agentchip--dark', on);
        if (on) {
          modeEl.textContent = 'Agent: locked out';
          tickerEl.textContent = note ?? 'no tools registered';
        } else {
          // Leaving the ending (browser Back, a deep link): restore the label
          // AND the ticker, or "the walls closed" lingers over a live room.
          paint(getAgentSurface());
          modeEl.textContent = surface.label;
          tickerEl.textContent = lastTick;
          tickerEl.classList.remove('agentchip__ticker--flash');
        }
      },
    },
    stop() {
      offCall();
      offLog();
      offSurface();
    },
  };
}


/* ------------------------------------------------------- agent console
 * A type-and-click channel for agents that can drive a page but cannot reach
 * its JavaScript objects (ChatGPT's Chrome control runs page scripts in a
 * locked-down sandbox: no createElement, no setAttribute — a real visitor's
 * agent hit exactly that). Every automation agent can fill an input and press
 * a button. Calls go through invokePageTool: the same path as a native call,
 * so they land in the activity log as real calls. */
function buildAgentConsole(): { el: HTMLElement; stop(): void } {
  const input = h('input', {
    class: 'agentconsole__input',
    type: 'text',
    name: 'call',
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-label': 'Tool call',
    placeholder: 'handshake   ·   go_to_room {"number": 3}',
  }) as HTMLInputElement;
  const out = h('pre', { class: 'agentconsole__out', 'aria-live': 'polite' }, 'No calls yet.');
  const toolsLine = h('p', { class: 'agentconsole__tools' });
  const refreshTools = () => {
    const names = listPageTools().map((t) => t.name);
    toolsLine.textContent = names.length
      ? `Tools on this page right now: ${names.join(', ')}`
      : 'No tools are registered on this page right now.';
  };
  const form = h(
    'form',
    { class: 'agentconsole__form' },
    input,
    h('button', { class: 'agentconsole__btn', type: 'submit' }, 'Call'),
  );
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const raw = input.value.trim();
    if (!raw) return;
    let name = raw;
    let args: Record<string, unknown> = {};
    const brace = raw.indexOf('{');
    try {
      if (raw.startsWith('{')) {
        const parsed = JSON.parse(raw) as { name?: string; args?: Record<string, unknown> };
        name = String(parsed.name ?? '');
        args = parsed.args ?? {};
      } else if (brace > 0) {
        name = raw.slice(0, brace).trim();
        args = JSON.parse(raw.slice(brace)) as Record<string, unknown>;
      }
    } catch (err) {
      out.textContent = `Could not parse the arguments: ${String(err)}`;
      return;
    }
    out.textContent = `→ ${name}(${Object.keys(args).length ? JSON.stringify(args) : ''}) …`;
    try {
      const result = await invokePageTool(name, args);
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 1);
      out.textContent = `✓ ${name}\n${text.length > 1500 ? text.slice(0, 1500) + '…' : text}`;
    } catch (err) {
      out.textContent = `✗ ${name}\n${String(err)}`;
    }
    input.value = '';
    refreshTools();
  });
  const details = h(
    'details',
    { class: 'agentconsole' },
    h('summary', { class: 'agentconsole__summary' }, 'Agent console'),
    h(
      'p',
      { class: 'agentconsole__help' },
      'For agents that can only type and click: enter a tool name, optionally followed by JSON arguments, then press Call. The result appears below as text. To connect, call ',
      h('code', null, 'handshake'),
      '.',
    ),
    toolsLine,
    form,
    out,
  );
  details.addEventListener('toggle', refreshTools);
  // The console is meant to be left open while the visitor walks from room to
  // room, and each room registers and removes its own tools. Follow the
  // registry itself rather than guessing from clicks, or the list goes stale
  // and sends an agent after tools that are no longer there.
  const offRegistry = onRegistryChange(refreshTools);
  refreshTools();
  return { el: details, stop: offRegistry };
}

/* ------------------------------------------------------------------ shell */

export function createShell(opts: {
  mount: HTMLElement;
  chapters: Chapter[];
  agent: AgentSurface;
  log: ActivityLog;
}): Shell {
  const { el: progressEl, handle: progress } = buildProgress(opts.chapters);
  const console_ = buildAgentConsole();
  // Live, not the boot snapshot: a reload with a remembered ghost/agent choice
  // must paint the chip correctly on the first frame.
  const chip = buildAgentChip(getAgentSurface(), opts.log);

  // tabindex="-1": not in the tab order, but deck.ts can move focus here on
  // every slide change so keyboard and screen-reader users land on the new
  // slide instead of back at the top bar. `.slide:focus` has no outline (the
  // stage is the whole screen); `:focus-visible` still rings real controls.
  const stage = h('main', { class: 'slide', id: 'slide', tabindex: '-1' });
  const stageWrap = h('div', { class: 'stage' }, stage);

  const nextBtn = h(
    'button',
    { class: 'nextbtn', type: 'button', hidden: true },
    'Next ',
    h('span', { class: 'nextbtn__key' }, '→'),
  );

  const waitNote = h('div', { class: 'waitnote', hidden: true });

  // "Start over" — wipes position, votes and the agent activity log, then
  // reloads at the title screen. A judge who inherits a half-finished run
  // (shared machine, earlier visit) needs a clean slate that is one click away.
  const restartBtn = h(
    'button',
    { class: 'restart', type: 'button', title: 'Erase this run and start from the beginning' },
    'Start over',
  );
  restartBtn.addEventListener('click', () => {
    const calls = opts.log.all().length;
    const msg = calls
      ? `Start over? This erases your votes and the ${calls} tool call${calls === 1 ? '' : 's'} recorded so far.`
      : 'Start over from the title screen?';
    if (!window.confirm(msg)) return;
    opts.log.clear();
    store.clear();
    location.hash = '';
    location.reload();
  });

  const root = h(
    'div',
    { class: 'shell' },
    h(
      'header',
      { class: 'topbar' },
      h('div', { class: 'brand' }, 'Seven Rooms'),
      progressEl,
      chip.handle.el,
      restartBtn,
    ),
    stageWrap,
    waitNote,
    nextBtn,
    console_.el,
  );

  opts.mount.appendChild(root);

  // The ending closes every tool and fires this. The chip goes dark with the
  // agent character, so the whole page agrees that the walls just shut.
  const onLockout = () => chip.handle.dark(true, 'the walls closed');
  window.addEventListener(LOCKOUT_EVENT, onLockout);

  return {
    root,
    stage,
    progress,
    chip: chip.handle,
    nextBtn,
    waitNote,
    destroy() {
      chip.stop();
      console_.stop();
      window.removeEventListener(LOCKOUT_EVENT, onLockout);
      root.remove();
    },
  };
}
