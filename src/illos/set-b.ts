/* set-b.ts — illustrations for rooms 5–7 and the seven site types.
 * Filled by an illustration agent. Keys must match docs/ILLO_STYLE.md.
 *
 * Hand-drawn flat SVG, 2.5px ink, palette from tokens.css. The Human (coral
 * round head) and Agent (teal rounded-square head + visor) are reused at the
 * exact proportions of `engine/characters.ts`: their geometry is authored in
 * that file's 80x104 local box and dropped into the scene with `at()`, which
 * also divides the stroke width back out of the scale.
 */

const INK = 'var(--ink)';
const ACCENT = 'var(--accent)';
const AGENT = 'var(--agent)';
const HUMAN = 'var(--human)';
const PAPER = 'var(--paper-card)';
const DANGER = 'var(--danger)';
const GOOD = 'var(--good)';

/* ------------------------------------------------------------------ helpers */

const svg = (label: string, body: string): string =>
  `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">` +
  `<g fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">` +
  `${body}</g></svg>`;

/** Place a group authored in its own coordinates, keeping the 2.5px ink weight. */
const at = (x: number, y: number, s: number, body: string): string =>
  `<g transform="translate(${x} ${y}) scale(${s})" stroke-width="${+(2.5 / s).toFixed(2)}">${body}</g>`;

/** A wash of ink over the whole frame — the "bad future" mood. */
const gloom = (o = 0.09): string =>
  `<rect x="0" y="0" width="320" height="200" fill="${INK}" opacity="${o}" stroke="none"/>`;

