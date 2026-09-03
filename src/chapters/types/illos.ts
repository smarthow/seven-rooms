/* chapters/types/illos.ts — seven tiny animated illustrations, one per site type.
 *
 * Pure inline SVG with SMIL <animate>. No libraries, no image files, no CSS
 * beyond the `.illo` box in components.css. Each one is short on purpose: it is
 * a doodle, not a diagram.
 */

const INK = 'var(--ink)';
const ACCENT = 'var(--accent)';
const AGENT = 'var(--agent)';
const HUMAN = 'var(--human)';
const PAPER = 'var(--paper-card)';

const svg = (label: string, body: string): string =>
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">${body}</svg>`;

/** 1. Attention — a clock whose face fills up, second by second. */
export const clockFilling = (): string =>
  svg(
    'a clock face slowly filling up',
    `<circle cx="50" cy="52" r="30" fill="${PAPER}" stroke="${INK}" stroke-width="3.5"/>
     <path d="M50 52 L50 22 A30 30 0 0 1 50 82 A30 30 0 0 1 50 22 Z" fill="${ACCENT}" opacity="0.25"
           stroke="none" transform="rotate(0 50 52)"/>
     <circle cx="50" cy="52" r="26" fill="none" stroke="${ACCENT}" stroke-width="8"
             stroke-dasharray="163" stroke-dashoffset="163" transform="rotate(-90 50 52)" stroke-linecap="round">
       <animate attributeName="stroke-dashoffset" values="163;0;163" dur="5s" repeatCount="indefinite"/>
     </circle>
     <line x1="50" y1="52" x2="50" y2="34" stroke="${INK}" stroke-width="3.5" stroke-linecap="round">
       <animateTransform attributeName="transform" type="rotate" values="0 50 52;360 50 52" dur="2.5s" repeatCount="indefinite"/>
     </line>
     <circle cx="50" cy="52" r="3.4" fill="${INK}"/>
     <path d="M42 18 L58 18" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`,
  );

/** 2. Funnels — a funnel that swallows many and drips out one. */
export const funnel = (): string =>
  svg(
    'a funnel: many go in, one drips out',
    `<path d="M16 20 L84 20 L58 56 L58 76 L42 76 L42 56 Z" fill="${PAPER}" stroke="${INK}" stroke-width="3.5"
           stroke-linejoin="round"/>
     <circle cx="34" cy="12" r="5" fill="${HUMAN}" stroke="${INK}" stroke-width="2.5">
       <animate attributeName="cy" values="12;30" dur="1.8s" repeatCount="indefinite"/>
       <animate attributeName="opacity" values="1;1;0" dur="1.8s" repeatCount="indefinite"/>
     </circle>
     <circle cx="50" cy="10" r="5" fill="${HUMAN}" stroke="${INK}" stroke-width="2.5">
       <animate attributeName="cy" values="10;30" dur="1.8s" begin="0.6s" repeatCount="indefinite"/>
       <animate attributeName="opacity" values="1;1;0" dur="1.8s" begin="0.6s" repeatCount="indefinite"/>
     </circle>
     <circle cx="66" cy="12" r="5" fill="${HUMAN}" stroke="${INK}" stroke-width="2.5">
       <animate attributeName="cy" values="12;30" dur="1.8s" begin="1.2s" repeatCount="indefinite"/>
       <animate attributeName="opacity" values="1;1;0" dur="1.8s" begin="1.2s" repeatCount="indefinite"/>
     </circle>
     <circle cx="50" cy="84" r="4" fill="${ACCENT}">
       <animate attributeName="cy" values="78;94" dur="1.8s" begin="0.9s" repeatCount="indefinite"/>
       <animate attributeName="opacity" values="1;0" dur="1.8s" begin="0.9s" repeatCount="indefinite"/>
     </circle>`,
  );

/** 3. Lock-in — a padlock that rattles but never opens. */
export const padlock = (): string =>
  svg(
    'a padlock that rattles but stays shut',
    `<g>
       <animateTransform attributeName="transform" type="rotate"
         values="0 50 60;-3 50 60;3 50 60;0 50 60" dur="2.4s" repeatCount="indefinite"/>
       <path d="M34 44 L34 32 A16 16 0 0 1 66 32 L66 44" fill="none" stroke="${INK}" stroke-width="4"
             stroke-linecap="round"/>
       <rect x="24" y="42" width="52" height="42" rx="10" fill="${ACCENT}" stroke="${INK}" stroke-width="3.5"/>
       <circle cx="50" cy="60" r="6" fill="${PAPER}" stroke="${INK}" stroke-width="3"/>
       <path d="M50 64 L50 73" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
     </g>`,
  );

