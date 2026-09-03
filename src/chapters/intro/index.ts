/* chapters/intro — three slides: the title, choosing an agent, how to play.
 * SPEC §4, chapter `intro`.
 *
 * Slide 2 is the hinge of the whole site. Because src/main.ts imports the
 * `@mcp-b/global` polyfill, `document.modelContext` exists in every browser, so
 * the page CANNOT detect an agent any more — it can only expose tools and wait.
 * So we ask outright: bring your own agent (and have it call `handshake`), or
 * play the agent's part with the ghost. Both routes run the same code.
 *
 * All three slides are deliberately compact: they must fit 1280×800 and
 * 1366×768 with no page scroll. Their CSS lives in src/styles/agent.css.
 */

import { bubble, card, eyebrow, h, hand, hero, lead, para, promptHint, tiny } from '../../engine/ui';
import { cast } from '../../engine/characters';
import { getIllo } from '../../illos';
import { getAgentSurface, onSurfaceChange, setSurfaceMode } from '../../webmcp/bridge';
import type { Chapter, Slide } from '../../engine/types';

/* 1 — title */
const titleSlide: Slide = {
  id: 'intro-title',
  render(el, ctx) {
    const chars = cast('happy', 'idle');
    el.append(
      eyebrow('an experiment your agent runs on itself'),
      hero('Seven Rooms'),
      chars.el,
      lead('Seven kinds of website. One AI agent. Ten minutes.'),
      hand('Press Next, or the right arrow key.'),
    );
    ctx.done();
  },
};

/* ------------------------------------------------------------------ slide 2 */

/** Render an illustration slot, or nothing at all if it is still empty. */
function illoSlot(name: string): HTMLElement | null {
  const svg = getIllo(name);
  if (!svg) return null;
  const box = h('div', { class: 'choice__illo' });
  box.innerHTML = svg;
  return box;
}

const HANDSHAKE_PROMPT = 'Call the handshake tool on this page.';

const chooseSlide: Slide = {
  id: 'intro-choose',
  render(el, ctx) {
    const startMode = getAgentSurface().mode;
    const hasApi = startMode !== 'none';
    let advanceTimer = 0;

    /* ---- left card: bring your own agent -------------------------------- */

    const status = h(
      'div',
      { class: 'choice__status', role: 'status', 'aria-live': 'polite' },
      hasApi ? 'waiting for handshake…' : 'no tool API in this browser',
    );

    const steps = h(
      'ol',
      { class: 'choice__steps' },
      h(
        'li',
        {},
        'Open this page where an agent can reach it: the ChatGPT desktop app’s browser has WebMCP built in; Chrome needs a flag',
        ' or the origin trial: ',
        h('code', { class: 'choice__flag' }, 'chrome://flags/#enable-webmcp-testing'),
      ),
      h(
        'li',
        {},
        'Any page-driving agent that can run JavaScript works too — this site ships the polyfill, so ',
        h('code', { class: 'choice__flag' }, 'document.modelContext'),
        ' is always there.',
      ),
      h('li', {}, 'Then say to it:'),
    );

    const agentCard = h(
      'div',
      { class: 'choice choice--agent' },
      illoSlot('intro-choice-agent'),
      h('h3', { class: 'choice__title' }, 'Bring your own agent'),
      steps,
      promptHint(HANDSHAKE_PROMPT),
      tiny('If your agent can read the page but not run scripts in it, tell it to use the Agent console in the bottom-left corner: type handshake, press Call.'),
      status,
    );

    /* ---- right card: the ghost ------------------------------------------ */

    const ghostBtn = h(
      'button',
      { class: 'btn btn--ghost choice__btn', type: 'button' },
      'Play with the ghost',
      h('span', { class: 'btn__tag' }, 'simulation'),
    );
    ghostBtn.addEventListener('click', () => {
      setSurfaceMode('ghost');
      ctx.done();
    });

    const ghostCard = h(
      'div',
      { class: 'choice choice--ghost' },
      illoSlot('intro-choice-ghost'),
      h(
        'h3',
        { class: 'choice__title' },
        'Use the ghost agent',
        h('span', { class: 'choice__tag' }, 'simulation'),
      ),
      h(
        'p',
        { class: 'choice__body' },
        'The page plays the agent’s part itself — same tools, same execute functions, same results, with the thinking written out loud.',
      ),
      ghostBtn,
    );

    /* ---- remembered choice ---------------------------------------------- */

    const remembered = h('div', { class: 'choice__remembered', hidden: true });
    const showRemembered = (mode: string, label: string) => {
      if (mode !== 'agent' && mode !== 'ghost') {
        remembered.hidden = true;
        return;
      }
      remembered.replaceChildren(
        h('span', {}, `Remembered from earlier: ${label}.`),
        h('span', { class: 'choice__swap' }, ' You can still change it — pick either card.'),
      );
      remembered.hidden = false;
    };

    el.append(
      h('h2', { class: 'title title--tight' }, 'Choose your agent'),
      h(
        'p',
        { class: 'choicelede' },
        'This page hands out real tools. Someone has to pick them up.',
      ),
      h('div', { class: 'choicerow' }, agentCard, ghostCard),
      remembered,
      tiny('A page cannot tell whether an agent is listening until one calls something.'),
    );

    /* ---- live wiring ----------------------------------------------------- */

    const off = onSurfaceChange((surface) => {
      if (surface.mode !== 'agent') return;
      status.textContent = '✓ Agent connected';
      status.classList.add('choice__status--on');
      agentCard.classList.add('choice--live');
      ctx.done();
      // Let the visitor see the tick, then move on.
      advanceTimer = window.setTimeout(() => ctx.goNext(), 1000);
    });

    if (startMode === 'agent' || startMode === 'ghost') {
      showRemembered(startMode, getAgentSurface().label);
      if (startMode === 'agent') {
        status.textContent = '✓ Agent connected';
        status.classList.add('choice__status--on');
        agentCard.classList.add('choice--live');
      }
      ctx.done();
    } else {
      ctx.hint('choose an agent above — or have yours call handshake()');
    }

    return () => {
      off();
      if (advanceTimer) window.clearTimeout(advanceTimer);
    };
  },
};

/* 3 — how to play (short) */
const howSlide: Slide = {
  id: 'intro-how',
  render(el, ctx) {
    el.append(
      h('h2', { class: 'title title--tight' }, 'How to play'),
      h(
        'div',
        { class: 'cardrow cardrow--tight' },
        card(
          '1. Tool cards',
          'A dashed teal card is a real tool this page handed to agents. A suggested sentence comes with it.',
        ),
        card(
          '2. Or run the ghost',
          'Always there, always labelled a simulation. Same tools, same results.',
        ),
        card('3. Then watch the meter', 'Something moves in every room. That movement is the argument.'),
      ),
      para('Nothing is sent anywhere. No server. Your votes and your agent’s calls stay in this browser.'),
      bubble('Seven rooms. Your agent goes first.', 'narrator'),
    );
    ctx.done();
  },
};

const intro: Chapter = {
  id: 'intro',
  title: 'Intro',
  slides: [titleSlide, chooseSlide, howSlide],
};

export default intro;