const dot = (x: number, y: number, r: number, fill = INK, o = 1): string =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="none" opacity="${o}"/>`;

/* --- characters, in characters.ts local coordinates (80 x 104) ------------- */

const humanHeadLocal = (mood: 'happy' | 'worried', fill: string): string =>
  `<circle cx="40" cy="42" r="32" fill="${fill}"/>` +
  `${dot(29, 38, 3.6)}${dot(51, 38, 3.6)}` +
  (mood === 'worried'
    ? `<path d="M20 25 L31 29"/><path d="M60 25 L49 29"/><path d="M30 60 Q40 52 50 60"/>`
    : `<path d="M30 55 Q40 64 50 55"/>`);

const agentHeadLocal = (): string =>
  `<path d="M40 14 L40 6"/>${dot(40, 4, 3.2)}` +
  `<rect x="10" y="14" width="60" height="48" rx="16" fill="${AGENT}"/>` +
  `<rect x="20" y="34" width="40" height="14" rx="7" fill="${PAPER}"/>` +
  `${dot(40, 41, 3.4, AGENT)}<path d="M28 55 L52 55" opacity="0.55"/>`;

/** Human head centred on (cx,cy) with radius r — same face as characters.ts. */
const humanHead = (
  cx: number,
  cy: number,
  r: number,
  mood: 'happy' | 'worried' = 'happy',
  fill = HUMAN,
): string => {
  const k = r / 32;
  return at(cx - 40 * k, cy - 42 * k, k, humanHeadLocal(mood, fill));
};

/** Agent head centred on (cx,cy) with width w — same visor as characters.ts. */
const agentHead = (cx: number, cy: number, w: number): string => {
  const k = w / 60;
  return at(cx - 40 * k, cy - 38 * k, k, agentHeadLocal());
};

const humanFig = (x: number, y: number, s: number, mood: 'happy' | 'worried', arms = ''): string =>
  at(
    x,
    y,
    s,
    `<path d="M22 96 L22 78 M58 96 L58 78"/>` +
      `<rect x="20" y="72" width="40" height="12" rx="6" fill="${HUMAN}"/>${arms}` +
      humanHeadLocal(mood, HUMAN),
  );

const agentFig = (x: number, y: number, s: number, arms = ''): string =>
  at(
    x,
    y,
    s,
    `<path d="M22 96 L22 80 M58 96 L58 80"/>` +
      `<rect x="20" y="72" width="40" height="12" rx="6" fill="${AGENT}"/>${arms}` +
      agentHeadLocal(),
  );

/* --- props ---------------------------------------------------------------- */

const tile = (x: number, y: number, fill: string): string =>
  `<rect x="${x}" y="${y}" width="22" height="22" rx="3" fill="${fill}"/>`;

/** A crayon whose tip sits on (x,y); `a` leans it clockwise. */
const crayon = (x: number, y: number, a: number, color: string): string =>
  `<g transform="translate(${x} ${y}) rotate(${a})">` +
  `<rect x="-6" y="4" width="12" height="30" rx="3" fill="${color}"/>` +
  `<path d="M-6 4 L0 -6 L6 4 Z" fill="${INK}"/></g>`;

/** Sleeve + mitten palm reaching in from `side`, off the edge of the frame. */
const hand = (
  px: number,
  py: number,
  side: 'l' | 'r',
  color: string,
  r = 13,
  len = 84,
  ang = 8,
): string => {
  const dir = side === 'l' ? -1 : 1;
  const x = side === 'l' ? px - len - 8 : px + 8;
  return (
    `<rect x="${x}" y="${py - 9}" width="${len}" height="19" rx="9.5" fill="${color}"` +
    ` transform="rotate(${dir * ang} ${px} ${py})"/>` +
    `<circle cx="${px}" cy="${py - 3}" r="${r}" fill="${color}"/>`
  );
};

/** A hand gripping a crayon whose tip lands on (tx,ty). */
const drawingHand = (
  tx: number,
  ty: number,
  a: number,
  side: 'l' | 'r',
  handColor: string,
  crayonColor: string,
): string => {
  const rad = (a * Math.PI) / 180;
  const px = +(tx + 19 * Math.sin(rad)).toFixed(1);
  const py = +(ty + 19 * Math.cos(rad)).toFixed(1);
  return hand(px, py + 3, side, handColor, 12, 84, 32) + crayon(tx, ty, a, crayonColor);
};

const sparkle = (x: number, y: number, s: number, color: string): string =>
  `<g transform="translate(${x} ${y}) scale(${s})" stroke="${color}" stroke-width="${+(2.5 / s).toFixed(2)}">` +
  `<path d="M0 -9 L0 9 M-9 0 L9 0 M-6 -6 L6 6 M6 -6 L-6 6"/></g>`;

const whisper = (x: number, y: number, dir: number): string =>
  `${dot(x, y, 2.6, INK, 0.5)}${dot(x + 9 * dir, y + 4, 2.2, INK, 0.4)}${dot(x + 17 * dir, y + 8, 1.8, INK, 0.3)}`;

/* --- shared scene pieces -------------------------------------------------- */

/** The shared canvas card of room 5, with a faint dashed tile grid. */
const canvasCard = (x: number, y: number, w: number, h: number, rot: number): string => {
  const vs: string[] = [];
  for (let gx = x + 24; gx < x + w; gx += 24) vs.push(`M${gx} ${y + 6} L${gx} ${y + h - 6}`);
  for (let gy = y + 24; gy < y + h; gy += 24) vs.push(`M${x + 6} ${gy} L${x + w - 6} ${gy}`);
  return (
    `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${PAPER}"/>` +
    `<path d="${vs.join(' ')}" opacity="0.16" stroke-dasharray="3 6"/></g>`
  );
};

/** A contract sheet with ruled lines; `inner` is drawn on the tilted sheet. */
const contract = (
  x: number,
  y: number,
  w: number,
  h: number,
  rot: number,
  inner = '',
): string => {
  const rules: string[] = [];
  for (let i = 0; i < 5; i++) {
    const ry = y + 22 + i * 18;
    const rw = i % 2 ? w - 52 : w - 28;
    rules.push(`M${x + 14} ${ry} L${x + rw} ${ry}`);
  }
  return (
    `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${PAPER}"/>` +
    `<path d="${rules.join(' ')}" opacity="0.32"/>${inner}</g>`
  );
};

