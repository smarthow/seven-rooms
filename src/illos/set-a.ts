/* set-a.ts — illustrations for the intro, the ending, and rooms 1–4.
 *
 * Hand-drawn / flat, one consistent ink weight (2.5px in final user units),
 * palette-only fills, no text inside the SVG. See docs/ILLO_STYLE.md.
 * The two actors are reused from engine/characters.ts at the same proportions
 * (human: round coral head; agent: teal rounded square with a visor eye) —
 * `humanFig` / `agentFig` below are those exact paths, scaled, with the stroke
 * widths divided by the scale so the ink stays 2.5px everywhere.
 */

const INK = '#1f1d1a';
const PAPER = '#f6f1e7';
const DEEP = '#efe7d8';
const CARD = '#fffdf8';
const ACCENT = '#e8632b';
const AGENT = '#1f8a8a';
const HUMAN = '#d95f5f';
const DANGER = '#b3261e';
const GOOD = '#2e7d4f';
const FAINT = '#8d867d';

/** ink stroke attrs */
const ink = (w = 2.5): string =>
  `fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
/** filled shape with ink outline */
const fill = (c: string, w = 2.5): string =>
  `fill="${c}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
/** coloured stroke, no fill (attribute order matters: never duplicate `stroke`) */
const line = (c: string, w = 2.5, extra = ''): string =>
  `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}`;

type Mood = 'happy' | 'surprised' | 'worried';
type State = 'idle' | 'thinking' | 'done';

/** shared stroke attrs hoisted onto a character group, so children stay terse */
const CAPS = 'stroke-linecap="round" stroke-linejoin="round"';

/** The human from characters.ts (80×104 box) placed at x,y and scaled by s. */
function humanFig(x: number, y: number, s: number, mood: Mood = 'happy'): string {
  const k = (n: number): string => (n / s).toFixed(2);
  const st = (w: number): string => `fill="none" stroke="${INK}" stroke-width="${k(w)}"`;
  const fl = `fill="${HUMAN}" stroke="${INK}" stroke-width="${k(2.5)}"`;
  const eyeR = mood === 'surprised' ? 5 : 3.6;
  const face =
    mood === 'happy'
      ? `<path d="M30 55 Q40 64.5 50 55" ${st(3)}/>`
      : mood === 'surprised'
        ? `<circle cx="40" cy="57" r="5.5" ${st(3)}/>`
        : `<path d="M20 25 L31 29M60 25 L49 29" ${st(2.6)}/><path d="M30 60 Q40 51.5 50 60" ${st(3)}/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})" ${CAPS}>
<path d="M22 96 L21.6 78M58 96 L58.4 78" ${st(3)}/>
<rect x="20" y="72" width="40" height="12" rx="6" ${fl}/>
<circle cx="40" cy="42" r="32" ${fl}/>
<circle cx="29" cy="38" r="${eyeR}" fill="${INK}"/><circle cx="51" cy="38" r="${eyeR}" fill="${INK}"/>
${face}</g>`;
}

/** The agent from characters.ts (80×104 box) placed at x,y and scaled by s. */
function agentFig(x: number, y: number, s: number, state: State = 'idle'): string {
  const k = (n: number): string => (n / s).toFixed(2);
  const st = (w: number): string => `fill="none" stroke="${INK}" stroke-width="${k(w)}"`;
  const fl = `fill="${AGENT}" stroke="${INK}" stroke-width="${k(2.5)}"`;
  const pupil =
    state === 'done'
      ? `<path d="M32 41 L38 46 L50 35" fill="none" stroke="${AGENT}" stroke-width="${k(3.4)}"/>`
      : `<circle cx="${state === 'thinking' ? 31 : 40}" cy="41" r="3.4" fill="${AGENT}"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})" ${CAPS}>
<path d="M22 96 L21.6 80M58 96 L58.4 80" ${st(3)}/>
<rect x="20" y="72" width="40" height="12" rx="6" ${fl}/>
<path d="M40 14 L40 6" ${st(2.5)}/><circle cx="40" cy="4" r="3.2" fill="${INK}"/>
<rect x="10" y="14" width="60" height="48" rx="16" ${fl}/>
<rect x="20" y="34" width="40" height="14" rx="7" fill="${CARD}" stroke="${INK}" stroke-width="${k(2.5)}"/>
${pupil}
<path d="M28 55 L52 55" ${st(2.4)} opacity="0.55"/></g>`;
}

