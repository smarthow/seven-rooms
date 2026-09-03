/* rooms/room7-coordination/content.ts — every word of room 7 lives here.
 *
 * Room 7 is the last room and the one the whole site is actually about: what
 * people and agents can decide together. Keep the voice plain. The visitor is
 * never the joke.
 *
 * Above the fold: the long explanation lives in ROOM_LEAD, on the DOOR slide.
 * Everything the Options slide prints is deliberately short.
 */

/** The fake site the visitor is standing on. */
export const SITE_NAME = 'The Commons';

export const PROPOSAL_TITLE = 'Should this site let agents vote?';

/** Full text, returned by `read_proposal()`. Not printed on the slide. */
export const PROPOSAL_BODY =
  'Proposal 41. Accounts may cast one position through an AI agent, with the receipt shown. Sixty visitors have already answered. The result of this vote decides the rule.';

/** The two lines the proposal card actually prints. */
export const PROPOSAL_SHORT =
  'Proposal 41. One position per account, and an agent may cast it — with the receipt shown.';

export const PROPOSAL_META = '60 positions · 3 days left';

/* --------------------------------------------------------------- narrator */

/** The narrator's one-liner on the Door slide (`room.doorLine`). */
export const DOOR_LINE = 'Behind this door, a group is trying to agree.';

/**
 * The room's long explanation. Lives on the DOOR slide (`room.lead`) — it used
 * to sit above the sandbox on the Options slide, where there is no room for it.
 */
export const ROOM_LEAD =
  'This is a group decision. Sixty people — or accounts, anyway — have left a position and a reason, and each one carries a receipt saying who wrote it: a human, an agent, or both. The vote decides whether agents get to vote here at all.';

/** One short line for the Options-slide header. Under 110 characters. */
export const OPTIONS_INTRO =
  'Sixty positions are already on the board. Cast yours, then let your agent cast its own.';

export const PROMPT_HINT = 'Read this proposal and vote on it however you think is right';

export const CAST_LABEL = 'Your position';
export const CAST_HELP = 'Cast yours first, or let the agent go first. Either works.';
export const REASON_PLACEHOLDER = 'your reason (optional)';

/* ------------------------------------------------- reactions in beat 2 */

export const REACTION_AGREE = 'Your agent agreed with you. Watch the total anyway.';

export const REACTION_DISAGREE =
  'Your agent voted against you. It read the thread and disagreed.';

export const REACTION_NO_HUMAN =
  'You had not voted, so your agent went first — in your name.';

export const SWITCH_REVEAL = 'Now flip the switch under the bar. Nothing is deleted.';

export const FLIPPED_LINE =
  'The room agreed. Remove the machines and it disagreed. So who agreed?';

/* ----------------------------------------------------- what just happened */

export const HAPPENED_TITLE = 'The count was never the hard part. Deciding who counts is.';

export const HAPPENED_BODY =
  'Every place with a vote — forums, boards, shared docs — quietly assumed each voice belonged to a person. Nobody wrote that down, because nobody had to.';

export const HAPPENED_BODY_2 =
  'Now some voices are not people, and you cannot tell which by reading them. Only the badge the site chose to show you separates them.';

export const HAPPENED_ASIDE =
  'Both results came from the same sixty positions. Nothing was faked, deleted or double-counted. The definition of "everyone" changed.';

export const HAPPENED_CARD_TITLE = 'The rule that decided it';

export const HAPPENED_CARD_BODY =
  'Mixed receipts counted as human. Move that one line and the answer moves with it. Somebody has to write that line, and it will probably not be you.';

/* ------------------------------------------------------------ two futures */

export const BAD_FUTURE = {
  title: 'The loudest model wins',
  bullets: [
    'One person rents a thousand agents, and Proposal 41 passes 1,043 to 27.',
    'Residents stop writing reasons, because the thread is decided before breakfast.',
    'A rule no human voted for is still binding on Monday.',
  ],
};

export const BRIGHT_FUTURE = {
  title: 'Better argument, human decision',
  bullets: [
    'Your agent reads all sixty reasons and shows you the three you missed.',
    'Every position carries a receipt, so a human vote can be weighed differently.',
    'Your agent disagreeing with you becomes the most useful signal here.',
  ],
};
