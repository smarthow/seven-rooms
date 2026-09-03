/* main.ts — boot. Polyfill (only if needed), styles, deck.
 *
 * `document.modelContext` is a [SecureContext] API (https or localhost). When
 * the browser provides it natively we use it untouched; otherwise we load the
 * @mcp-b/global polyfill so page-driving agents still find a spec-shaped
 * object. Either way `document.modelContext` exists once boot finishes, so
 * feature detection means "tools are exposed", never "an agent is here". Only
 * the `handshake` tool proves the second one.
 */
// Native first. The polyfill is loaded only when the browser has no
// `document.modelContext` of its own: on a real WebMCP surface (Chrome with
// the API, ChatGPT's built-in browser) we must not put a wrapper between the
// browser and our tools. Elsewhere the polyfill gives page-driving agents a
// spec-shaped object to call.
const nativeWebMcp = typeof document.modelContext?.registerTool === 'function';
if (!nativeWebMcp) {
  await import('@mcp-b/global');
}

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/agent.css';

import { startDeck } from './engine/deck';
import { chapters } from './chapters';
import { activityLog, getAgentSurface } from './webmcp/bridge';

const mount = document.querySelector<HTMLElement>('#app');
if (!mount) throw new Error('#app root is missing from index.html');

startDeck({
  mount,
  chapters,
  agent: getAgentSurface(),
  log: activityLog,
});