/** The rubber stamp, grip at the top, base centred on x. */
const stampTool = (cx: number, top: number, s: number): string =>
  at(
    cx - 36 * s,
    top,
    s,
    `<rect x="6" y="0" width="60" height="24" rx="12" fill="${INK}"/>` +
      `<rect x="26" y="20" width="20" height="44" rx="8" fill="${INK}"/>` +
      `<rect x="0" y="62" width="72" height="32" rx="8" fill="${AGENT}"/>`,
  );

/** A concentric ring, as pressed by the stamp. */
const stampMark = (cx: number, cy: number, r: number, color: string, extra = ''): string =>
  `<g transform="rotate(-8 ${cx} ${cy})" stroke="${color}">` +
  `<circle cx="${cx}" cy="${cy}" r="${r}" stroke-width="4.5"/>` +
  `<circle cx="${cx}" cy="${cy}" r="${r - 8}" stroke-width="3" opacity="0.7"/>${extra}</g>`;

/* ------------------------------------------------------------------ room 5 */

const room5Door = svg(
  'a human hand and an agent hand drawing on the same canvas at the same time',
  canvasCard(48, 26, 224, 132, -1.4) +
    tile(66, 44, HUMAN) +
    tile(90, 68, HUMAN) +
    tile(210, 44, AGENT) +
    tile(186, 92, AGENT) +
    tile(138, 68, ACCENT) +
    `<path d="M96 106 Q110 96 124 102" stroke="${HUMAN}" stroke-width="6"/>` +
    `<path d="M216 102 Q202 92 188 98" stroke="${AGENT}" stroke-width="6"/>` +
    drawingHand(96, 104, 28, 'l', HUMAN, ACCENT) +
    drawingHand(216, 100, -28, 'r', AGENT, ACCENT),
);

const room5Bad = svg(
  "the agent's hand covering the human's, painting over the marks the human made",
  canvasCard(48, 26, 224, 132, -1.4) +
    tile(66, 44, AGENT) +
    tile(90, 44, AGENT) +
    tile(114, 44, AGENT) +
    tile(186, 44, AGENT) +
    tile(210, 44, AGENT) +
    tile(210, 92, AGENT) +
    tile(66, 68, HUMAN) +
    `<path d="M62 66 L92 92 M92 66 L62 92" stroke="${AGENT}" stroke-width="6"/>` +
    tile(114, 92, HUMAN) +
    `<path d="M110 90 L140 116 M140 90 L110 116" stroke="${DANGER}" stroke-width="4.5"/>` +
    hand(120, 150, 'l', HUMAN, 12, 84, 26) +
    `<path d="M106 144 L94 138 M108 158 L96 164" stroke="${HUMAN}" stroke-width="7"/>` +
    hand(150, 128, 'r', AGENT, 27, 96, 20) +
    gloom(0.11),
);

const room5Bright = svg(
  'a human hand and an agent hand together drawing one heart neither could make alone',
  canvasCard(72, 20, 176, 146, 1.2) +
    tile(125, 38, HUMAN) +
    tile(173, 38, AGENT) +
    tile(101, 62, HUMAN) +
    tile(125, 62, HUMAN) +
    tile(149, 62, ACCENT) +
    tile(173, 62, AGENT) +
    tile(197, 62, AGENT) +
    tile(101, 86, HUMAN) +
    tile(125, 86, HUMAN) +
    tile(149, 86, ACCENT) +
    tile(173, 86, AGENT) +
    tile(197, 86, AGENT) +
    tile(125, 110, HUMAN) +
    tile(149, 110, ACCENT) +
    tile(173, 110, AGENT) +
    tile(149, 134, ACCENT) +
    drawingHand(126, 150, 26, 'l', HUMAN, HUMAN) +
    drawingHand(190, 150, -26, 'r', AGENT, AGENT) +
    sparkle(40, 34, 1.5, GOOD) +
    sparkle(282, 46, 1.2, GOOD) +
    sparkle(36, 128, 1, GOOD),
);

/* ------------------------------------------------------------------ room 6 */