/** ghost variant of the agent: dotted outline, translucent teal */
function ghostFig(x: number, y: number, s: number): string {
  const k = (n: number): string => (n / s).toFixed(2);
  const dash = `stroke-dasharray="${k(6)} ${k(5)}"`;
  const g = `fill="${AGENT}" fill-opacity="0.16" stroke="${AGENT}" stroke-width="${k(2.5)}" ${dash}`;
  return `<g transform="translate(${x} ${y}) scale(${s})" ${CAPS}>
<path d="M22 96 L21.6 80M58 96 L58.4 80" fill="none" stroke="${AGENT}" stroke-width="${k(3)}" ${dash}/>
<rect x="20" y="72" width="40" height="12" rx="6" ${g}/>
<path d="M40 14 L40 6" fill="none" stroke="${AGENT}" stroke-width="${k(2.5)}"/><circle cx="40" cy="4" r="3.2" fill="${AGENT}" fill-opacity="0.55"/>
<rect x="10" y="14" width="60" height="48" rx="16" ${g}/>
<rect x="20" y="34" width="40" height="14" rx="7" fill="${CARD}" fill-opacity="0.7" stroke="${AGENT}" stroke-width="${k(2.5)}"/>
<circle cx="40" cy="41" r="3.4" fill="${AGENT}" fill-opacity="0.7"/></g>`;
}

function svg(label: string, body: string): string {
  return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">${body}</svg>`;
}

/** murky background used by every "bad future" scene */
const gloom = `<rect x="0" y="0" width="320" height="200" fill="${DEEP}"/>`;
const gloomTop = `<rect x="0" y="0" width="320" height="200" fill="${INK}" opacity="0.07"/>`;

/* ------------------------------------------------------------------ scenes */

const introChoiceAgent = svg(
  'a person handing a small glowing tool to their agent through a browser window',
  `<rect x="0" y="0" width="320" height="200" fill="${PAPER}"/>
<rect x="132" y="30" width="176" height="142" rx="11" ${fill(CARD)}/>
<path d="M132.5 54 L307 53" ${ink()}/>
<circle cx="146" cy="42" r="4" fill="${HUMAN}"/><circle cx="161" cy="42" r="4" fill="${ACCENT}"/><circle cx="176" cy="42" r="4" fill="${AGENT}"/>
${agentFig(214, 74, 0.68, 'idle')}
${humanFig(4, 92, 0.52)}
<path d="M42 124 Q68 120 90 119" ${ink()}/>
<circle cx="97" cy="118" r="8" ${fill(HUMAN)}/>
<g transform="rotate(-13 118 112)">
<path d="M118 112 L158 112" ${ink(5)}/>
<path d="M144 112 L144 126 M157 112 L157 127" ${ink(3.4)}/>
<circle cx="112" cy="112" r="11" ${fill(ACCENT)}/>
<circle cx="112" cy="112" r="4" ${fill(CARD)}/>
</g>
<path d="M112 92 L110 82 M136 96 L144 88 M92 96 L84 90" ${line(ACCENT)}/>
<path d="M10 174 Q160 168 310 174" ${ink()} opacity="0.35"/>`,
);

const introChoiceGhost = svg(
  'a translucent, dotted-outline ghost agent waving hello',
  `<rect x="0" y="0" width="320" height="200" fill="${PAPER}"/>
${ghostFig(118, 48, 1)}
<path d="M124 126 Q96 120 84 88" fill="none" stroke="${AGENT}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="6 5"/>
<circle cx="79" cy="79" r="10" fill="${AGENT}" fill-opacity="0.16" stroke="${AGENT}" stroke-width="2.5" stroke-dasharray="6 5"/>
<path d="M58 66 Q48 54 52 40 M42 78 Q28 68 28 50" fill="none" stroke="${AGENT}" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/>
<circle cx="248" cy="74" r="3.6" fill="${AGENT}" opacity="0.45"/><circle cx="266" cy="102" r="2.8" fill="${AGENT}" opacity="0.32"/><circle cx="240" cy="124" r="2.2" fill="${AGENT}" opacity="0.26"/>
<path d="M104 182 Q170 176 232 182" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="7 7" opacity="0.3"/>`,
);

