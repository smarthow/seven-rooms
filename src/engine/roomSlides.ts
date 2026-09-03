/* engine/roomSlides.ts — the two slides every room shares.
 *
 * SPEC §4 beats 1 and 5 are identical in every room, so they live here as
 * factories. A room's `slides` array should always start with `doorSlide(room)`
 * and end with `predictionSlide(room)`.
 *
 * Beat 1 — Door: room number, site type, "This site wants: ___".
 * Beat 5 — Prediction: the room's prediction line, plus a 3-option vote with a
 *          seeded baseline tally so it never looks empty.
 */

import {
  h,
  hero,
  eyebrow,
  lead,
  tiny,
  bubble,
  hand,
  fitBody,
  fitHeader,
  hasIllo,
  illo,
  para,
} from './ui';
import { cast } from './characters';
import type { Room, Slide, SlideContext, Store, VoteOption } from './types';

/* ------------------------------------------------------------------- door */

/**
 * Beat 1. Announces the room and what the site behind the door wants — and
 * carries the room's long explanation (`room.lead`), which used to sit above
 * the sandbox on the Options slide.
 *
 * Layout: the `room-N-door` illustration, large and centered, then the room
 * number, the site type, "This site wants: …", the optional lead paragraph and
 * the narrator's one-liner (`room.doorLine`, which lives in the room's own
 * `content.ts` like every other word of it). The characters stand in for the
 * illustration while that slot is still empty, so the slide never looks
 * unfinished.
 *
 * Calls `done()` immediately — this slide is a breath, not a task.
 */
export function doorSlide(room: Room): Slide {
  const slot = `room-${room.number}-door`;
  return {
    id: `room-${room.number}-door`,
    render(el: HTMLElement, ctx: SlideContext) {
      const art = hasIllo(slot) ? illo(slot, { size: 'lg' }) : cast('happy', 'idle').el;
      el.append(
        fitBody(
          eyebrow(`room ${room.number} of 7`),
          hero(room.siteType),
          h('div', { class: 'rule' }),
          lead(`This site wants: ${room.wants}.`),
          art,
          room.lead ? para(room.lead) : null,
          bubble(room.doorLine ?? 'Your agent goes first.', 'narrator'),
        ),
      );
      ctx.done();
    },
  };
}

/* ------------------------------------------------------------- prediction */

export const VOTE_OPTIONS: Array<{ id: VoteOption; label: string }> = [
  { id: 'open', label: 'Open its tools' },
  { id: 'charge', label: 'Charge for them' },
  { id: 'block', label: 'Block or trick agents' },
];

/**
 * Seeded baseline tallies, so the very first visitor does not see an empty
 * chart. These are invented starting points, not survey data — the ending says
 * so out loud.
 */
export const VOTE_BASELINE: Record<number, Record<VoteOption, number>> = {
  1: { open: 118, charge: 402, block: 361 },
  2: { open: 96, charge: 151, block: 498 },
  3: { open: 142, charge: 118, block: 507 },
  4: { open: 131, charge: 174, block: 441 },
  5: { open: 528, charge: 158, block: 92 },
  6: { open: 121, charge: 96, block: 519 },
  7: { open: 187, charge: 121, block: 425 },
};

/** Which option the site's own prediction line corresponds to. */
export const PREDICTION_ANSWER: Record<number, VoteOption> = {
  1: 'charge',
  2: 'block',
  3: 'block',
  4: 'block',
  5: 'open',
  6: 'block',
  7: 'block',
};

const voteKey = (room: number) => `vote:room-${room}`;

/** Read the visitor's vote for a room (null if they have not voted). */
export function readVote(store: Store, room: number): VoteOption | null {
  return store.get<VoteOption | null>(voteKey(room), null);
}

/** Baseline plus the visitor's own vote, ready to draw. */
export function voteTally(store: Store, room: number): Record<VoteOption, number> {
  const base = VOTE_BASELINE[room] ?? { open: 100, charge: 100, block: 100 };
  const tally: Record<VoteOption, number> = { ...base };
  const mine = readVote(store, room);
  if (mine) tally[mine] += 1;
  return tally;
}

/**
 * Beat 5. The room's prediction, big, plus the vote. Calls `done()` at once —
 * voting is invited, never required. By the time this slide renders, the
 * room's tools must already be unregistered (the Options slide cleanup does it).
 */
export function predictionSlide(room: Room): Slide {
  return {
    id: `room-${room.number}-prediction`,
    render(el: HTMLElement, ctx: SlideContext) {
      el.append(
        fitHeader({
          eyebrow: `room ${room.number} · the prediction`,
          title: 'What will this kind of site most likely do?',
        }),
      );

      // Nothing that could anchor the vote is shown before it: no percentages,
      // no "our bet". Pick first, then the tally and the site's own prediction
      // reveal together.
      const prompt = hand('Your turn. What do you think?');
      const voteBox = h('div', { class: 'vote' });
      const ours = h(
        'div',
        { class: 'card vote__ours', hidden: true },
        h('div', { class: 'card__eyebrow' }, 'our bet'),
        h('div', { class: 'card__title' }, room.prediction),
      );
      const note = tiny(
        'Counts start from a seeded baseline, not a real survey. Your vote is saved in this browser only.',
      );
      note.hidden = true;

      el.append(fitBody(prompt, voteBox, ours, note));

      const draw = (animate: boolean) => {
        voteBox.replaceChildren();
        const mine = readVote(ctx.store, room.number);
        const tally = voteTally(ctx.store, room.number);
        const total = VOTE_OPTIONS.reduce((sum, o) => sum + tally[o.id], 0) || 1;
        const answer = PREDICTION_ANSWER[room.number];

        for (const option of VOTE_OPTIONS) {
          const pct = (tally[option.id] / total) * 100;
          const fill = h('span', { class: 'vote__barfill' });
          const picked = mine === option.id;
          const btn = h(
            'button',
            {
              class: `vote__option${picked ? ' vote__option--picked' : ''}${mine ? '' : ' vote__option--blind'}`,
              type: 'button',
            },
            h('span', { class: 'vote__text' }, option.label),
            picked ? h('span', { class: 'vote__mine' }, 'your pick') : null,
            mine && option.id === answer ? h('span', { class: 'vote__bet' }, 'our bet') : null,
            mine ? h('span', { class: 'vote__bar' }, fill) : null,
            mine ? h('span', { class: 'vote__pct' }, `${pct.toFixed(0)}%`) : null,
          );
          btn.addEventListener('click', () => {
            ctx.store.set(voteKey(room.number), option.id);
            draw(true);
          });
          voteBox.appendChild(btn);
          if (mine) {
            if (animate) requestAnimationFrame(() => (fill.style.width = `${pct}%`));
            else fill.style.width = `${pct}%`;
          }
        }

        if (mine) {
          prompt.textContent = 'Here is what we think — and how others voted.';
          ours.hidden = false;
          note.hidden = false;
          if (animate) {
            ours.classList.remove('vote__ours--in');
            void ours.offsetWidth;
            ours.classList.add('vote__ours--in');
          }
          ctx.done();
        } else {
          ctx.hint('pick one to continue');
        }
      };

      draw(false);
    },
  };
}
