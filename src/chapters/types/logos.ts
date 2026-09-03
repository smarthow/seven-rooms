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

function mark(icon: SimpleIcon): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', icon.title);
  svg.classList.add('logogrid__mark');
  svg.style.setProperty('--brand', `#${icon.hex}`);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', icon.path);
  svg.appendChild(path);
  // Simple Icons squeezes every mark into 24 × 24, so a wide wordmark (eBay,
  // Uber) comes out a third the size of a square icon. Once the path is on
  // screen, fit the viewBox to its real bounds so all marks fill the same box.
  requestAnimationFrame(() => {
    try {
      const b = path.getBBox();
      if (b.width > 0 && b.height > 0) {
        const pad = 0.4;
        svg.setAttribute('viewBox', `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`);
      }
    } catch {
      /* not rendered yet (hidden pane) — the 24 × 24 default is fine */
    }
  });
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