const room6Door = svg(
  'a rubber stamp coming down over a contract',
  contract(
    34,
    34,
    204,
    140,
    -2,
    `<path d="M50 152 L130 152" opacity="0.5"/>` +
      `<path d="M54 148 Q68 134 82 148 Q94 160 108 142" stroke="${INK}" stroke-width="3"/>`,
  ) +
    stampMark(198, 134, 26, ACCENT) +
    stampTool(198, 14, 0.95) +
    `<path d="M146 58 L134 50 M148 76 L132 76 M268 58 L280 50 M266 76 L282 76" opacity="0.35" stroke-width="3"/>`,
);

const room6Bad = svg(
  'a stamp floating over a contract with an empty signature line, pressed by nobody',
  contract(
    30,
    40,
    196,
    134,
    3,
    `<path d="M44 150 L134 150" stroke="${DANGER}" stroke-dasharray="6 6" stroke-width="3"/>`,
  ) +
    stampMark(198, 126, 26, DANGER) +
    stampTool(200, 20, 0.95) +
    `<circle cx="200" cy="62" r="26" stroke-dasharray="5 7" opacity="0.55"/>` +
    `<path d="M170 42 L162 34 M232 42 L240 34" opacity="0.4" stroke-width="3"/>` +
    `<path d="M156 108 L180 108 M244 108 L268 108" opacity="0.3" stroke-width="3"/>` +
    gloom(0.13),
);

const room6Bright = svg(
  'the agent holds the contract up and points at one clause; the human looks relieved',
  agentFig(6, 62, 0.72) +
    `<g transform="rotate(-3 150 96)">` +
    `<rect x="96" y="34" width="108" height="128" rx="6" fill="${PAPER}"/>` +
    `<path d="M108 54 L184 54 M108 72 L168 72 M108 126 L180 126 M108 142 L156 142" opacity="0.32"/>` +
    `<rect x="102" y="86" width="96" height="28" rx="6" fill="${GOOD}" opacity="0.16" stroke="none"/>` +
    `<path d="M108 96 L190 96 M108 108 L172 108" stroke="${GOOD}" stroke-width="3"/></g>` +
    `<path d="M44 122 Q68 146 94 152" stroke="${AGENT}" stroke-width="7.5"/>` +
    `<circle cx="96" cy="152" r="8" fill="${AGENT}"/>` +
    `<path d="M46 104 Q70 90 90 96" stroke="${AGENT}" stroke-width="9"/>` +
    `<circle cx="92" cy="96" r="9" fill="${AGENT}"/>` +
    `<path d="M101 98 L112 99" stroke-width="3.5"/>` +
    humanFig(240, 60, 0.72, 'happy') +
    `<path d="M254 118 Q240 114 232 104" stroke="${HUMAN}" stroke-width="8"/>` +
    `<circle cx="231" cy="103" r="8" fill="${HUMAN}"/>` +
    `<path d="M228 40 L240 44 L262 18" stroke="${GOOD}" stroke-width="4.5"/>`,
);

/* ------------------------------------------------------------------ room 7 */

const room7Door = svg(
  'a circle of human and agent heads around one table',
  `<ellipse cx="160" cy="102" rx="72" ry="38" fill="${PAPER}"/>` +
    `<rect x="132" y="88" width="34" height="24" rx="3" fill="${PAPER}" transform="rotate(-6 149 100)"/>` +
    `<rect x="168" y="96" width="30" height="22" rx="3" fill="${PAPER}" transform="rotate(5 183 107)"/>` +
    humanHead(160, 34, 15) +
    agentHead(239, 55, 30) +
    humanHead(272, 102, 15) +
    agentHead(239, 149, 30) +
    humanHead(160, 168, 15) +
    agentHead(81, 149, 30) +
    humanHead(48, 102, 15) +
    agentHead(81, 55, 30),
);