const endingWalls = svg(
  'the agent shut outside a closed door while the human reads alone inside',
  `<rect x="0" y="0" width="320" height="200" fill="${PAPER}"/>
<rect x="178" y="0" width="142" height="200" fill="${DEEP}"/>
<rect x="178" y="0" width="142" height="200" fill="${INK}" opacity="0.06"/>
<rect x="104" y="0" width="76" height="200" fill="${DEEP}" stroke="${INK}" stroke-width="2.5"/>
<path d="M104 40 L180 40M104 76 L180 76M104 112 L180 112M104 148 L180 148M142 0 L142 40M158 76 L158 112M150 148 L150 200" ${ink(2)} opacity="0.35"/>
<rect x="112" y="44" width="60" height="146" rx="5" ${fill(CARD)}/>
<rect x="122" y="56" width="40" height="50" rx="4" ${ink(2)} opacity="0.45"/>
<rect x="122" y="140" width="40" height="40" rx="4" ${ink(2)} opacity="0.45"/>
<path d="M112 120 L172 120" ${ink()}/>
<circle cx="164" cy="130" r="5" ${fill(ACCENT)}/>
${agentFig(18, 88, 0.62, 'idle')}
<path d="M62 116 Q82 114 94 120" ${ink()}/>
<circle cx="100" cy="123" r="7" ${fill(AGENT)}/>
<path d="M48 74 L42 64 M68 80 L78 72" ${line(FAINT)}/>
${humanFig(190, 86, 0.6, 'worried')}
<g transform="rotate(6 262 134)">
<path d="M238 124 Q260 116 282 124 L282 154 Q260 146 238 154 Z" ${fill(CARD)}/>
<path d="M260 120 L260 150" ${ink()}/>
</g>
<path d="M184 190 Q250 186 316 190" ${ink()} opacity="0.35"/>
<path d="M6 186 Q52 182 98 186" ${ink()} opacity="0.35"/>`,
);

const endingReport = svg(
  'a report card on a clipboard with four check marks and one cross',
  `<rect x="0" y="0" width="320" height="200" fill="${PAPER}"/>
<g transform="rotate(-2 160 100)">
<rect x="72" y="22" width="176" height="160" rx="9" ${fill(CARD)}/>
<rect x="138" y="12" width="44" height="20" rx="6" ${fill(ACCENT)}/>
<path d="M92 52 L100 61 L116 40" fill="none" stroke="${GOOD}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M126 51 L228 50" ${ink(3)} opacity="0.45"/>
<path d="M92 84 L100 93 L116 72" fill="none" stroke="${GOOD}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M126 83 L212 82" ${ink(3)} opacity="0.45"/>
<path d="M92 116 L100 125 L116 104" fill="none" stroke="${GOOD}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M126 115 L224 114" ${ink(3)} opacity="0.45"/>
<path d="M91 138 L113 160 M113 138 L91 160" fill="none" stroke="${DANGER}" stroke-width="3.6" stroke-linecap="round"/>
<path d="M126 149 L204 148" ${ink(3)} opacity="0.45"/>
</g>`,
);

/* --------------------------------------------------------------- room 1 */

const room1Door = svg(
  'a clock beside a newspaper whose page is half filled with ad boxes',
  `<rect x="0" y="0" width="320" height="200" fill="${PAPER}"/>
<g transform="rotate(-3 224 102)">
<rect x="158" y="46" width="130" height="112" rx="7" ${fill(CARD)}/>
<path d="M168 62 L276 61" ${ink(5)}/>
<path d="M168 78 L230 78 M168 90 L226 90" ${ink(3)} opacity="0.45"/>
<rect x="236" y="72" width="42" height="30" rx="4" ${fill(ACCENT)}/>
<path d="M168 108 L252 107 M168 120 L244 120" ${ink(3)} opacity="0.45"/>
<rect x="168" y="130" width="58" height="20" rx="4" ${fill(ACCENT)}/>
<path d="M236 132 L278 132 M236 144 L268 144" ${ink(3)} opacity="0.45"/>
</g>
<circle cx="76" cy="100" r="46" ${fill(CARD)}/>
<path d="M76 60 L76 68 M116 100 L108 100 M76 140 L76 132 M36 100 L44 100" ${ink()}/>
<path d="M76 100 L76.5 70" ${ink(3.4)}/>
<path d="M76 100 L100 110" fill="none" stroke="${ACCENT}" stroke-width="3.4" stroke-linecap="round"/>
<circle cx="76" cy="100" r="4.4" fill="${INK}"/>`,
);

