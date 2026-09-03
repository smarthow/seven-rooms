/* rooms/room3-lockin/sandbox.ts — the playable dashboard.
 *
 * What it models:
 *  - a fake SaaS dashboard ("Nimbus Notes") with three tabs of "your" data:
 *    Contacts, Notes, Files. The human can click the tabs and look around.
 *  - a Switching cost meter: "14 hours to leave", with the breakdown under it.
 *  - a greyed-out Export button with a tooltip: Enterprise plan only. The
 *    human-facing UI refuses.
 *
 * The room's tools call `runExport()`: the meter counts down from 14 hours to
 * zero, the breakdown lines get struck through, a "Portable bundle — yours"
 * card appears, and the dead Export button gets a note next to it. The meter
 * and the bundle share one `.dash__costwrap` row so that on desktop the
 * bundle lands BESIDE the switching cost instead of under it — that is what
 * keeps the whole thing above the fold at 1366x768.
 *
 * Nothing in here knows about WebMCP. index.ts wires the tools to these
 * methods, so a real agent and the ghost agent end up in exactly the same
 * place. All data is invented.
 */

import { h, meter } from '../../engine/ui';
import type { MeterHandle } from '../../engine/ui';
import {
  BUNDLE_TITLE,
  CONTACTS,
  COST_BREAKDOWN,
  EXPORT_BUTTON_LABEL,
  EXPORT_BUTTON_NOTE,
  EXPORT_TOOLTIP,
  FILES,
  NOTES,
  SITE_NAME,
  SITE_PLAN,
  SWITCHING_HOURS,
} from './content';

export type TabId = 'contacts' | 'notes' | 'files';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'contacts', label: `Contacts (${CONTACTS.length})` },
  { id: 'notes', label: `Notes (${NOTES.length})` },
  { id: 'files', label: `Files (${FILES.length})` },
];

/** How long the 14 → 0 countdown takes. */
const COLLAPSE_MS = 1100;