const room7Bad = svg(
  'one human head drowned in a crowd of identical agent heads',
  `<defs><g id="sr7bad-a">${agentHeadLocal()}</g></defs>` +
    [
      [34, 34],
      [90, 30],
      [146, 34],
      [202, 30],
      [258, 34],
      [296, 62],
      [18, 66],
      [62, 70],
      [118, 66],
      [216, 70],
      [268, 74],
      [30, 108],
      [86, 112],
      [230, 108],
      [284, 112],
    ]
      .map(
        ([x, y]) =>
          `<use href="#sr7bad-a" transform="translate(${x - 18} ${y - 19}) scale(0.6)" stroke-width="4.17"/>`,
      )
      .join('') +
    humanHead(160, 116, 17, 'worried') +
    `<use href="#sr7bad-a" transform="translate(112 92) scale(0.6)" stroke-width="4.17"/>` +
    `<use href="#sr7bad-a" transform="translate(178 96) scale(0.6)" stroke-width="4.17"/>` +
    `<path d="M0 146 Q40 132 80 146 Q120 160 160 146 Q200 132 240 146 Q280 160 320 146" stroke="${DANGER}" stroke-width="4"/>` +
    `<path d="M0 168 Q40 156 80 168 Q120 180 160 168 Q200 156 240 168 Q280 180 320 168" stroke="${DANGER}" stroke-width="3" opacity="0.6"/>` +
    gloom(0.12),
);

const room7Bright = svg(
  'agents stand behind humans whispering advice while the humans raise their hands to vote',
  `<path d="M138 30 L150 40 L174 12" stroke="${GOOD}" stroke-width="4.5"/>` +
    [70, 160, 250]
      .map((x, i) => {
        const dir = i === 1 ? 1 : -1;
        return (
          agentHead(x + dir * 40, 74, 30) +
          whisper(x + dir * 24, 84, -dir) +
          `<path d="M${x - dir * 20} 142 Q${x - dir * 40} 116 ${x - dir * 32} 88" stroke="${HUMAN}" stroke-width="8"/>` +
          `<circle cx="${x - dir * 32}" cy="80" r="8" fill="${HUMAN}"/>` +
          `<rect x="${x - 25}" y="134" width="50" height="15" rx="7.5" fill="${HUMAN}"/>` +
          humanHead(x, 112, 20)
        );
      })
      .join('') +
    `<ellipse cx="160" cy="190" rx="150" ry="36" fill="${PAPER}"/>`,
);

/* ------------------------------------------------------------- site types */

const type1 = svg(
  'a clock beside a newspaper — sites that want your seconds',
  `<g transform="rotate(2.5 224 106)">` +
    `<rect x="164" y="46" width="126" height="120" rx="5" fill="${PAPER}"/>` +
    `<path d="M176 66 L278 66" stroke-width="4"/>` +
    `<rect x="176" y="78" width="44" height="34" rx="3" fill="${ACCENT}"/>` +
    `<path d="M230 82 L278 82 M230 96 L278 96 M230 110 L272 110 M176 126 L278 126 M176 140 L262 140 M176 154 L270 154" opacity="0.38"/></g>` +
    `<circle cx="82" cy="110" r="48" fill="${PAPER}"/>` +
    `<path d="M82 62 A48 48 0 0 1 130 110" stroke="${ACCENT}" stroke-width="9"/>` +
    `<path d="M82 110 L82 76 M82 110 L108 124"/>` +
    dot(82, 110, 5) +
    `<path d="M70 56 L94 56"/>`,
);

const type2 = svg(
  'a funnel that swallows many visitors and drips out one coin',
  humanHead(118, 30, 12) +
    humanHead(160, 24, 12) +
    humanHead(202, 30, 12) +
    at(
      72,
      12,
      1.72,
      `<path d="M16 20 L84 20 L58 56 L58 78 L42 78 L42 56 Z" fill="${PAPER}"/>`,
    ) +
    `<circle cx="160" cy="172" r="18" fill="${ACCENT}"/>` +
    `<circle cx="160" cy="172" r="9" opacity="0.5" stroke-width="3"/>` +
    `<path d="M138 150 L132 160 M182 150 L188 160" opacity="0.4" stroke-width="3"/>`,
);

