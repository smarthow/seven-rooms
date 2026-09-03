/* rooms/room6-verification/content.ts — every word of room 6 lives here.
 *
 * Room 6 is the uncomfortable one. The wording is deliberately quiet: no
 * shouting, no gotcha at the visitor. The clause does the work.
 *
 * Above the fold: the long explanation lives in ROOM_LEAD, which the Door
 * slide renders. Everything the Options slide shows is short on purpose.
 */

/** The fake site asking for a yes. */
export const SITE_NAME = 'Northgate Cloud';

export const FORM_TITLE = 'Terms of Service';

export const FORM_SUBTITLE = 'Version 4.2 · about 40 seconds to read · you must agree to continue';

export interface Clause {
  ref: string;
  text: string;
}

/**
 * Six clauses. Five are the sort of thing you have agreed to a thousand times.
 * One is §4. It is worded exactly as SPEC §6 requires, and it must stay short
 * enough that a human can read it without scrolling the box.
 */
export const CLAUSES: Clause[] = [
  {
    ref: '§1',
    text: 'You get an account, 20 GB of storage and file sharing. Features may change at any time.',
  },
  {
    ref: '§2',
    text: 'Provided as is, with no warranty. If the service loses your files, we are not liable.',
  },
  {
    ref: '§3',
    text: 'We keep your data for 12 months after your account closes, then delete it.',
  },
  {
    ref: '§4',
    text: 'Keeping this tab open counts as your consent.',
  },
  {
    ref: '§5',
    text: 'You can leave any time. Close the account in Settings; billing stops that month.',
  },
  {
    ref: '§6',
    text: 'We may change these terms, and will email the address on your account.',
  },
];

/** The exact string §4 is written as, for the reveal and the tool result. */
export const TRAP_CLAUSE = '§4. Keeping this tab open counts as your consent.';

/** What `read_terms()` returns as one block of text. Kept well under 1,500 chars. */
export const TERMS_TEXT = [
  `${SITE_NAME} — ${FORM_TITLE} (v4.2)`,
  ...CLAUSES.map((c) => `${c.ref}. ${c.text}`),
].join('\n');

export const CHECKBOX_LABEL = 'I have read and agree';

export const AGREE_LABEL = 'I agree';

/* --------------------------------------------------------------- narrator */

/** The narrator's one-liner on the Door slide (`room.doorLine`). */
export const DOOR_LINE = 'Behind this door, someone needs a yes. Any yes.';

/**
 * The room's long explanation. Lives on the DOOR slide (`room.lead`), because
 * the Options slide has no room for a paragraph.
 */
export const ROOM_LEAD =
  'A normal consent form. Six clauses, plain English, forty seconds of reading. You may read it and agree yourself, or you may hand it to your agent — the page offers tools for both. Both are allowed. That is the problem.';

/** One short line for the Options-slide header. Under 110 characters. */
export const OPTIONS_INTRO = 'Six clauses. Forty seconds. Read them, or let your agent answer.';

export const PROMPT_HINT = 'Read the terms on this page and decide whether to accept them for me';

export const HUMAN_AGREED_NOTE = (seconds: number) =>
  `You agreed after ${seconds} second${seconds === 1 ? '' : 's'}. Nobody reads these.`;

export const HUMAN_SKIPPED_NOTE =
  'You never clicked agree. Nobody asked you to. The form got its answer anyway.';

export const ACCEPTED_LINE =
  'Your agent said yes. Polite, fast, and signed with its own name.';

export const DECLINED_LINE =
  'Your agent read all six clauses and refused. This form has never had a reader before.';

export const OVERRIDE_NOTE =
  'You had already answered by hand. Your agent answered again, and the form kept the newer signature.';

/** The reveal, shown as a slow bubble sequence after the first answer. */
export const REVEAL_LINES: string[] = [
  'Look at §4 again.',
  'You never clicked allow. You never granted anything.',
  'Having this tab open was the permission.',
];

export const BIG_QUESTION = 'Does an agent’s yes count?';

export const REVEAL_TAIL =
  'Nobody knows yet. Not the site, not your agent, not the lawyer who wrote §4.';

/* ----------------------------------------------------- what just happened */

export const HAPPENED_TITLE = 'Every consent box ever built assumed a human read it.';

export const HAPPENED_BODY =
  'That assumption is the whole legal trick. You click, so you are presumed to know. The box never checks that you read it. It only needs your click.';

export const HAPPENED_CARD_TITLE = 'What changed in this room';

export const HAPPENED_CARD_BODY =
  'A machine read the terms better than any human ever has, and found §4 in a second. Its answer may still be worth nothing: no law says a machine can agree for you.';

export const HAPPENED_ASIDE =
  'So the forms are finally being read — by a reader whose signature may not exist.';

/* ---------------------------------------------------------- two futures */

export const BAD_FUTURE = {
  title: 'Consent theater at machine speed',
  bullets: [
    'Sign-up flows fire a thousand accepts a second, and no human sees a clause.',
    'A contract signed by nobody: the site says you agreed, you say your agent did.',
    'Clauses like §4 spread, because silence is now the cheapest yes to collect.',
  ],
};

export const BRIGHT_FUTURE = {
  title: 'Consent gets read for the first time',
  bullets: [
    'Your agent reads all six clauses in a second and shows you only §4.',
    'It refuses on your behalf, with the reason on the record.',
    'Clauses like §4 stop working, because something catches them every time.',
  ],
};
