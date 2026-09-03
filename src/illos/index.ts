/* illos — one registry of inline-SVG illustrations, keyed by slot name.
 *
 * Slots are listed in docs/ILLO_STYLE.md. The drawings live in two files so
 * two people can add to them without colliding; this file just merges them.
 * `getIllo` returns the SVG markup string, or undefined when a slot is still
 * empty — callers must render nothing in that case, never a broken box.
 */
import { setA } from './set-a';
import { setB } from './set-b';

const all: Record<string, string> = { ...setA, ...setB };

export function getIllo(name: string): string | undefined {
  return all[name];
}
