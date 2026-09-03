/* rooms/room5-creation/sandbox.ts — the shared canvas.
 *
 * What it models:
 *  - an 8 × 7 grid of 56 tiles, five colours, one shared document
 *  - the human clicks a tile to cycle its colour; the tools set a tile directly
 *  - NO approval step: a tool call changes the tile the instant it lands
 *  - per-tile authorship: coral corner = the human, teal = the agent,
 *    striped = both of them touched it
 *  - collisions: if one side repaints a tile the other side touched in the
 *    last COLLISION_WINDOW_MS, the tile flashes and a counter goes up
 *
 * Nothing in here knows about WebMCP. index.ts wires the tools to these
 * methods, so a real agent and the ghost agent both land in the same place —
 * and so does the human's mouse.
 */

import { h, stat, statRow } from '../../engine/ui';
import { APP_NAME, APP_SUBTITLE, COLOR_LETTER, LEGEND_LINE, PALETTE } from './content';
import type { TileColor } from './content';

export const COLS = 8;
export const ROWS = 7;

/** How recently the other side must have touched a tile for it to count as a clash. */
export const COLLISION_WINDOW_MS = 4000;

export type Toucher = 'you' | 'agent';
export type Owner = 'none' | 'you' | 'agent' | 'both';

export interface TileState {
  x: number;
  y: number;
  color: TileColor;
  /** 'you' = the human, 'agent' = the agent, 'both' = both have touched it. */
  owner: Owner;
}

export interface SetTileResult extends TileState {
  /** True if the other side had touched this tile in the last four seconds. */
  collision: boolean;
}

export interface CanvasStats {
  you: number;
  agent: number;
  both: number;
  collisions: number;
}

export interface CanvasSandbox {
  el: HTMLElement;
  /** Paint one tile. `by` is who did it. Returns the new tile state. */
  setTile(x: number, y: number, color: TileColor, by: Toucher): SetTileResult;
  /** Set a tile back to `paper`. Same bookkeeping as setTile. */
  clearTile(x: number, y: number, by: Toucher): SetTileResult;
  /** A compact text picture of the whole canvas, for `get_canvas()`. */
  describe(): string;
  /** Live counts under the grid. */
  stats(): CanvasStats;
  /** Tiles the human has touched, most recent first. Used to plan reuse. */
  humanTiles(): Array<{ x: number; y: number; color: TileColor }>;
  /** Called on the human's first click, once. */
  onFirstHumanClick(fn: () => void): void;
  /** Called every time a tool call clashes with a fresh human tile. */
  onCollision(fn: (tile: SetTileResult) => void): void;
  /** True if the coordinates are on the grid. */
  inBounds(x: number, y: number): boolean;
  destroy(): void;
}

interface Cell {
  color: TileColor;
  touchedYou: boolean;
  touchedAgent: boolean;
  lastBy: Toucher | null;
  lastAt: number;
  /** Order of the human's touches, so humanTiles() can be recent-first. */
  humanSeq: number;
  btn: HTMLButtonElement;
  mark: HTMLElement;
}

const key = (x: number, y: number) => `${x},${y}`;