const room1Bad = svg(
  'a newspaper locked behind a paywall gate with the agent shut out',
  `${gloom}
<rect x="144" y="40" width="146" height="120" rx="7" ${fill(CARD)}/>
<path d="M154 58 L280 57" ${ink(5.5)}/>
<path d="M154 76 L206 76 M154 88 L202 88 M154 100 L208 100 M154 112 L198 112" ${ink(3)} opacity="0.5"/>
<rect x="220" y="72" width="58" height="34" rx="4" ${fill(FAINT)}/>
<path d="M154 130 L272 130 M154 144 L246 144" ${ink(3)} opacity="0.5"/>
<path d="M128 24 L300 24 M128 176 L300 176" ${line(DANGER, 4.5)}/>
<path d="M140 24 L140 176 M176 24 L176.8 176 M212 24 L211.4 176 M248 24 L248.6 176 M284 24 L284 176" ${line(DANGER, 4.5)}/>
<rect x="192" y="88" width="40" height="32" rx="7" fill="${DANGER}" stroke="${INK}" stroke-width="2.5"/>
<path d="M201 88 Q212 68 223 88" ${ink(3.4)}/>
<circle cx="212" cy="102" r="4.6" ${fill(CARD)}/>
${agentFig(28, 90, 0.64, 'thinking')}
<path d="M72 116 Q98 114 116 120" ${ink()}/>
<circle cx="122" cy="122" r="7" ${fill(AGENT)}/>
<path d="M60 76 L54 66 M82 80 L92 72" fill="none" stroke="${DANGER}" stroke-width="2.5" stroke-linecap="round"/>
${gloomTop}`,
);

const room1Bright = svg(
  'the agent dropping a coin straight into a writer’s open hand',
  `<rect x="0" y="0" width="320" height="200" fill="${PAPER}"/>
${agentFig(24, 82, 0.64, 'done')}
${humanFig(216, 82, 0.64)}
<path d="M68 112 Q92 104 108 100" ${ink()}/>
<circle cx="114" cy="98" r="7" ${fill(AGENT)}/>
<path d="M258 114 Q236 112 216 122" ${ink()}/>
<path d="M204 116 Q196 128 208 132 Q216 134 218 124" ${fill(HUMAN)}/>
<path d="M130 92 Q158 78 186 98" fill="none" stroke="${GOOD}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="5 6"/>
<circle cx="158" cy="82" r="15" ${fill(ACCENT)}/>
<circle cx="158" cy="82" r="8" fill="none" stroke="${INK}" stroke-width="2.5"/>
<path d="M190 104 L198 112" fill="none" stroke="${GOOD}" stroke-width="2.5" stroke-linecap="round"/>
<path d="M148 54 L146 44 M176 58 L184 50 M132 60 L124 54" fill="none" stroke="${GOOD}" stroke-width="2.5" stroke-linecap="round"/>
<path d="M14 172 Q160 166 306 172" ${ink()} opacity="0.35"/>`,
);

/* --------------------------------------------------------------- room 2 */