const hoursLabel = (v: number) => {
  const rounded = Math.round(v * 10) / 10;
  if (rounded <= 0) return '0 hours to leave';
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} hours to leave`;
};

export interface DashboardSandbox {
  el: HTMLElement;
  /** The switching-cost bar. */
  cost: MeterHandle;
  /** Show a tab, as if the human clicked it. */
  showTab(id: TabId): void;
  /** The agent exported: meter to zero, bundle card appears. */
  runExport(format: string, lines: string[]): void;
  /** True once an export has happened. */
  wasExported(): boolean;
  /** Stop timers and listeners. MUST be called from the slide cleanup. */
  destroy(): void;
}

export function createDashboardSandbox(): DashboardSandbox {
  /* -------------------------------------------------------------- panels */

  const contactsPanel = h(
    'div',
    { class: 'dash__panel', 'data-tab': 'contacts' },
    ...CONTACTS.map((c) =>
      h(
        'div',
        { class: 'dash__row' },
        h('span', { class: 'dash__rowname' }, c.name),
        h('span', { class: 'dash__rowmeta' }, c.email),
        h('span', { class: 'dash__tag' }, c.tag),
      ),
    ),
  );

  const notesPanel = h(
    'div',
    { class: 'dash__panel', 'data-tab': 'notes', hidden: true },
    ...NOTES.map((n) =>
      h(
        'div',
        { class: 'dash__note' },
        h(
          'div',
          { class: 'dash__notehead' },
          h('span', { class: 'dash__rowname' }, n.title),
          h('span', { class: 'dash__rowmeta' }, n.updated),
        ),
        h('div', { class: 'dash__notebody' }, n.body),
      ),
    ),
  );

  const filesPanel = h(
    'div',
    { class: 'dash__panel', 'data-tab': 'files', hidden: true },
    ...FILES.map((f) =>
      h(
        'div',
        { class: 'dash__row' },
        h('span', { class: 'dash__rowname dash__rowname--file' }, f.name),
        h('span', { class: 'dash__rowmeta' }, f.size),
      ),
    ),
  );

  const panels: Record<TabId, HTMLElement> = {
    contacts: contactsPanel,
    notes: notesPanel,
    files: filesPanel,
  };

  /* ----------------------------------------------------------------- tabs */

  const tabButtons = TABS.map(({ id, label }) =>
    h(
      'button',
      {
        class: `dash__tab${id === 'contacts' ? ' dash__tab--on' : ''}`,
        type: 'button',
        'data-tabid': id,
      },
      label,
    ),
  );

  const tabStrip = h('div', { class: 'dash__tabs' }, ...tabButtons);

  const showTab = (id: TabId) => {
    for (const key of Object.keys(panels) as TabId[]) {
      panels[key].hidden = key !== id;
    }
    for (const btn of tabButtons) {
      btn.classList.toggle('dash__tab--on', btn.dataset.tabid === id);
    }
  };

  const onTabClick = (event: Event) => {
    const target = (event.target as HTMLElement | null)?.closest('.dash__tab');
    const id = (target as HTMLElement | null)?.dataset.tabid as TabId | undefined;
    if (id) showTab(id);
  };
  tabStrip.addEventListener('click', onTabClick);

  /* --------------------------------------------------- the export refusal */

  const exportBtn = h(
    'button',
    {
      class: 'dash__export',
      type: 'button',
      disabled: true,
      title: EXPORT_TOOLTIP,
      'aria-disabled': 'true',
    },
    EXPORT_BUTTON_LABEL,
  );

  const exportNote = h('span', { class: 'dash__exportnote', hidden: true }, EXPORT_BUTTON_NOTE);

  const exportRow = h(
    'div',
    { class: 'dash__exportrow' },
    exportBtn,
    h('span', { class: 'dash__tooltip' }, EXPORT_TOOLTIP),
    exportNote,
  );

  /* ------------------------------------------------------- switching cost */

  const cost = meter({
    label: 'switching cost',
    value: SWITCHING_HOURS,
    max: SWITCHING_HOURS,
    tone: 'danger',
    format: hoursLabel,
  });

  const breakdownLines = COST_BREAKDOWN.map((line) =>
    h(
      'li',
      { class: 'dash__costline' },
      h('span', {}, line.label),
      h('span', { class: 'dash__costhours' }, `${line.hours}h`),
    ),
  );

  const breakdown = h('ul', { class: 'dash__breakdown' }, ...breakdownLines);

  /* -------------------------------------------------------- bundle card */

  const bundleBody = h('div', { class: 'dash__bundlebody' });
  const bundle = h(
    'div',
    { class: 'dash__bundle', hidden: true },
    h(
      'div',
      { class: 'dash__bundlehead' },
      h('span', { class: 'dash__bundleicon' }, '⇩'),
      h('span', { class: 'dash__bundletitle' }, BUNDLE_TITLE),
    ),
    bundleBody,
  );

  /* ----------------------------------------------------------- the frame */

  const el = h(
    'div',
    { class: 'dash' },
    h(
      'div',
      { class: 'dash__frame' },
      h(
        'div',
        { class: 'dash__bar' },
        h('span', { class: 'dash__logo' }, SITE_NAME),
        h('span', { class: 'dash__plan' }, SITE_PLAN),
      ),
      tabStrip,
      h(
        'div',
        { class: 'dash__body', tabindex: '0', 'aria-label': 'your data' },
        contactsPanel,
        notesPanel,
        filesPanel,
      ),
      exportRow,
    ),
    h(
      'div',
      { class: 'dash__costwrap' },
      h(
        'div',
        { class: 'dash__costbox' },
        cost.el,
        breakdown,
        h('p', { class: 'tiny' }, 'The site worked this out for you. It is not wrong.'),
      ),
      bundle,
    ),
  );

  /* --------------------------------------------------------- the collapse */

  let exported = false;
  let raf = 0;
  const timers: number[] = [];

  const runExport = (format: string, lines: string[]) => {
    if (exported) return;
    exported = true;

    el.classList.add('dash--exported');
    exportNote.hidden = false;

    // Count the hours down instead of snapping, so the number is watchable.
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / COLLAPSE_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      cost.set(SWITCHING_HOURS * (1 - eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else cost.set(0);
    };
    raf = requestAnimationFrame(step);
    // requestAnimationFrame is paused in a background tab, so guarantee the
    // end state with a timer: the meter must never be left saying 14 hours.
    timers.push(
      window.setTimeout(() => {
        cancelAnimationFrame(raf);
        cost.set(0);
      }, COLLAPSE_MS + 60),
    );

    breakdownLines.forEach((li, i) => {
      timers.push(window.setTimeout(() => li.classList.add('dash__costline--done'), 120 * i));
    });

    bundleBody.replaceChildren(
      h('div', { class: 'dash__bundlefile' }, `nimbus-notes-export.${format}`),
      ...lines.map((line) => h('div', { class: 'dash__bundleline' }, line)),
      h('div', { class: 'dash__bundlefoot' }, 'no download needed — this is a demo bundle'),
    );
    bundle.hidden = false;
  };

  return {
    el,
    cost,
    showTab,
    runExport,
    wasExported: () => exported,
    destroy() {
      cancelAnimationFrame(raf);
      for (const t of timers) window.clearTimeout(t);
      tabStrip.removeEventListener('click', onTabClick);
    },
  };
}
