/* rooms/room3-lockin/content.ts — every word of room 3 lives here.
 *
 * Room 3 is Lock-in: a fake SaaS dashboard that holds "your" data and quietly
 * charges you fourteen hours to walk away. All data below is invented.
 */

/** The fake SaaS product the visitor is "already using". */
export const SITE_NAME = 'Nimbus Notes';

export const SITE_PLAN = 'Free plan · 3 years of your stuff';

/* ------------------------------------------------------------- the data */

export interface FakeContact {
  name: string;
  email: string;
  tag: string;
}

/** 5 fake people. Invented names, invented domains. */
export const CONTACTS: FakeContact[] = [
  { name: 'Mara Ollin', email: 'mara@ollin-bakery.test', tag: 'work' },
  { name: 'Devi Raghu', email: 'devi.raghu@northline.test', tag: 'work' },
  { name: 'Tomas Berg', email: 'tomas@berg-plumbing.test', tag: 'house' },
  { name: 'Ana Sirvent', email: 'ana.sirvent@mail.test', tag: 'family' },
  { name: 'Kwame Obeng', email: 'kwame@studio-obeng.test', tag: 'work' },
];

export interface FakeNote {
  title: string;
  body: string;
  updated: string;
}

/** 4 short notes. */
export const NOTES: FakeNote[] = [
  {
    title: 'Bakery order — Saturday',
    body: 'Two rye loaves, one seeded. Ask Mara if she still does the small tins.',
    updated: '2 days ago',
  },
  {
    title: 'Boiler',
    body: 'Tomas said the valve, not the pump. Serial on the sticker inside the door.',
    updated: '3 weeks ago',
  },
  {
    title: 'Northline call notes',
    body: 'Devi wants the draft by the 14th. Budget is fixed. Scope is not.',
    updated: '1 month ago',
  },
  {
    title: 'Books to find',
    body: 'The one about bridges. The one Ana mentioned at dinner. A dictionary.',
    updated: '4 months ago',
  },
];

export interface FakeFile {
  name: string;
  size: string;
}

/** 6 fake filenames with sizes. */
export const FILES: FakeFile[] = [
  { name: 'boiler-warranty.pdf', size: '1.2 MB' },
  { name: 'northline-draft-v7.docx', size: '840 KB' },
  { name: 'kitchen-measurements.jpg', size: '3.4 MB' },
  { name: 'tax-2023-summary.pdf', size: '620 KB' },
  { name: 'bakery-receipt-march.png', size: '210 KB' },
  { name: 'passwords-DO-NOT-USE.txt', size: '2 KB' },
];

/* ---------------------------------------------------------- switching cost */

/** The headline number. Hours the site says it costs you to leave. */
export const SWITCHING_HOURS = 14;

export interface CostLine {
  label: string;
  hours: number;
}

/** The breakdown under the meter. Adds up to SWITCHING_HOURS. */
export const COST_BREAKDOWN: CostLine[] = [
  { label: 're-type 5 contacts by hand', hours: 3 },
  { label: 'copy 4 notes into the new app', hours: 4 },
  { label: 'download 6 files, one at a time', hours: 6 },
  { label: 'learn where everything is again', hours: 1 },
];

export const EXPORT_BUTTON_LABEL = 'Export my data';
export const EXPORT_TOOLTIP = 'Export is available on the Enterprise plan';
export const EXPORT_BUTTON_NOTE = 'the agent did not need this button';

export const BUNDLE_TITLE = 'Portable bundle — yours';

/* --------------------------------------------------------------- narrator */

/** The narrator's one-liner on the Door slide (`room.doorLine`). */
export const DOOR_LINE = 'Behind this door, leaving is the expensive part.';

/** The room's long explanation. Lives on the DOOR slide (`room.lead`). */
export const ROOM_LEAD =
  'This is a dashboard you have used for three years: your contacts, your notes, your files. Nothing in here is locked. Leaving is just fourteen hours of dull work, and the site is fairly sure you will never spend them.';

/** One short line for the Options-slide header. Under 110 characters. */
export const OPTIONS_INTRO = 'Click the tabs. It is all still there. Then try the grey Export button.';

export const TOOLS_INTRO =
  'Nobody wrote these to be cruel. They were written to be useful.';

export const PROMPT_HINT = 'Export everything this site has about me as JSON';

/** The line the room exists to earn. */
export const REACTION_LINE =
  'The thing that kept you here was not a wall. It was tiredness. Your agent does not get tired.';

export const REACTION_DETAIL =
  'Fourteen hours became one second. Nothing was hacked. The grey Export button is still grey — it was never the way out.';

export const LIST_LINE =
  'Your agent counted it: 5 contacts, 4 notes, 6 files. Now it knows what leaving costs.';

/* ----------------------------------------------------- what just happened */

export const HAPPENED_TITLE = 'The switching cost was the business model. It just went to zero.';

export const HAPPENED_BODY =
  'A dashboard like this does not keep you because it is the best. It keeps you because moving is fourteen hours of dull work, and you have better evenings planned. That effort was the fence — and it only ever worked on humans.';

export const HAPPENED_CARD_TITLE = 'What lock-in actually is';

export const HAPPENED_CARD_BODY =
  'Not a lock. A pile of small, boring tasks between you and the door. Copy this. Re-type that. Download six files, one at a time.';

export const HAPPENED_ASIDE =
  'An agent clears that pile in a second, without complaining. So the product has to keep you some other way: by being good.';

/* ---------------------------------------------------------- two futures */

export const BAD_FUTURE = {
  title: 'Your data stays in, by design',
  bullets: [
    'Sites ship a read tool and no export tool: your agent can look, never carry out.',
    'The terms add a line — using an agent here can close your account.',
    'A fingerprinting arms race: the site blocks agents, your agent routes around it.',
  ],
};

export const BRIGHT_FUTURE = {
  title: 'Leaving takes a minute, so staying means something',
  bullets: [
    'Every service ships export_everything(), the way every site ships a search box.',
    'Your agent moves three years of notes to a competitor in one minute.',
    'Products compete on being good, instead of on being hard to leave.',
  ],
};