const room2Door = svg(
  'a coin falling through a funnel next to a “most popular” ribbon',
  `<rect x="0" y="0" width="320" height="200" fill="${PAPER}"/>
<circle cx="128" cy="30" r="13" ${fill(ACCENT)}/>
<circle cx="128" cy="30" r="7" fill="none" stroke="${INK}" stroke-width="2.5"/>
<path d="M128 46 L128 58" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="4 6"/>
<path d="M66 64 Q128 58 190 64 L142 122 L142 144 L114 144 L114 122 Z" ${fill(CARD)}/>
<path d="M70 78 Q128 72 186 78" ${ink()} opacity="0.4"/>
<path d="M128 152 L128 162" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="4 6"/>
<circle cx="128" cy="178" r="13" ${fill(ACCENT)}/>
<circle cx="128" cy="178" r="7" fill="none" stroke="${INK}" stroke-width="2.5"/>
<g transform="rotate(-7 252 62)">
<path d="M204 34 L302 38 L286 62 L302 88 L204 84 Z" ${fill(ACCENT)}/>
<path d="M216 52 L276 54 M216 68 L258 69" ${line(CARD, 3.4)}/>
</g>`,
);

const room2Bad = svg(
  'a funnel with a whispering mouth muttering false prices at the agent',
  `${gloom}
<path d="M28 56 Q86 50 144 56 L102 110 L102 132 L74 132 L74 110 Z" ${fill(CARD)}/>
<path d="M32 70 Q86 64 140 70" ${ink()} opacity="0.35"/>
<path d="M60 88 Q72 96 84 88 Q96 80 108 88" ${line(DANGER, 3)}/>
<g transform="rotate(-8 152 112)">
<path d="M124 112 Q152 90 180 110 Q152 134 124 112 Z" ${fill(DANGER)}/>
<path d="M131 110 L172 108" ${line(CARD, 2.4)}/>
</g>
<path d="M192 94 Q202 112 192 130 M208 86 Q222 112 208 138 M224 78 Q242 112 224 146" ${line(DANGER)}/>
${agentFig(234, 80, 0.66, 'thinking')}
<path d="M252 62 L246 50" fill="none" stroke="${DANGER}" stroke-width="2.5" stroke-linecap="round"/>
<circle cx="243" cy="44" r="3" fill="${DANGER}"/>
<path d="M290 66 L298 56" fill="none" stroke="${DANGER}" stroke-width="2.5" stroke-linecap="round"/>
<path d="M14 178 Q160 172 306 178" ${ink()} opacity="0.3"/>
${gloomTop}`,
);

const room2Bright = svg(
  'a plain honest price tag standing while the funnel lies discarded',
  `<rect x="0" y="0" width="320" height="200" fill="${PAPER}"/>
<g opacity="0.5" transform="translate(30 178) rotate(-96)">
<path d="M0 0 Q40 -7 80 0 L52 44 L52 64 L28 64 L28 44 Z" fill="${DEEP}" stroke="${FAINT}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
<path d="M4 12 Q40 6 76 12" fill="none" stroke="${FAINT}" stroke-width="2" stroke-linecap="round"/>
</g>
<path d="M40 88 Q32 78 36 66 M62 82 Q58 70 66 60" ${line(FAINT)} opacity="0.5"/>
<g transform="rotate(-7 200 100)">
<path d="M132 44 L272 46 Q288 46 288 62 L288 138 Q288 154 272 154 L132 156 L108 100 Z" ${fill(CARD)}/>
<circle cx="140" cy="100" r="10" ${fill(GOOD)}/>
<path d="M170 78 L262 78" fill="none" stroke="${GOOD}" stroke-width="7" stroke-linecap="round"/>
<path d="M170 104 L240 104 M170 124 L216 124" ${ink(3)} opacity="0.4"/>
</g>
<path d="M92 66 Q78 56 80 40" ${ink()} opacity="0.4"/>
<path d="M74 40 L80 34 L88 40" ${ink()} opacity="0.4"/>`,
);

/* --------------------------------------------------------------- room 3 */

const room3Door = svg(
  'a padlock hanging on a three-drawer filing cabinet',
  `<rect x="0" y="0" width="320" height="200" fill="${PAPER}"/>
<rect x="90" y="26" width="140" height="152" rx="8" ${fill(CARD)}/>
<path d="M90 76 L230 75 M90 126 L230 127" ${ink()}/>
<path d="M138 52 L182 52 M138 152 L182 152" ${ink(5)} opacity="0.6"/>
<path d="M100 34 L100 170" ${ink(2)} opacity="0.25"/>
<path d="M148 88 Q160 62 172 88" ${ink(4)}/>
<rect x="126" y="86" width="68" height="52" rx="10" ${fill(ACCENT)}/>
<circle cx="160" cy="106" r="7" ${fill(CARD)}/>
<path d="M160 113 L160 124" ${ink(3.4)}/>
<path d="M18 178 Q160 172 302 178" ${ink()} opacity="0.35"/>`,
);

