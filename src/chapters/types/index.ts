/* chapters/types — the seven kinds of website, then the friction thesis.
 * SPEC §4, chapter `types`: 7 type slides + thesis + hand-off to room 1.
 */

import {
  bubble,
  fitBody,
  fitHeader,
  h,
  hand,
  hasIllo,
  illo,
  lead,
  para,
  raw,
} from '../../engine/ui';
import { cast } from '../../engine/characters';
import type { Chapter, Slide } from '../../engine/types';
import { ILLOS } from './illos';
import { logoGrid } from './logos';
import './types.css';

interface TypeBrief {
  name: string;
  wants: string;
}

const TYPES: TypeBrief[] = [
  {
    name: 'Attention',
    wants: 'It wants your seconds. Every one of them is worth money.',
  },
  {
    name: 'Funnels',
    wants: 'It wants you to finish signing up before you think too hard.',
  },
  {
    name: 'Lock-in',
    wants: 'It wants your data to live inside it, so leaving is expensive.',
  },
  {
    name: 'Marketplaces',
    wants: 'It wants the deal to close here, so it can take a cut.',
  },
  {
    name: 'Creation',
    wants: 'It wants you to make something. The tool earns when you build.',
  },
  {
    name: 'Verification',
    wants: 'It wants one proven fact about you: your yes, your name, your age.',
  },
  {
    name: 'Coordination',
    wants: 'It wants a group of people to agree on something.',
  },
];

const typeSlide = (brief: TypeBrief, index: number): Slide => ({
  id: `types-${index + 1}`,
  render(el, ctx) {
    const slot = `type-${index + 1}`;
    // The richer scene illustration if it has landed; the tiny animated glyph
    // otherwise. Either way, one screen — no scrolling.
    const art = hasIllo(slot) ? illo(slot, { size: 'md' }) : raw(ILLOS[index](), 'illo');
    el.append(
      fitHeader({ eyebrow: `type ${index + 1} of 7`, title: brief.name }),
      fitBody(
        art,
        lead(brief.wants),
        hand('for example'),
        logoGrid(index),
      ),
    );
    ctx.done();
  },
});

/* 8 — the friction thesis */
const thesisSlide: Slide = {
  id: 'types-thesis',
  render(el, ctx) {
    const chars = cast('surprised', 'idle');
    el.append(
      fitHeader({
        eyebrow: 'the whole idea, in one screen',
        title: 'Most of the web is paid for by friction.',
      }),
      fitBody(
        para(
          'Humans are slow. We get tired, bored, embarrassed, impatient. We forget to untick the box. We do not read the terms. Almost every business model on the web has a line item that depends on one of those.',
        ),
        h(
          'div',
          { class: 'card' },
          h('div', { class: 'card__title' }, 'An agent is none of these.'),
          h(
            'div',
            { class: 'card__body' },
            'It does not scroll past an ad. It is not rushed by a countdown. It is not embarrassed by "no thanks". It reads every word of the terms in 40 milliseconds.',
          ),
        ),
        chars.el,
        bubble(
          'So WebMCP is a gift to two of those seven types — and a problem for the other five.',
          'narrator',
        ),
      ),
    );
    ctx.done();
  },
};

/* 9 — hand-off */
const handoffSlide: Slide = {
  id: 'types-handoff',
  render(el, ctx) {
    const chars = cast('happy', 'thinking');
    el.append(
      fitBody(
        h('h2', { class: 'title' }, 'So each type will react differently.'),
        lead('Let’s find out how.'),
        chars.el,
        hand('Seven rooms. Your agent goes first.'),
        bubble(
          'In each room you get the tools, the page, and a meter. Watch the meter. That is where the argument is.',
          'narrator',
        ),
      ),
    );
    ctx.done();
  },
};

const types: Chapter = {
  id: 'types',
  title: 'Seven types of site',
  slides: [...TYPES.map(typeSlide), thesisSlide, handoffSlide],
};

export default types;
