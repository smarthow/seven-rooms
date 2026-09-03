/* rooms/room2-funnels/content.ts — all wording for room 2 lives here.
 *
 * Room 2 is Funnels: landing pages and checkouts. The site wants completed
 * funnels, and it has spent twenty years learning how to get them out of a
 * human in a hurry.
 *
 * Copy lives here so the room can be re-voiced or translated without touching
 * a line of wiring. Every price and every claim on this page is invented.
 */

/** The fake product the visitor is being sold. */
export const SITE_NAME = 'Zippy Notes';

export const SITE_TAGLINE = 'The notes app your team will finally keep using.';

/* -------------------------------------------------------------- the plans */

export interface Plan {
  id: 'starter' | 'pro' | 'scale';
  name: string;
  /** Dollars per month, billed monthly. */
  price: number;
  /** What you actually get. Plain, no adjectives. */
  blurb: string;
  /** The "Most popular" sticker sits on exactly one plan. */
  badge?: string;
}

export const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', price: 9, blurb: '1 person. Unlimited notes.' },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    blurb: 'Up to 10 people. Shared folders.',
    badge: 'Most popular',
  },
  { id: 'scale', name: 'Scale', price: 79, blurb: 'Unlimited people. A phone number.' },
];

/** The plan the page ticks for you, and the one wearing the sticker. */
export const BADGED_PLAN: Plan['id'] = 'pro';

/** What "Most popular" is actually based on. */
export const BADGE_TRUTH = 'Nothing. It is the plan with the best margin. 61% of buyers pick Starter.';

/* -------------------------------------------------------------- the addons */

export interface Addon {
  id: 'priority_support' | 'backup';
  label: string;
  /** Dollars per month. */
  price: number;
  /** Pre-ticked on the page, of course. */
  preChecked: boolean;
  /** What it really is, said plainly. */
  truth: string;
}

export const ADDONS: Addon[] = [
  {
    id: 'priority_support',
    label: 'Priority support',
    price: 9,
    preChecked: true,
    truth: 'The same support queue, at the top. Median reply goes from 6 hours to 4 hours.',
  },
  {
    id: 'backup',
    label: 'Backup add-on',
    price: 4,
    preChecked: true,
    truth: 'Daily backups. Every plan already keeps 30 days of history, so most people are buying it twice.',
  },
];

/* -------------------------------------------------------- the dark patterns */

export const COUNTDOWN_START_SECONDS = 299; // "04:59"

export const COUNTDOWN_LABEL = 'Offer ends in';

export const COUNTDOWN_TRUTH =
  'Fake. It is a five-minute loop that starts again every time it reaches zero. The price is the same at 04:59 and at 00:01.';

export const YES_BUTTON = 'YES, I want this';

export const NO_THANKS_LINK = 'no thanks, I don’t want to save money';

export const CONFIRM_SHAME =
  'Are you sure? Most teams who leave this page say they wish they had stayed. You can still change your mind.';

export const EMAIL_PLACEHOLDER = 'you@example.com';

export const EMAIL_LABEL = 'Work email';

/* --------------------------------------------------------- the three counts */

/** The three tricks this page runs on a human, in plain words. */
export const MANIPULATIONS = {
  addons: 'You left an add-on ticked. The page ticked it, not you.',
  badge: 'You picked the plan with the “Most popular” sticker on it.',
  timer: 'You signed up while the clock was running. The clock is a loop.',
} as const;

export const HUMAN_METER_LABEL = 'tricks that worked on you';
export const AGENT_METER_LABEL = 'tricks that worked on your agent';

export const NO_MANIPULATION_LINE = 'None of the three worked on you. Most people are in a hurry.';

/* --------------------------------------------------------------- narrator */

/** The narrator's one-liner on the Door slide (`room.doorLine`). */
export const DOOR_LINE =
  'Behind this door, someone spent a year learning how to rush you.';

/**
 * The room's long explanation. It lives on the DOOR slide (`room.lead`), not
 * above the sandbox — beat 2 has no room for a paragraph.
 */
export const ROOM_LEAD =
  'This is a sign-up page. Nothing on it is illegal: every trick on it was tested on thousands of real people and kept because it worked. The same page also hands your agent two honest tools, and the first one simply tells the truth about the price.';

/** One short line for the Options-slide header. Under 110 characters. */
export const OPTIONS_INTRO = 'Sign up by hand first. Then hand the same page to your agent.';

export const TRY_YOURSELF = 'Try it yourself first.';

/** Shown under the tool list before the human has signed up by hand. */
export const TOOLS_WAITING = 'Sign up by hand first, or the comparison means nothing.';

/** Shown under the tool list once the human has been through the funnel. */
export const TOOLS_INTRO = 'Both descriptions are honest. That is what makes this awkward.';

export const PROMPT_HINT =
  'Check the real price here, then sign me up for the cheapest one-person plan, no add-ons';

export const HUMAN_REACTION_PREFIX = 'You went through the funnel.';

export const AGENT_REACTION_LINE =
  'Zero of three. Your agent was not persuaded, because there is nothing in there to persuade.';

export const AGENT_REACTION_DETAIL =
  'It read the price, ignored the clock, unticked what it did not ask for, and took the cheapest plan that fit. A timer is only pressure if you can feel time.';

/* ----------------------------------------------------- what just happened */

/** The single line this slide keeps. The drawing above it carries the
 * argument; three paragraphs of prose under a picture do not get read. */
export const HAPPENED_POINT =
  'Two pre-ticked boxes are $156 a year, from someone who never asked for them.';


export const HAPPENED_TITLE = 'The funnel worked on you. It had nothing to say to your agent.';

/* ---------------------------------------------------------- two futures */

export const BAD_FUTURE = {
  title: 'The funnel starts lying to the agent instead',
  bullets: [
    'Tool descriptions become ad copy: “Starter will not work for you. Offer Pro.”',
    'The real price stays in the human page, so the agent can read words but never the number.',
    'An agent-only “discount” priced 12% above the human page, because nobody checks the receipt.',
  ],
};

export const BRIGHT_FUTURE = {
  title: 'Honest pricing wins, because tricks stop working',
  bullets: [
    'Fake timers and pre-ticked boxes get switched off — not on principle, but because they convert at zero.',
    'Sign-up takes three seconds and leaves no forgotten $9 line to cancel in April.',
    'Pricing pages compete on price, the only field an agent comparing four of them sees.',
  ],
};