/** 4. Marketplaces — two hands reaching for the same deal. */
export const twoHands = (): string =>
  svg(
    'two hands meeting over a deal',
    `<path d="M8 62 L30 62 L30 50 L44 58 L44 70 L8 70 Z" fill="${HUMAN}" stroke="${INK}" stroke-width="3"
           stroke-linejoin="round">
       <animate attributeName="opacity" values="1;0.75;1" dur="2.2s" repeatCount="indefinite"/>
     </path>
     <path d="M92 62 L70 62 L70 50 L56 58 L56 70 L92 70 Z" fill="${AGENT}" stroke="${INK}" stroke-width="3"
           stroke-linejoin="round"/>
     <circle cx="50" cy="34" r="13" fill="${PAPER}" stroke="${INK}" stroke-width="3.5"/>
     <text x="50" y="40" text-anchor="middle" font-family="var(--font-body)" font-size="15" font-weight="900"
           fill="${INK}">$</text>
     <g>
       <animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 0" dur="1.6s"
         repeatCount="indefinite"/>
       <path d="M46 52 L50 58 L54 52" fill="none" stroke="${ACCENT}" stroke-width="3" stroke-linecap="round"/>
     </g>`,
  );

/** 5. Creation — a pencil drawing a line, over and over. */
export const pencil = (): string =>
  svg(
    'a pencil drawing a line',
    `<path d="M14 82 L86 82" stroke="${INK}" stroke-width="2.4" opacity="0.25"/>
     <path d="M14 82 L86 82" fill="none" stroke="${ACCENT}" stroke-width="5" stroke-linecap="round"
           stroke-dasharray="72" stroke-dashoffset="72">
       <animate attributeName="stroke-dashoffset" values="72;0;0;72" dur="3.6s" repeatCount="indefinite"/>
     </path>
     <g transform="translate(14 0)">
       <animateTransform attributeName="transform" type="translate" values="14 0;86 0;86 0;14 0"
         dur="3.6s" repeatCount="indefinite"/>
       <g transform="rotate(28 0 74)">
         <rect x="-9" y="18" width="18" height="48" rx="4" fill="${AGENT}" stroke="${INK}" stroke-width="3"/>
         <rect x="-9" y="18" width="18" height="10" rx="3" fill="${INK}"/>
         <path d="M-9 66 L0 80 L9 66 Z" fill="${PAPER}" stroke="${INK}" stroke-width="3"
               stroke-linejoin="round"/>
         <path d="M-3 74 L3 74 L0 80 Z" fill="${INK}"/>
       </g>
     </g>`,
  );

/** 6. Verification — a stamp thumping down on a form. */
export const stamp = (): string =>
  svg(
    'a stamp pressing down on a form',
    `<rect x="18" y="66" width="64" height="24" rx="5" fill="${PAPER}" stroke="${INK}" stroke-width="3.5"/>
     <path d="M26 78 L48 78" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" opacity="0.5"/>
     <circle cx="66" cy="78" r="8" fill="${ACCENT}" opacity="0">
       <animate attributeName="opacity" values="0;0;1;1;0" dur="2.4s" repeatCount="indefinite"/>
     </circle>
     <g>
       <animateTransform attributeName="transform" type="translate" values="0 -14;0 -14;0 6;0 6;0 -14"
         dur="2.4s" repeatCount="indefinite"/>
       <rect x="52" y="48" width="28" height="14" rx="4" fill="${AGENT}" stroke="${INK}" stroke-width="3"/>
       <rect x="62" y="26" width="8" height="24" rx="4" fill="${INK}"/>
       <rect x="54" y="18" width="24" height="10" rx="5" fill="${INK}"/>
     </g>`,
  );

/** 7. Coordination — three dots drifting together into agreement. */
export const threeDots = (): string =>
  svg(
    'three dots drifting together',
    `<line x1="30" y1="34" x2="50" y2="66" stroke="${INK}" stroke-width="2.6" opacity="0.35"/>
     <line x1="70" y1="34" x2="50" y2="66" stroke="${INK}" stroke-width="2.6" opacity="0.35"/>
     <line x1="30" y1="34" x2="70" y2="34" stroke="${INK}" stroke-width="2.6" opacity="0.35"/>
     <circle cx="30" cy="34" r="10" fill="${HUMAN}" stroke="${INK}" stroke-width="3">
       <animate attributeName="cx" values="14;30;14" dur="3.2s" repeatCount="indefinite"/>
       <animate attributeName="cy" values="22;34;22" dur="3.2s" repeatCount="indefinite"/>
     </circle>
     <circle cx="70" cy="34" r="10" fill="${AGENT}" stroke="${INK}" stroke-width="3">
       <animate attributeName="cx" values="86;70;86" dur="3.2s" repeatCount="indefinite"/>
       <animate attributeName="cy" values="22;34;22" dur="3.2s" repeatCount="indefinite"/>
     </circle>
     <circle cx="50" cy="66" r="10" fill="${ACCENT}" stroke="${INK}" stroke-width="3">
       <animate attributeName="cy" values="86;66;86" dur="3.2s" repeatCount="indefinite"/>
     </circle>`,
  );

/** In chapter order: attention, funnels, lock-in, marketplaces, creation, verification, coordination. */
export const ILLOS: Array<() => string> = [
  clockFilling,
  funnel,
  padlock,
  twoHands,
  pencil,
  stamp,
  threeDots,
];
