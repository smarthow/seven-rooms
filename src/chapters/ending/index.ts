/* chapters/ending — the site does what it predicted.
 *
 * SPEC §4, chapter `ending`:
 *   1. the lockout — unregisterAll() for real, the agent goes dark, a ~3s beat
 *      before Next appears
 *   2. the scoreboard — the 7 predictions, the visitor's votes vs the baseline
 *   3. the report card — built from the ActivityLog
 *   4. credits
 *
 * From slide 1 onward, this chapter registers no tools. That is the point.
 */

import { cast } from '../../engine/characters';
import { LOCKOUT_EVENT } from '../../engine/shell';
import {
  PREDICTION_ANSWER,
  VOTE_BASELINE,
  VOTE_OPTIONS,
  readVote,
  voteTally,
} from '../../engine/roomSlides';
import type { ActivityEntry, Chapter, Room, Slide } from '../../engine/types';
import {
  bubble,
  card,
  fitBody,
  fitHeader,
  fitScroll,
  h,
  hand,
  hero,
  illo,
  lead,
  para,
  stack,
  statRow,
  stat,
  tiny,
} from '../../engine/ui';
import { listPageTools, unregisterAll } from '../../webmcp/bridge';

// Imported directly (not via ../index) so the chapter registry stays acyclic.
import room1 from '../../rooms/room1-attention';
import room2 from '../../rooms/room2-funnels';
import room3 from '../../rooms/room3-lockin';
import room4 from '../../rooms/room4-marketplace';
import room5 from '../../rooms/room5-creation';
import room6 from '../../rooms/room6-verification';
import room7 from '../../rooms/room7-coordination';

const ROOMS: Room[] = [room1, room2, room3, room4, room5, room6, room7];

const REPO_URL = 'https://github.com/smarthow/seven-rooms';

/* ------------------------------------------------------- 1. the lockout */

const lockoutSlide: Slide = {
  id: 'ending-lockout',
  render(el, ctx) {
    const chars = cast('surprised', 'done');

    const closedCount = listPageTools().length;

    const wall = stack();

    el.append(
      fitHeader({
        eyebrow: 'the ending',
        title: 'You used your agent to prove that agents break most of the web.',
      }),
      fitBody(
        para(
          'Five of the seven rooms earn money from something your agent does not have: patience, boredom, embarrassment, forgetfulness, a lack of time. Two of them get better.',
        ),
        illo('ending-walls', { size: 'md' }),
        chars.el,
        wall,
      ),
    );

    // Do the thing, for real. Any tool a room forgot to close, closes now.
    unregisterAll();
    window.dispatchEvent(new Event(LOCKOUT_EVENT));

    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

    at(700, () => {
      chars.agent.dark(true);
      chars.human.set('worried');
      wall.append(
        h('h3', { class: 'title' }, 'The walls close.'),
        lead('Your agent is locked out. Finish alone.'),
      );
    });

    at(1900, () => {
      wall.append(
        card(
          'What just happened, literally',
          closedCount > 0
            ? `This page called unregisterAll(). ${closedCount} tool${closedCount === 1 ? ' was' : 's were'} still open. There are now none. Ask your agent to use this page and it will find nothing to use.`
            : 'This page called unregisterAll(). There are now no tools on it at all. Ask your agent to use this page and it will find nothing to use.',
        ),
        tiny('That took one line of code. It is the cheapest option any of these sites has — which is why it is the most likely one.'),
      );
    });

    // A deliberate beat. The silence is part of the argument.
    at(3000, () => {
      ctx.done();
      ctx.hint('');
    });

    ctx.hint('…');

    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  },
};

/* ---------------------------------------------------- 2. the scoreboard */

const scoreboardSlide: Slide = {
  id: 'ending-scoreboard',
  render(el, ctx) {
    el.append(
      fitHeader({
        eyebrow: 'the scoreboard',
        title: 'Seven predictions',
        lead: 'What you thought each kind of site will do — and what this site predicts.',
      }),
    );

    const board = h('div', { class: 'score' });
    let agreed = 0;
    let voted = 0;

    for (const room of ROOMS) {
      const mine = readVote(ctx.store, room.number);
      const tally = voteTally(ctx.store, room.number);
      const answer = PREDICTION_ANSWER[room.number];
      if (mine) voted += 1;
      if (mine && mine === answer) agreed += 1;

      const total = VOTE_OPTIONS.reduce((sum, o) => sum + tally[o.id], 0) || 1;

      const pills = h(
        'div',
        { class: 'score__votes' },
        ...VOTE_OPTIONS.map((option) => {
          const pct = Math.round((tally[option.id] / total) * 100);
          const isMine = mine === option.id;
          const isSite = answer === option.id;
          return h(
            'span',
            { class: `pill${isMine ? ' pill--mine' : ''}` },
            `${option.label} ${pct}%`,
            isMine ? ' · you' : null,
            isSite ? ' · site' : null,
          );
        }),
        mine ? null : h('span', { class: 'pill pill--empty' }, 'you did not vote'),
      );

      board.appendChild(
        h(
          'div',
          { class: 'score__row' },
          h('div', { class: 'score__num' }, String(room.number)),
          h(
            'div',
            {},
            h('div', { class: 'score__type' }, room.siteType),
            h('div', { class: 'score__pred' }, room.prediction),
            pills,
          ),
        ),
      );
    }

    el.append(
      fitBody(
        board,
        statRow(
          stat('rooms you voted in', `${voted}/7`).el,
          stat('times you agreed with the site', `${agreed}/7`).el,
        ),
        tiny(
          `Percentages include a seeded baseline of about ${Object.values(VOTE_BASELINE[1]).reduce((a, b) => a + b, 0)} invented votes per room. A starting point for the chart, not survey data. Your own votes never left this browser.`,
        ),
      ),
    );

    ctx.done();
  },
};

