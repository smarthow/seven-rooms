/* engine/deck.ts — the slide deck. One idea per screen.
 *
 * Responsibilities:
 *  - flatten chapters into a single list of slides
 *  - render the current slide, and call its cleanup when leaving it
 *  - keep Next locked until the slide calls `ctx.done()`
 *  - register the five site-level WebMCP tools (see webmcp/siteTools.ts)
 *  - drive the chapter progress bar
 *  - add `room-N` to the slide container while inside a room, so room CSS can
 *    scope itself (`.room-1 .article { … }`)
 *  - ArrowRight / Space advance; the URL hash deep-links (`#room-1/2`) so a
 *    room author can jump straight to their slide during `npm run dev`
 */

import { clear, h } from './ui';
import { store } from './store';
import { createShell } from './shell';
import type { ActivityLog, AgentSurface, Chapter, Slide, SlideContext } from './types';
import { getAgentSurface, unregisterAll } from '../webmcp/bridge';
import { registerSiteTools } from '../webmcp/siteTools';
import { getPageTool } from '../webmcp/bridge';

interface Entry {
  slide: Slide;
  chapter: Chapter;
  chapterIndex: number;
  /** Room number if this chapter is a room, else 0. */
  room: number;
}

export interface Deck {
  /** Go to a flat slide index. */
  goTo(index: number): void;
  next(): void;
  prev(): void;
  /** Jump to the first slide of a chapter id, e.g. 'room-3'. */
  goToChapter(id: string): void;
  current(): number;
  total(): number;
}

/** 'room-4' -> 4, anything else -> 0. */
function roomNumberOf(chapterId: string): number {
  const m = /^room-([1-7])$/.exec(chapterId);
  return m ? Number(m[1]) : 0;
}