const room3Bad = svg(
  'the locked cabinet with a no-export sign while the human waits, exhausted',
  `${gloom}
<rect x="34" y="28" width="126" height="150" rx="8" ${fill(CARD)}/>
<path d="M34 78 L160 77 M34 128 L160 129" ${ink()}/>
<path d="M78 54 L118 54 M78 154 L118 154" ${ink(5)} opacity="0.5"/>
<path d="M85 92 Q97 68 109 92" ${ink(4)}/>
<rect x="66" y="90" width="62" height="48" rx="10" fill="${DANGER}" stroke="${INK}" stroke-width="2.5"/>
<circle cx="97" cy="108" r="6.5" ${fill(CARD)}/>
<path d="M97 115 L97 125" ${ink(3.2)}/>
<path d="M172 104 L212 104" fill="none" stroke="${DANGER}" stroke-width="3.4" stroke-linecap="round"/>
<path d="M204 96 L214 104 L204 112" fill="none" stroke="${DANGER}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="196" cy="104" r="27" fill="none" stroke="${DANGER}" stroke-width="4"/>
<path d="M177 85 L215 123" fill="none" stroke="${DANGER}" stroke-width="4" stroke-linecap="round"/>
${humanFig(240, 96, 0.58, 'worried')}
<path d="M256 82 Q262 72 254 66 M276 78 Q284 68 276 60" fill="none" stroke="${FAINT}" stroke-width="2.5" stroke-linecap="round"/>
<path d="M226 178 Q272 174 314 178" ${ink()} opacity="0.3"/>
${gloomTop}`,
);

const room3Bright = svg(
  'the agent carrying a small suitcase of data from one open door to another',
  `<rect x="0" y="0" width="320" height="200" fill="${PAPER}"/>
<rect x="4" y="32" width="76" height="148" ${fill(DEEP)}/>
<rect x="13" y="41" width="58" height="139" rx="4" ${fill(CARD)}/>
<rect x="23" y="53" width="38" height="50" rx="3" ${ink(2)} opacity="0.4"/>
<circle cx="62" cy="122" r="5" ${fill(GOOD)}/>
<rect x="240" y="32" width="76" height="148" ${fill(DEEP)}/>
<rect x="249" y="41" width="58" height="139" rx="4" ${fill(CARD)}/>
<rect x="259" y="53" width="38" height="50" rx="3" ${ink(2)} opacity="0.4"/>
<circle cx="258" cy="122" r="5" ${fill(GOOD)}/>
<path d="M86 40 Q160 12 234 40" fill="none" stroke="${GOOD}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="6 7"/>
<path d="M223 31 L236 41 L224 48" fill="none" stroke="${GOOD}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
${agentFig(96, 84, 0.62, 'idle')}
<path d="M134 116 Q152 118 162 124" ${ink()}/>
<rect x="158" y="124" width="60" height="44" rx="6" ${fill(CARD)}/>
<path d="M173 124 Q188 108 203 124" ${ink()}/>
<path d="M158 141 L218 141" ${ink()} opacity="0.4"/>
<rect x="179" y="134" width="18" height="13" rx="3" ${fill(GOOD)}/>
<path d="M18 186 Q160 180 302 186" ${ink()} opacity="0.35"/>`,
);

/* --------------------------------------------------------------- room 4 */