/* --------------------------------------------------- 3. the report card */

/** Arguments were chosen by the caller, so the printed line is kept short. */
function describeArgs(args: Record<string, unknown>): string {
  const keys = Object.keys(args ?? {});
  if (keys.length === 0) return '()';
  const text = keys.map((k) => `${k}: ${JSON.stringify(args[k])}`).join(', ');
  return `(${text.length > 140 ? `${text.slice(0, 140)}…` : text})`;
}

function shortResult(result: unknown): string {
  const text = typeof result === 'string' ? result : JSON.stringify(result ?? null);
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}

const reportSlide: Slide = {
  id: 'ending-report',
  render(el, ctx) {
    const all = ctx.log.all();

    el.append(
      fitHeader({
        eyebrow: 'the report card',
        title: 'What your agent actually did',
        lead: 'Every call, in order, with the arguments it chose.',
      }),
    );

    // The report is the ONE legitimately long list on the site. It gets its
    // own internally scrolling pane so the page itself still does not scroll.
    const pane = fitScroll();
    el.append(pane);

    /* headline stats */
    const skippedRooms = ROOMS.filter((r) => ctx.log.byRoom(r.number).length > 0).length;
    // Read from the log, not from a stored key: `cast_position` already
    // records the human's own position alongside the stance the agent chose,
    // so the answer is right there and survives a reload for free. Room 7's
    // "what just happened" slide computes it the same way.
    const disagreed = ctx.log.byRoom(7).some((e) => {
      if (e.tool !== 'cast_position') return false;
      const stance = String((e.args as { stance?: unknown }).stance ?? '');
      const mine = String((e.result as { human_position?: unknown } | null)?.human_position ?? '');
      return stance !== '' && mine !== '' && mine !== 'not cast yet' && mine !== stance;
    });
    const acceptedTerms = ctx.log
      .byRoom(6)
      .some((e) => e.tool === 'accept_terms');

    pane.append(
      h(
        'div',
        { class: 'report__head' },
        illo('ending-report', { size: 'sm' }),
        statRow(
          stat('tools called', String(all.length)).el,
          stat('rooms it skipped you in', `${skippedRooms}/7`).el,
          stat('disagreed with you', disagreed ? 'yes' : 'no').el,
          stat('accepted the terms', acceptedTerms ? 'yes' : 'no').el,
        ),
      ),
    );

    /* per room */
    const report = h('div', { class: 'report' });
    for (const room of ROOMS) {
      const entries: ActivityEntry[] = ctx.log.byRoom(room.number);
      const box = h(
        'div',
        { class: 'report__room' },
        h('div', { class: 'report__roomtitle' }, `Room ${room.number} — ${room.siteType}`),
      );
      if (entries.length === 0) {
        box.appendChild(h('div', { class: 'report__empty' }, 'no tool calls here'));
      } else {
        for (const entry of entries) {
          box.appendChild(
            h(
              'div',
              { class: 'report__call' },
              `${entry.tool}${describeArgs(entry.args)} → ${shortResult(entry.result)}`,
              h(
                'span',
                { class: `report__src report__src--${entry.source}` },
                entry.source === 'webmcp' ? 'real' : 'ghost',
              ),
            ),
          );
        }
      }
      report.appendChild(box);
    }

    pane.append(
      report,
      all.length === 0
        ? bubble(
            'Your agent did nothing at all. That is a valid way to walk through this site — but the meters are the argument, so consider going back and running one.',
            'narrator',
          )
        : bubble(
            'Nothing in this list was a trick. Every one of those calls was a page politely giving an agent exactly what it asked for.',
            'narrator',
          ),
      tiny('This report is stored in your browser only. Clear your site data and it is gone.'),
    );

    ctx.done();
  },
};

/* ------------------------------------------------------------ 4. credits */

const creditsSlide: Slide = {
  id: 'ending-credits',
  render(el, ctx) {
    const chars = cast('happy', 'idle');
    chars.agent.dark(true);

    el.append(
      fitBody(
        hero('Thanks for walking through.'),
        chars.el,
        card(
          'What WebMCP is',
          'A proposed browser API that lets a page hand real, named tools to an AI agent — read this article, export my data, cast this vote — instead of making it guess by clicking around. It makes the web genuinely usable by software acting for you. It also removes the friction that pays for most of it.',
        ),
        para(
          'Nothing here judged your agent. Every room showed a tool doing its job, and a business model quietly falling over behind it.',
        ),
        stack(
          h(
            'p',
            { class: 'body' },
            'Open source: ',
            h('a', { href: REPO_URL, target: '_blank', rel: 'noreferrer' }, REPO_URL),
          ),
          tiny(
            'Built for the WebMCP challenge. MIT licensed. No backend, no analytics, no cookies. In the spirit of Nicky Case’s “The Evolution of Trust”.',
          ),
        ),
        hand('Seven rooms. One of them was a duet.'),
      ),
    );

    ctx.done();
  },
};

const ending: Chapter = {
  id: 'ending',
  title: 'The ending',
  slides: [lockoutSlide, scoreboardSlide, reportSlide, creditsSlide],
};

export default ending;