const type3 = svg(
  'a padlock on a filing cabinet — sites that keep your data inside',
  `<g transform="rotate(-1.2 160 104)">` +
    `<rect x="72" y="30" width="176" height="146" rx="8" fill="${PAPER}"/>` +
    `<path d="M72 78 L248 78 M72 126 L248 126"/>` +
    `<rect x="142" y="50" width="36" height="9" rx="4.5" fill="${INK}"/>` +
    `<rect x="142" y="146" width="36" height="9" rx="4.5" fill="${INK}"/></g>` +
    at(
      95,
      22,
      1.3,
      `<path d="M34 44 L34 32 A16 16 0 0 1 66 32 L66 44" stroke-width="3"/>` +
        `<rect x="24" y="42" width="52" height="42" rx="10" fill="${ACCENT}"/>` +
        `<circle cx="50" cy="60" r="6" fill="${PAPER}"/><path d="M50 64 L50 74"/>`,
    ),
);

const type4 = svg(
  'a human hand and an agent hand reaching over one price tag',
  `<g transform="rotate(-9 170 82)">` +
    `<rect x="122" y="46" width="96" height="62" rx="9" fill="${ACCENT}"/>` +
    `<circle cx="140" cy="62" r="7" fill="${PAPER}"/>` +
    `<path d="M156 78 L204 78 M156 94 L184 94" stroke="${PAPER}" stroke-width="5"/></g>` +
    hand(108, 106, 'l', HUMAN, 17, 104, 16) +
    hand(216, 106, 'r', AGENT, 17, 104, 16) +
    `<path d="M152 122 L170 140 L188 122" stroke="${ACCENT}" stroke-width="4"/>`,
);

const type5 = svg(
  'a pencil drawing on a sheet of paper',
  `<g transform="rotate(-1.6 160 106)">` +
    `<rect x="52" y="42" width="216" height="128" rx="6" fill="${PAPER}"/>` +
    `<path d="M72 62 L200 62 M72 78 L172 78" opacity="0.3"/></g>` +
    `<path d="M78 138 Q124 108 174 132" stroke="${ACCENT}" stroke-width="6"/>` +
    `<g transform="translate(174 132) rotate(34)">` +
    `<rect x="-11" y="-90" width="22" height="68" rx="4" fill="${AGENT}"/>` +
    `<rect x="-11" y="-90" width="22" height="15" rx="4" fill="${INK}"/>` +
    `<path d="M-11 -22 L0 0 L11 -22 Z" fill="${PAPER}"/>` +
    `<path d="M-4.5 -9 L4.5 -9 L0 0 Z" fill="${INK}" stroke="none"/></g>`,
);

const type6 = svg(
  'a rubber stamp pressing down on a sheet of paper',
  `<g transform="rotate(1.4 160 128)">` +
    `<rect x="40" y="90" width="228" height="82" rx="6" fill="${PAPER}"/>` +
    `<path d="M58 110 L150 110 M58 128 L132 128 M58 150 L160 150" opacity="0.32"/></g>` +
    stampMark(88, 132, 24, ACCENT) +
    stampTool(202, 30, 0.98) +
    `<path d="M150 62 L140 54 M254 62 L264 54" opacity="0.35" stroke-width="3"/>`,
);

const type7 = svg(
  'three heads — a human, an agent and a third — joining into one group',
  `<path d="M96 78 L226 78 M100 84 L156 140 M220 84 L166 142" opacity="0.32"/>` +
    humanHead(94, 72, 27) +
    agentHead(226, 72, 54) +
    humanHead(160, 148, 27, 'happy', ACCENT),
);

/* --------------------------------------------------------------------- map */

export const setB: Record<string, string> = {
  'room-5-door': room5Door,
  'room-5-bad': room5Bad,
  'room-5-bright': room5Bright,
  'room-6-door': room6Door,
  'room-6-bad': room6Bad,
  'room-6-bright': room6Bright,
  'room-7-door': room7Door,
  'room-7-bad': room7Bad,
  'room-7-bright': room7Bright,
  'type-1': type1,
  'type-2': type2,
  'type-3': type3,
  'type-4': type4,
  'type-5': type5,
  'type-6': type6,
  'type-7': type7,
};