export function startDeck(opts: {
  mount: HTMLElement;
  chapters: Chapter[];
  agent: AgentSurface;
  log: ActivityLog;
}): Deck {
  const { chapters, agent, log } = opts;

  const entries: Entry[] = [];
  chapters.forEach((chapter, chapterIndex) => {
    const room = roomNumberOf(chapter.id);
    for (const slide of chapter.slides) {
      entries.push({ slide, chapter, chapterIndex, room });
    }
  });

  const shell = createShell({ mount: opts.mount, chapters, agent, log });

  let index = -1;
  let cleanup: (() => void) | void;
  let unlocked = false;
  let hashLock = false;
  /**
   * Bumped on every render. Each slide's context captures the value it was
   * built with, so a `done()` or `hint()` that arrives late — from a timer, an
   * in-flight tool call, a ghost plan that outlived its slide — is ignored
   * instead of unlocking, or annotating, whatever slide is now on screen.
   */
  let renderSeq = 0;

  /* ---------------------------------------------------------- next button */

  const lockNext = () => {
    unlocked = false;
    shell.nextBtn.hidden = true;
    shell.nextBtn.classList.remove('nextbtn--enter');
    shell.waitNote.hidden = true;
    shell.waitNote.textContent = '';
  };

  const unlockNext = () => {
    if (unlocked) return;
    unlocked = true;
    shell.waitNote.hidden = true;
    shell.nextBtn.hidden = false;
    shell.nextBtn.classList.add('nextbtn--enter');
  };

  const setHint = (text: string) => {
    if (unlocked || !text) {
      shell.waitNote.hidden = true;
      shell.waitNote.textContent = '';
      return;
    }
    shell.waitNote.textContent = text;
    shell.waitNote.hidden = false;
  };

  /* -------------------------------------------------------------- render */

  const writeHash = (entry: Entry, slideIndexInChapter: number) => {
    hashLock = true;
    const hash = `#${entry.chapter.id}/${slideIndexInChapter}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    window.setTimeout(() => (hashLock = false), 0);
  };

  const render = (i: number) => {
    const target = Math.max(0, Math.min(entries.length - 1, i));
    const entry = entries[target];
    if (!entry) return;

    // leave the old slide: cleanup first, so tools are gone before the next
    // slide registers anything with the same name
    if (cleanup) {
      try {
        cleanup();
      } catch (err) {
        console.warn('[deck] slide cleanup failed:', err);
      }
    }
    cleanup = undefined;

    index = target;
    const generation = ++renderSeq;
    lockNext();
    clear(shell.stage);

    // restart the enter animation and scope room CSS
    shell.stage.className = entry.room ? `slide room-${entry.room}` : 'slide';
    shell.stage.dataset.slide = entry.slide.id;
    void shell.stage.offsetWidth;

    shell.progress.set(entry.chapterIndex);
    // Walking back out of the ending brings the agent back to life.
    if (entry.chapter.id !== 'ending') shell.chip.dark(false);
    // The ending unregisters everything. Coming back (Back button, deep link)
    // must restore the site tools, or the page is dead to an agent until reload.
    if (entry.chapter.id !== 'ending') queueMicrotask(ensureSiteTools);
    writeHash(entry, entry.chapter.slides.indexOf(entry.slide));
    window.scrollTo({ top: 0, behavior: 'auto' });

    const ctx: SlideContext = {
      // Guarded: only the slide that is actually on screen may unlock Next or
      // change the hint. See `renderSeq` above.
      done: () => {
        if (generation === renderSeq) unlockNext();
      },
      log,
      // A getter, not a snapshot: a slide that is still on screen when the
      // visitor picks the ghost — or when an agent calls handshake() — sees the
      // new state without re-rendering.
      get agent() {
        return getAgentSurface();
      },
      goNext: () => deck.next(),
      store,
      hint: (text: string) => {
        if (generation === renderSeq) setHint(text);
      },
    };

    try {
      cleanup = entry.slide.render(shell.stage, ctx);
    } catch (err) {
      console.error(`[deck] slide "${entry.slide.id}" failed to render:`, err);
      shell.stage.appendChild(
        h('p', { class: 'lead' }, 'Something broke in this room. Press Next to keep going.'),
      );
      unlockNext();
    }

    // Focus follows the slide. `clear()` above destroyed whatever was focused,
    // so without this a keyboard user who pressed Next starts tabbing from the
    // top bar again and a screen reader is told nothing about the new slide.
    // preventScroll: the stage is exactly one viewport tall and must not move.
    shell.stage.focus({ preventScroll: true });
  };

  /* ---------------------------------------------------------------- deck */

  const deck: Deck = {
    goTo: render,
    next: () => {
      if (index < entries.length - 1) render(index + 1);
    },
    prev: () => {
      if (index > 0) render(index - 1);
    },
    goToChapter: (id: string) => {
      const at = entries.findIndex((e) => e.chapter.id === id);
      if (at >= 0) render(at);
    },
    current: () => index,
    total: () => entries.length,
  };

  /* -------------------------------------------------------- the site tools

   * handshake / describe_site / list_rooms / go_to_room / next_slide. Registered
   * here because this is the only place that holds both the deck and the shell.
   * `unregisterAll()` at the ending removes them with everything else — and so
   * does a navigation away, which is the honest behaviour: tools do not outlive
   * the document. */

  function ensureSiteTools(): void {
    if (getPageTool('handshake')) return;
    registerSiteTools({
    chapters,
    log,
    store,
    where: () => {
      const entry = entries[index] ?? entries[0];
      return {
        chapterId: entry.chapter.id,
        chapterTitle: entry.chapter.title,
        slideId: entry.slide.id,
        slideIndex: entry.chapter.slides.indexOf(entry.slide),
        slideCount: entry.chapter.slides.length,
        room: entry.room,
      };
    },
    canAdvance: () => unlocked && index < entries.length - 1,
    waitingFor: () => (shell.waitNote.hidden ? '' : (shell.waitNote.textContent ?? '')),
    next: () => deck.next(),
    goToChapter: (id: string) => deck.goToChapter(id),
    });
  }
  ensureSiteTools();

  /* ------------------------------------------------------------- wiring */

  shell.nextBtn.addEventListener('click', () => deck.next());

  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement | null;
    // never steal keys from a field the visitor is typing in
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    if (target?.isContentEditable) return;

    if (event.key === 'ArrowRight') {
      if (unlocked) {
        event.preventDefault();
        deck.next();
      }
    } else if (event.key === 'ArrowLeft') {
      // Only swallow the key when there is somewhere to go back to; on slide 0
      // it should still do whatever the browser normally does with it.
      if (index > 0) {
        event.preventDefault();
        deck.prev();
      }
    }
  });

  window.addEventListener('hashchange', () => {
    if (hashLock) return;
    const at = indexFromHash();
    if (at !== null && at !== index) render(at);
  });

  // Leaving the page? Close the tools. Nothing should outlive the document.
  window.addEventListener('pagehide', () => {
    if (cleanup) {
      try {
        cleanup();
      } catch {
        /* ignore */
      }
    }
    unregisterAll();
  });

  // `pagehide` also fires when the document enters the back/forward cache, so
  // pressing Back can restore a live page with its DOM and JS intact and zero
  // registered tools — and no reload to fix it. Re-open the site tools and
  // re-render the slide so its own tools come back too.
  window.addEventListener('pageshow', (event) => {
    if (!(event as PageTransitionEvent).persisted) return;
    ensureSiteTools();
    render(index);
  });

  function indexFromHash(): number | null {
    const raw = location.hash.replace(/^#/, '');
    if (!raw) return null;
    const [chapterId, slidePart] = raw.split('/');
    const chapterAt = entries.findIndex((e) => e.chapter.id === chapterId);
    if (chapterAt < 0) return null;
    const offset = Number(slidePart);
    if (!Number.isFinite(offset) || offset <= 0) return chapterAt;
    const chapter = entries[chapterAt].chapter;
    return chapterAt + Math.min(offset, chapter.slides.length - 1);
  }

  render(indexFromHash() ?? 0);
  return deck;
}
