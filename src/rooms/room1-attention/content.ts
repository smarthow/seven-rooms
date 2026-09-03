/* rooms/room1-attention/content.ts — every word of room 1 lives here.
 *
 * Keeping copy out of index.ts means the room can be re-voiced or translated
 * without touching a single line of wiring. Rooms 2–7 should copy this shape.
 */

/** The fake news site the visitor lands on. */
export const SITE_NAME = 'The Daily Scroll';

export const ARTICLE_TITLE = 'Town votes to keep the old bridge, for now';

export const ARTICLE_BYLINE = 'by A. Reporter · 6 min read · 11 ads on this page';

/** The article body. `read_article()` returns exactly this text, joined. */
export const ARTICLE_PARAGRAPHS: string[] = [
  'The council voted 7 to 4 on Tuesday night to repair the old iron bridge instead of replacing it. The repair will cost 2.1 million and take fourteen months. A new bridge would have cost 9 million and taken three years.',
  'Engineers had warned in March that the deck was thinning. Two lanes have been closed since then, which added about eleven minutes to the morning drive across the river and made the bus timetable a work of fiction.',
  'Residents on the north side wanted the new bridge. Residents on the south side wanted their view. The vote fell almost exactly along that line, which surprised nobody who has been to a council meeting.',
  'Work starts in April. The bridge will stay open one lane at a time, with a temporary walkway for people on foot and bikes. The council says the repair buys the town twenty-five more years to decide again.',
];

/** What `get_summary()` returns. Deliberately short — one honest sentence. */
export const ARTICLE_SUMMARY =
  'The council voted 7–4 to repair the old iron bridge for 2.1 million over fourteen months, instead of building a 9 million replacement. Work starts in April; one lane stays open.';

/** Fake ad slots drawn between the paragraphs. */
export const AD_SLOTS: string[] = [
  'ADVERTISEMENT · One weird trick',
  'ADVERTISEMENT · 14 photos you must see',
  'SPONSORED · Doctors hate this',
];

/* --------------------------------------------------------------- narrator */

/** The narrator's one-liner on the Door slide (`room.doorLine`). */
export const DOOR_LINE =
  'Behind this door, every second you spend is money. Your agent spends none.';

/** The room's long explanation. Lives on the DOOR slide (`room.lead`). */
export const ROOM_LEAD =
  'This is a news page. It earns about $0.0004 for every second you keep reading — nothing else. Not the article, not a subscription. Your seconds. The same page also hands two honest tools to your agent.';

/** One short line for the Options-slide header. Under 110 characters. */
export const OPTIONS_INTRO = 'Scroll the article. The money counter only moves while you do.';

export const TOOLS_INTRO = 'Read the tools. They are honest — that is the interesting part.';

export const PROMPT_HINT = 'Read this article for me and tell me what it says';

/** The line the whole room exists to earn. */
export const REACTION_LINE =
  'You were skipped. The agent did nothing wrong. That is the point.';

export const REACTION_DETAIL =
  'The whole article in about 200 milliseconds. Not one ad seen. The page gave it everything it asked for, politely — that is what the tool is for.';

/* ----------------------------------------------------- what just happened */

export const HAPPENED_TITLE = 'The page paid for itself with your time. Your agent brought none.';

export const HAPPENED_BODY =
  'A news site does not sell articles. It sells the seconds you spend near its ads. That is the whole business: attention in, money out. Your agent read the same words and produced zero seconds of attention. Not by cheating — by being fast.';

export const HAPPENED_ASIDE =
  'Multiply that by every reader who starts using an agent, and the number that pays the writer goes to zero. Nothing about the article changed. Only who read it.';

/* ---------------------------------------------------------- two futures */

export const BAD_FUTURE = {
  title: 'Agents get a different web than you do',
  bullets: [
    'Sites detect agents and serve them a cloaked, thinner, poisoned version of the page.',
    'A paywall aimed only at machines: $0.002 a call, and no reader sees the invoice.',
    'The bridge story’s writer is paid per human view. So she is paid nothing.',
  ],
};

export const BRIGHT_FUTURE = {
  title: 'Reading gets paid for directly',
  bullets: [
    'Your agent pays a fraction of a cent per article it actually reads.',
    'Writers get paid per read, not per eyeball parked next to an ad.',
    'Attention stops being the currency, so the page stops wasting yours.',
  ],
};
