/* rooms/room5-creation/content.ts — every word of room 5 lives here.
 *
 * Room 5 is the positive core of the site. The voice stays plain and honest,
 * but this is the one room where the narrator is allowed to be glad.
 *
 * Above the fold: the long explanation lives in ROOM_LEAD, which the DOOR
 * slide renders (`room.lead`). The Options slide only gets one short line.
 */

/** The fake editor the visitor lands in. */
export const APP_NAME = 'Shared Canvas';

export const APP_SUBTITLE = '8 × 7 tiles · one document · two hands';

/* ------------------------------------------------------------- the palette */

/** Colour ids the tools accept. `paper` means empty. */
export const PALETTE = ['paper', 'coral', 'orange', 'teal', 'ink'] as const;
export type TileColor = (typeof PALETTE)[number];

/** One letter per colour, for the compact text grid `get_canvas()` returns. */
export const COLOR_LETTER: Record<TileColor, string> = {
  paper: '.',
  coral: 'C',
  orange: 'O',
  teal: 'T',
  ink: 'K',
};

export const LEGEND_LINE = '. empty  C coral  O orange  T teal  K ink';

/* --------------------------------------------------------------- narrator */

/** The narrator's one-liner on the Door slide (`room.doorLine`). */
export const DOOR_LINE =
  'Behind this door, nobody is trying to trick you. Watch what changes.';

/** The long explanation. Rendered by `doorSlide(room)` — beat 1. */
export const ROOM_LEAD =
  'This is an editor. Fifty-six tiles, five colours, one document. Click any tile to change its colour. Nobody here is trying to trick you. The same page hands your agent four tools that paint the same tiles, with no approval step in between — so the tile can change while your hand is still on the mouse.';

/** One short line for the Options-slide header. Under 110 characters. */
export const OPTIONS_INTRO = 'Click a tile to cycle its colour. The agent paints the same tiles, at the same time.';

export const PROMPT_HINT = 'Look at the canvas and draw a heart on it with me';

/** One tiny line under the calls to action. */
export const GHOST_NOTE =
  'The same four tools the page gives its own buttons. It draws for about six seconds — keep clicking while it does.';

export const KEEP_CLICKING = 'Do not wait for it. It will not wait for you.';

/** One-line labels for the tool list. The registered tools keep the long, honest text. */
export const TOOL_LINES: Record<string, string> = {
  set_tile: 'Paint one tile. x 0-7, y 0-6, five colours. Takes effect at once.',
  paint_tiles: 'Paint up to 24 tiles in one call. Same rules, no approval step.',
  get_canvas: 'Read the whole grid, who painted what, and the collision count.',
  clear_tile: 'Set one tile back to empty. Also at once, with nobody asked.',
};

/* ------------------------------------------- narrator reactions, in order */

export const FIRST_CALL_LINE =
  'There it is. A tile changed and nothing asked you for permission — no dialog, no "review changes" button.';

export const COLLISION_LINE =
  'That tile flashed because you both touched it inside four seconds. It is striped now: half yours, half its.';

export const AFTER_RUN_LINE =
  'You both drew at once, and nobody waited. The striped tiles are the first thing here that neither of you made alone.';

/* ----------------------------------------------------- what just happened */

export const HAPPENED_TITLE = 'You just touched the same thing at the same moment.';

export const HAPPENED_BODY =
  'Until now a machine using a web page did one of two things. It took your mouse away and you sat watching. Or it worked far from your eyes — a job on a server that finished at 3am and mailed you a file. Either way, you took turns.';

export const HAPPENED_BODY_2 =
  'On this canvas you did not take turns. Your click and its tool call landed in the same document, in the same second. That is new. Not faster — new.';

export const HAPPENED_CARD_TITLE = 'Why the editors will say yes first';

export const HAPPENED_CARD_BODY =
  'A news site loses money when an agent reads for you. An editor does not: it earns when the document gets better, and two hands make it better faster.';

/* ---------------------------------------------------------- two futures */

export const BAD_FUTURE = {
  title: 'The agent draws and you watch',
  bullets: [
    'It repaints your tile half a second after you set it, until you stop setting tiles.',
    'The file has one author field, and it says "assisted". Nobody can tell what was yours.',
    'You ask for whole pictures instead of drawing. In a year you cannot draw.',
  ],
};

export const BRIGHT_FUTURE = {
  title: 'A duet, with two names on it',
  bullets: [
    'You block in the shape, it fills the boring 300 tiles, and neither of you waits.',
    'The document remembers who touched what, so "we made this" is a checkable fact.',
    'You get drawings you would not have thought of alone, because something was drawing back.',
  ],
};

export const FUTURES_CODA =
  'Six other rooms end with a fence. This one does not — but only if the page opens the door.';
