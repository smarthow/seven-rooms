/* chapters/index.ts — the running order of the whole site.
 *
 * PRE-WIRED. Adding or changing a room does not touch this file: a room owns
 * its own folder under src/rooms/ and nothing else. The 10 entries here are
 * the 10 segments of the progress bar (SPEC §4).
 */

import type { Chapter } from '../engine/types';

import intro from './intro';
import types from './types';
import ending from './ending';

import room1 from '../rooms/room1-attention';
import room2 from '../rooms/room2-funnels';
import room3 from '../rooms/room3-lockin';
import room4 from '../rooms/room4-marketplace';
import room5 from '../rooms/room5-creation';
import room6 from '../rooms/room6-verification';
import room7 from '../rooms/room7-coordination';

/** Every room, in order. The ending reads this to build the scoreboard. */
export const rooms = [room1, room2, room3, room4, room5, room6, room7];

export const chapters: Chapter[] = [intro, types, ...rooms, ending];

export default chapters;