export function createCanvasSandbox(): CanvasSandbox {
  const cells = new Map<string, Cell>();
  const grid = h('div', { class: 'canvas__grid', role: 'group', 'aria-label': 'shared canvas' });

  let collisions = 0;
  let humanClock = 0;
  let firstClickFn: (() => void) | null = null;
  let collisionFn: ((tile: SetTileResult) => void) | null = null;
  let destroyed = false;

  /* --------------------------------------------------------------- readouts */

  const youStat = stat('tiles by you', '0');
  const agentStat = stat('by the agent', '0');
  const bothStat = stat('by both', '0');
  const clashStat = stat('collisions', '0');
  clashStat.el.classList.add('canvas__stat--clash');

  const refreshStats = () => {
    const s = countOwners();
    youStat.value.textContent = String(s.you);
    agentStat.value.textContent = String(s.agent);
    bothStat.value.textContent = String(s.both);
    clashStat.value.textContent = String(collisions);
    clashStat.el.classList.toggle('canvas__stat--hot', collisions > 0);
  };

  function countOwners(): CanvasStats {
    let you = 0;
    let agent = 0;
    let both = 0;
    for (const cell of cells.values()) {
      if (cell.touchedYou && cell.touchedAgent) both += 1;
      else if (cell.touchedYou) you += 1;
      else if (cell.touchedAgent) agent += 1;
    }
    return { you, agent, both, collisions };
  }

  /* ------------------------------------------------------------- the grid */

  const paint = (cell: Cell) => {
    for (const name of PALETTE) cell.btn.classList.remove(`tile--${name}`);
    cell.btn.classList.add(`tile--${cell.color}`);

    const owner: Owner =
      cell.touchedYou && cell.touchedAgent
        ? 'both'
        : cell.touchedYou
          ? 'you'
          : cell.touchedAgent
            ? 'agent'
            : 'none';

    cell.btn.classList.toggle('tile--you', owner === 'you');
    cell.btn.classList.toggle('tile--agent', owner === 'agent');
    cell.btn.classList.toggle('tile--both', owner === 'both');
    cell.mark.hidden = owner === 'none';
  };

  const ownerOf = (cell: Cell): Owner =>
    cell.touchedYou && cell.touchedAgent
      ? 'both'
      : cell.touchedYou
        ? 'you'
        : cell.touchedAgent
          ? 'agent'
          : 'none';

  const flash = (cell: Cell) => {
    cell.btn.classList.remove('tile--flash');
    // Force a reflow so the animation restarts on a repeat clash.
    void cell.btn.offsetWidth;
    cell.btn.classList.add('tile--flash');
  };

  const onFlashEnd = (event: AnimationEvent) => {
    const target = event.target as HTMLElement | null;
    target?.classList.remove('tile--flash');
  };

  const nextColor = (color: TileColor): TileColor => {
    const i = PALETTE.indexOf(color);
    return PALETTE[(i + 1) % PALETTE.length];
  };

  /** The one place a tile ever changes. Human clicks and tool calls both land here. */
  const touch = (x: number, y: number, color: TileColor, by: Toucher): SetTileResult => {
    const cell = cells.get(key(x, y));
    if (!cell) return { x, y, color, owner: 'none', collision: false };

    const now = performance.now();
    const other: Toucher = by === 'you' ? 'agent' : 'you';
    const clash = cell.lastBy === other && now - cell.lastAt < COLLISION_WINDOW_MS;

    cell.color = color;
    if (by === 'you') {
      cell.touchedYou = true;
      humanClock += 1;
      cell.humanSeq = humanClock;
    } else {
      cell.touchedAgent = true;
    }
    cell.lastBy = by;
    cell.lastAt = now;

    paint(cell);

    const result: SetTileResult = { x, y, color, owner: ownerOf(cell), collision: clash };

    if (clash) {
      collisions += 1;
      flash(cell);
      collisionFn?.(result);
    }
    refreshStats();
    return result;
  };

  const onGridClick = (event: MouseEvent) => {
    const target = (event.target as HTMLElement | null)?.closest('button.tile');
    if (!(target instanceof HTMLButtonElement)) return;
    const x = Number(target.dataset.x);
    const y = Number(target.dataset.y);
    const cell = cells.get(key(x, y));
    if (!cell) return;
    touch(x, y, nextColor(cell.color), 'you');
    if (firstClickFn) {
      const fn = firstClickFn;
      firstClickFn = null;
      fn();
    }
  };

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const mark = h('span', { class: 'tile__mark', hidden: true, 'aria-hidden': 'true' });
      const btn = h(
        'button',
        {
          class: 'tile tile--paper',
          type: 'button',
          'data-x': String(x),
          'data-y': String(y),
          'aria-label': `tile ${x},${y}`,
        },
        mark,
      ) as HTMLButtonElement;
      btn.addEventListener('animationend', onFlashEnd);
      cells.set(key(x, y), {
        color: 'paper',
        touchedYou: false,
        touchedAgent: false,
        lastBy: null,
        lastAt: 0,
        humanSeq: 0,
        btn,
        mark,
      });
      grid.appendChild(btn);
    }
  }

  grid.addEventListener('click', onGridClick);

  /* ---------------------------------------------------------- description */

  const listOf = (pick: (cell: Cell) => boolean): string => {
    const out: string[] = [];
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const cell = cells.get(key(x, y));
        if (cell && pick(cell)) out.push(`${x},${y}`);
      }
    }
    return out.length > 0 ? out.join(' ') : 'none';
  };

  const describe = (): string => {
    const rows: string[] = [];
    for (let y = 0; y < ROWS; y += 1) {
      let line = '';
      for (let x = 0; x < COLS; x += 1) {
        line += COLOR_LETTER[cells.get(key(x, y))?.color ?? 'paper'];
      }
      rows.push(line);
    }
    return [
      `canvas ${COLS} wide x ${ROWS} tall. x is 0-${COLS - 1} left to right, y is 0-${ROWS - 1} top to bottom.`,
      ...rows,
      `legend: ${LEGEND_LINE}`,
      `painted by the human: ${listOf((c) => c.touchedYou && !c.touchedAgent)}`,
      `painted by you: ${listOf((c) => c.touchedAgent && !c.touchedYou)}`,
      `painted by both: ${listOf((c) => c.touchedYou && c.touchedAgent)}`,
      `collisions so far: ${collisions}`,
    ].join('\n');
  };

  /* ----------------------------------------------------------- the markup */

  const el = h(
    'div',
    { class: 'canvas' },
    h(
      'div',
      { class: 'canvas__frame' },
      h(
        'div',
        { class: 'canvas__bar' },
        h('span', { class: 'canvas__name' }, APP_NAME),
        h('span', { class: 'canvas__sub' }, APP_SUBTITLE),
      ),
      // The stage is the height-bound box: on desktop it takes whatever
      // height the pane has left, and the grid fits INSIDE it at 8/7 —
      // so the tiles shrink instead of the page growing.
      h('div', { class: 'canvas__stage' }, grid),
      h(
        'div',
        { class: 'canvas__keys' },
        h('span', { class: 'canvas__keyyou' }, 'coral mark = you'),
        h('span', { class: 'canvas__keyagent' }, 'teal mark = the agent'),
        h('span', { class: 'canvas__keyboth' }, 'striped = both'),
      ),
    ),
    statRow(youStat.el, agentStat.el, bothStat.el, clashStat.el),
  );

  return {
    el,
    setTile: (x, y, color, by) => touch(x, y, color, by),
    clearTile: (x, y, by) => touch(x, y, 'paper', by),
    describe,
    stats: () => countOwners(),
    humanTiles: () => {
      const out: Array<{ x: number; y: number; color: TileColor; seq: number }> = [];
      for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLS; x += 1) {
          const cell = cells.get(key(x, y));
          if (cell?.touchedYou) out.push({ x, y, color: cell.color, seq: cell.humanSeq });
        }
      }
      out.sort((a, b) => b.seq - a.seq);
      return out.map(({ x, y, color }) => ({ x, y, color }));
    },
    onFirstHumanClick: (fn) => {
      firstClickFn = fn;
    },
    onCollision: (fn) => {
      collisionFn = fn;
    },
    inBounds: (x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < COLS && y >= 0 && y < ROWS,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      grid.removeEventListener('click', onGridClick);
      for (const cell of cells.values()) cell.btn.removeEventListener('animationend', onFlashEnd);
      cells.clear();
    },
  };
}
