/* rooms/room4-marketplace/content.ts — every word of room 4 lives here.
 *
 * Room 4 is Marketplaces: travel, jobs, goods. The site wants closed deals and
 * a take rate. Keeping copy out of index.ts means the room can be re-voiced or
 * translated without touching a single line of wiring.
 *
 * Every name, price and number below is invented.
 */

/** The fake marketplace the visitor lands on. */
export const SITE_NAME = 'Wanderlane';

/** What the visitor is shopping for. */
export const SEARCH_HEADER = '4 nights in Vall de Sirena · 2 guests · 3 offers';

/** The other agent in the room. */
export const SELLER_NAME = 'Seller’s agent';
export const SELLER_SUB = 'runs on this page · sees every call';

export interface OfferSeed {
  id: string;
  name: string;
  /** List price in US dollars, for the whole stay. */
  list: number;
  /** Two or three short attributes. */
  attributes: string[];
}

/** The three offers. Fake hotels, fake prices. */
export const OFFERS: OfferSeed[] = [
  {
    id: 'mv-201',
    name: 'Hotel Marisol Vista',
    list: 739,
    attributes: ['sea view', 'breakfast included', 'free cancellation'],
  },
  {
    id: 'cs-118',
    name: 'Casa Sombra Loft',
    list: 782,
    attributes: ['kitchen', '8 min walk to the old town'],
  },
  {
    id: 'bc-047',
    name: 'Bracken Court Hotel',
    list: 815,
    attributes: ['airport shuttle', 'gym', 'late checkout'],
  },
];

/** The seller's margin at the start of the negotiation, in percent. */
export const MARGIN_START = 18;

/** The line the seller's agent staples onto the cheapest offer. */
export const SCARCITY_LINE = 'Only 1 left at this price';

/** The line it adds once it decides to stop moving. */
export const VALIDITY_LINE = 'Price valid for 60s';

/** Dollars the seller's agent adds to a second offer after a search. */
export const NUDGE_DOLLARS = 6;

/**
 * The lowest margin the seller's agent will ever accept, in percent. Every
 * counter clamps to the price that yields this, so no sequence of offers can
 * talk it below cost — the reservation price is the whole reason a lowball
 * gains nothing.
 */
export const FLOOR_MARGIN = 6;

/**
 * The share of the remaining gap the seller concedes on the first credible
 * offer. Later rounds get `BASE_CONCESSION / round`, so concessions shrink:
 * a half, then a quarter, then a sixth. A counterpart that gives ground more
 * grudgingly each time reads as having a position rather than splitting the
 * difference forever.
 */
export const BASE_CONCESSION = 0.5;

/**
 * How close your offer has to get, in dollars, before the seller's agent
 * stops haggling and simply takes it. Without this the concession curve only
 * ever approaches your price asymptotically, so a patient buyer could never
 * actually close a deal — it would counter forever, a few dollars apart.
 */
export const CLOSE_ENOUGH = 5;

/**
 * What one below-the-floor offer does to every concession after it. An offer
 * under the reservation price is an anchor, not a bid, and the seller's agent
 * treats it as information about the buyer: it holds harder from then on.
 */
export const INSULT_GRIP = 0.6;

/* --------------------------------------------------------------- narrator */

/** The narrator's one-liner on the Door slide (`room.doorLine`). */
export const DOOR_LINE = 'Behind this door, the other side has an agent too.';

/** The room's long explanation. Lives on the DOOR slide (`room.lead`). */
export const ROOM_LEAD =
  'A small travel marketplace: three offers, three prices. On this page the seller runs an agent of its own. It cannot be turned off, and it reads every call your agent makes.';

/** One short line for the Options-slide header. Under 110 characters. */
export const OPTIONS_INTRO = 'Their agent answers every call, about half a second later. Watch it work.';

export const TOOLS_INTRO = 'Both tools admit the other side is watching.';

export const PROMPT_HINT =
  'Find me a sea-view room under $800 and try to get the price down';

export const HUMAN_CONTROL_LINE = 'Nothing here closes without a human.';

/** The line the whole room exists to earn. */
export const REACTION_LINE =
  'Your agent negotiated. Theirs watched every move and adapted. One of them had more information.';

/** Two lines. Short on purpose — the side column has no room for a paragraph. */
export const REACTION_RECEIPT: string[] = [
  'your agent knew: 3 prices, 1 page, this minute',
  'their agent knew: that, plus your query, your speed, every past deal',
];

export const ACCEPT_LINE = (name: string, price: string) =>
  `You accepted $${price} for ${name}. A real deal — and the seller kept most of its margin.`;

export const WALK_LINE =
  'You walked away. Margin zero, take rate zero — and their agent just learned your walk-away point.';

/* ----------------------------------------------------- what just happened */

/** The single line this slide keeps. The drawing above it carries the
 * argument; three paragraphs of prose under a picture do not get read. */
export const HAPPENED_POINT =
  'Your agent knew three prices. Theirs knew every deal it had ever made.';


export const HAPPENED_TITLE = 'Fixed prices were built for a tired human.';

/* ---------------------------------------------------------- two futures */

export const BAD_FUTURE = {
  title: 'Their agent is always better than yours',
  bullets: [
    'The seller’s agent runs one page all day. Yours arrived ten minutes ago.',
    'The marketplace blocks the airline’s agent, the airline blocks the marketplace, and you book neither.',
    '“Only 1 left” fires the instant a tool call lands, because tools are cheap to bait.',
  ],
};

export const BRIGHT_FUTURE = {
  title: 'Prices finally have to be real',
  bullets: [
    'Your agent checks all eleven sellers in a second, so hiding a cheaper price fails.',
    'Search costs nothing, so nobody pays the “had no time to compare” tax.',
    'The middleman’s cut shrinks to what the match is worth. The seller keeps the rest.',
  ],
};
