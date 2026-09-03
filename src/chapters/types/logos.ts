/* chapters/types/logos.ts — six real examples per site type, as brand marks.
 *
 * The marks come from Simple Icons (CC0). They are drawn in ink to match the
 * hand-drawn look and take their brand colour on hover. Logos are trademarks
 * of their owners; they appear here only to identify examples of each type.
 * Only the marks we use are imported, so the bundle carries six paths per
 * slide and nothing else.
 */

import {
  siAirbnb,
  siAsana,
  siAuth0,
  siBlender,
  siBookingdotcom,
  siCloudflare,
  siDiscord,
  siDropbox,
  siEbay,
  siEtsy,
  siEvernote,
  siFigma,
  siGithub,
  siGmail,
  siGoogledocs,
  siHubspot,
  siIcloud,
  siInstagram,
  siIntercom,
  siLetsencrypt,
  siMailchimp,
  siMedium,
  siMiro,
  siNotion,
  siObsidian,
  siOkta,
  siQuickbooks,
  siReddit,
  siReplit,
  siShopify,
  siSquarespace,
  siStackoverflow,
  siStripe,
  siTiktok,
  siTrello,
  siTypeform,
  siUber,
  siUpwork,
  siWikipedia,
  siX,
  siYoutube,
  siYubico,
  type SimpleIcon,
} from 'simple-icons';
import { h } from '../../engine/ui';

/** Indexed like TYPES in ./index.ts: 0 = Attention … 6 = Coordination. */
export const LOGOS: SimpleIcon[][] = [
  [siYoutube, siTiktok, siInstagram, siReddit, siMedium, siX],
  [siShopify, siHubspot, siMailchimp, siSquarespace, siTypeform, siIntercom],
  [siNotion, siDropbox, siGmail, siEvernote, siIcloud, siQuickbooks],
  [siEbay, siAirbnb, siUber, siUpwork, siEtsy, siBookingdotcom],
  [siFigma, siGoogledocs, siMiro, siBlender, siObsidian, siReplit],
  [siOkta, siAuth0, siStripe, siYubico, siLetsencrypt, siCloudflare],
  [siWikipedia, siGithub, siDiscord, siTrello, siAsana, siStackoverflow],
];

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEWBOX_PAD = 0.4;

/* Simple Icons squeezes every mark into 24 × 24, so a wide wordmark (eBay,
 * Uber) comes out a third the size of a square icon unless the viewBox is
 * fitted to the path's real bounds. `getBBox()` only answers for a *rendered*
 * element, and a mark built for a slide that is still transitioning in is not
 * rendered yet: measuring there returned zeros, the `catch` swallowed it, and
 * the mark stayed squeezed until something later forced a refit. So measure
 * against a ruler that is always rendered, once per path, before first paint.
 */
const viewBoxCache = new Map<string, string>();
let ruler: SVGSVGElement | null = null;

function measuringRuler(): SVGSVGElement | null {
  if (ruler) return ruler;
  if (!document.body) return null;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  // Rendered — so getBBox answers — but invisible and out of flow. NOT
  // `display: none`, which would make it unrendered and useless here.
  svg.style.cssText =
    'position:absolute;left:-9999px;top:0;width:24px;height:24px;opacity:0;pointer-events:none';
  document.body.appendChild(svg);
  ruler = svg;
  return ruler;
}

/** The viewBox that makes this mark fill its box. Falls back to 24 × 24. */
function viewBoxFor(icon: SimpleIcon): string {
  const cached = viewBoxCache.get(icon.path);
  if (cached) return cached;
  const host = measuringRuler();
  if (!host) return '0 0 24 24';
  const probe = document.createElementNS(SVG_NS, 'path');
  probe.setAttribute('d', icon.path);
  host.appendChild(probe);
  try {
    const b = probe.getBBox();
    if (b.width > 0 && b.height > 0) {
      const box = `${b.x - VIEWBOX_PAD} ${b.y - VIEWBOX_PAD} ${b.width + VIEWBOX_PAD * 2} ${b.height + VIEWBOX_PAD * 2}`;
      // Only a real measurement is cached, so a failure here retries later
      // rather than freezing every mark at the square default.
      viewBoxCache.set(icon.path, box);
      return box;
    }
  } catch {
    /* no answer from the layout engine — the square default still draws. */
  } finally {
    probe.remove();
  }
  return '0 0 24 24';
}

function mark(icon: SimpleIcon): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', viewBoxFor(icon));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', icon.title);
  svg.classList.add('logogrid__mark');
  svg.style.setProperty('--brand', `#${icon.hex}`);
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', icon.path);
  svg.appendChild(path);
  return svg;
}

/** A 3 × 2 grid of example sites for one type. */
export function logoGrid(typeIndex: number): HTMLElement {
  const icons = LOGOS[typeIndex] ?? [];
  return h(
    'div',
    { class: 'logogrid', role: 'list', 'aria-label': 'examples of this kind of site' },
    ...icons.map((icon) =>
      h(
        'div',
        { class: 'logogrid__cell', role: 'listitem', title: icon.title },
        mark(icon),
        h('span', { class: 'logogrid__name' }, icon.title),
      ),
    ),
  );
}