const room4Door = svg(
  'two hands haggling over a price tag',
  `<rect x="0" y="0" width="320" height="200" fill="${PAPER}"/>
<g transform="rotate(-6 160 100)">
<path d="M118 58 L212 60 Q226 60 226 74 L226 128 Q226 142 212 142 L118 144 L96 101 Z" ${fill(ACCENT)}/>
<circle cx="126" cy="101" r="10" ${fill(CARD)}/>
<path d="M152 86 L208 86 M152 108 L192 108" ${line(CARD, 3)}/>
</g>
<path d="M-6 106 L34 107 L34 133 L-6 132 Z" ${fill(HUMAN)}/>
<rect x="26" y="94" width="42" height="46" rx="15" ${fill(HUMAN)}/>
<path d="M32 142 Q22 152 34 155 Q44 156 46 146" ${fill(HUMAN)}/>
<path d="M68 102 Q76 110 68 118 Q76 126 68 133" ${ink(2.4)}/>
<path d="M42 108 L60 108 M42 120 L60 120" ${ink(2.2)} opacity="0.4"/>
<path d="M326 78 L286 79 L286 105 L326 104 Z" ${fill(AGENT)}/>
<rect x="252" y="66" width="42" height="46" rx="15" ${fill(AGENT)}/>
<path d="M288 62 Q298 52 286 49 Q276 48 274 58" ${fill(AGENT)}/>
<path d="M252 74 Q244 82 252 90 Q244 98 252 105" ${ink(2.4)}/>
<path d="M260 80 L278 80 M260 92 L278 92" ${ink(2.2)} opacity="0.4"/>
<path d="M96 60 L86 50 M234 150 L246 160" ${ink()} opacity="0.4"/>`,
);

const room4Bad = svg(
  'a small buyer’s agent facing a towering, better-funded seller agent',
  `${gloom}
${agentFig(194, 44, 1.18, 'idle')}
${agentFig(24, 120, 0.42, 'thinking')}
<path d="M186 116 Q140 134 92 146" ${line(DANGER, 3.4)}/>
<path d="M106 136 L90 147 L107 155" ${line(DANGER, 3.4)}/>
<path d="M208 50 L198 36 M272 50 L284 38" ${line(DANGER)}/>
<ellipse cx="150" cy="178" rx="30" ry="8" fill="${DANGER}" stroke="${INK}" stroke-width="2.5"/>
<ellipse cx="150" cy="166" rx="30" ry="8" fill="${DANGER}" stroke="${INK}" stroke-width="2.5"/>
<ellipse cx="150" cy="154" rx="30" ry="8" fill="${DANGER}" stroke="${INK}" stroke-width="2.5"/>
${gloomTop}`,
);

const room4Bright = svg(
  'a balanced scale with an equal agent standing on each pan',
  `<rect x="0" y="0" width="320" height="200" fill="${PAPER}"/>
<path d="M48 46 L272 47" fill="none" stroke="${GOOD}" stroke-width="6" stroke-linecap="round"/>
<path d="M160 47 L160 162" ${ink(4)}/>
<path d="M126 178 L160 158 L194 178 Z" ${fill(GOOD)}/>
<path d="M126 178 L194 178" ${ink()}/>
<circle cx="160" cy="42" r="7" ${fill(GOOD)}/>
<path d="M60 50 L48 108 M60 50 L74 108" ${ink(2.2)}/>
<path d="M28 110 Q60 130 92 110 Z" ${fill(CARD)}/>
<path d="M28 110 L92 110" ${ink()}/>
<path d="M254 50 L242 108 M254 50 L268 108" ${ink(2.2)}/>
<path d="M222 110 Q254 130 286 110 Z" ${fill(CARD)}/>
<path d="M222 110 L286 110" ${ink()}/>
${agentFig(43, 66, 0.42, 'done')}
${agentFig(237, 66, 0.42, 'done')}
<path d="M104 110 L136 110 M184 110 L216 110" fill="none" stroke="${GOOD}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="5 6"/>`,
);

export const setA: Record<string, string> = {
  'intro-choice-agent': introChoiceAgent,
  'intro-choice-ghost': introChoiceGhost,
  'ending-walls': endingWalls,
  'ending-report': endingReport,
  'room-1-door': room1Door,
  'room-1-bad': room1Bad,
  'room-1-bright': room1Bright,
  'room-2-door': room2Door,
  'room-2-bad': room2Bad,
  'room-2-bright': room2Bright,
  'room-3-door': room3Door,
  'room-3-bad': room3Bad,
  'room-3-bright': room3Bright,
  'room-4-door': room4Door,
  'room-4-bad': room4Bad,
  'room-4-bright': room4Bright,
};
