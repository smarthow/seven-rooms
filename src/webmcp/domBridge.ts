/* domBridge.ts — a DOM-visible mirror of the WebMCP tool surface.
 *
 * Why this exists: browser-extension agents (ChatGPT's Chrome control, other
 * extension-based page drivers, Playwright-in-extension) often run their scripts
 * in an "isolated world". That world shares the DOM with the page but NOT its JavaScript
 * objects — so `document.modelContext`, set by page code, is undefined there.
 * A real visitor hit exactly this: "document.modelContext is undefined".
 *
 * The DOM crosses worlds. So we publish:
 *   1. a manifest: <script type="application/json" id="webmcp-manifest"> with
 *      every registered tool, refreshed on each register/unregister, plus
 *      data-webmcp-tools="a,b,c" on <html> for one-line discovery;
 *   2. a call channel: an agent inserts
 *        <script type="application/json" class="webmcp-call">
 *          {"id":"<unique>","name":"<tool>","args":{}}
 *        </script>
 *      anywhere in <body> (or sets data-webmcp-call="<same JSON>" on <html>).
 *      The page executes it through the SAME path a native agent uses and
 *      answers with <script type="application/json" id="webmcp-result-<id>">
 *      containing {"id","ok","result"} or {"id","ok":false,"error"}, and mirrors
 *      it as data-webmcp-result-<id> on <html>.
 *
 * Nothing here is a second execution path: calls go through `invoke`, which
 * is the bridge's `invokePageTool` — announce → execute → activity log.
 */

/** One tool as the manifest publishes it — everything a native agent sees. */
export interface DomBridgeTool {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** `readOnlyHint` / `untrustedContentHint`, when the tool sets them. */
  annotations?: Record<string, unknown>;
}

export interface DomBridgeDeps {
  list(): DomBridgeTool[];
  invoke(name: string, args: Record<string, unknown>): Promise<unknown>;
}

const MANIFEST_ID = 'webmcp-manifest';
const CALL_CLASS = 'webmcp-call';
const CALL_ATTR = 'data-webmcp-call';
const HOW_TO_CALL =
  'Insert <script type="application/json" class="webmcp-call">{"id":"<unique>","name":"<tool>","args":{}}</script> ' +
  'into document.body (or set data-webmcp-call on <html> to that JSON). Within ~100ms the page appends ' +
  '<script type="application/json" id="webmcp-result-<id>"> with {"id","ok","result"} or {"id","ok":false,"error"}, ' +
  'and mirrors it as data-webmcp-result-<id> on <html>. Your id is lower-cased and anything outside ' +
  '[a-z0-9_-] becomes "_", because HTML lower-cases attribute names — send a lower-case id and look for that exact id back. ' +
  'If document.modelContext is visible to you, prefer the ' +
  'standard WebMCP API instead: const tools = await document.modelContext.getTools(); ' +
  'await document.modelContext.executeTool(tools.find(t => t.name === "handshake"), {}) — it resolves to a JSON string; ' +
  'if that throws "Failed to parse input arguments" you are on the polyfill: pass JSON.stringify(args) instead of the object.';

let deps: DomBridgeDeps | null = null;
let observer: MutationObserver | null = null;

function manifestEl(): HTMLScriptElement {
  let el = document.getElementById(MANIFEST_ID) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/json';
    el.id = MANIFEST_ID;
    (document.head ?? document.documentElement).appendChild(el);
  }
  return el;
}

/** Rewrite the manifest from the live registry. Cheap; call on every change. */
export function syncDomManifest(tools: DomBridgeTool[]): void {
  if (typeof document === 'undefined') return;
  const names = tools.map((t) => t.name);
  manifestEl().textContent = JSON.stringify({
    protocol: 'webmcp-dom-bridge',
    version: 1,
    site: 'Seven Rooms',
    // Title and annotations included on purpose: an isolated-world agent must
    // not get less than a native one, least of all the readOnlyHint and
    // untrustedContentHint it would use to decide what is safe to call.
    tools: tools.map((t) => ({
      name: t.name,
      ...(t.title ? { title: t.title } : {}),
      description: t.description,
      inputSchema: t.inputSchema,
      ...(t.annotations ? { annotations: t.annotations } : {}),
    })),
    how_to_call: HOW_TO_CALL,
  });
  const root = document.documentElement;
  root.setAttribute('data-webmcp-tools', names.join(','));
  root.setAttribute('data-webmcp-bridge', 'dom');
}

function writeResult(id: string, payload: Record<string, unknown>): void {
  // Lower-cased on purpose: the result is also mirrored as an attribute, and
  // the HTML parser lower-cases attribute names. An agent that called with
  // id "H1" would otherwise look up data-webmcp-result-H1 and find nothing.
  const safeId = String(id)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 64);
  const text = JSON.stringify({ id: safeId, ...payload });
  document.getElementById(`webmcp-result-${safeId}`)?.remove();
  const out = document.createElement('script');
  out.type = 'application/json';
  out.id = `webmcp-result-${safeId}`;
  out.textContent = text;
  document.body.appendChild(out);
  document.documentElement.setAttribute(`data-webmcp-result-${safeId}`, text.slice(0, 4000));
}

async function handleCall(raw: string): Promise<void> {
  if (!deps) return;
  let req: { id?: unknown; name?: unknown; args?: unknown } = {};
  try {
    req = JSON.parse(raw) as typeof req;
  } catch {
    writeResult('parse_error', { ok: false, error: 'call JSON did not parse' });
    return;
  }
  const id = typeof req.id === 'string' && req.id ? req.id : `call_${Date.now()}`;
  const name = typeof req.name === 'string' ? req.name : '';
  const args = (req.args && typeof req.args === 'object' ? req.args : {}) as Record<string, unknown>;
  try {
    const result = await deps.invoke(name, args);
    writeResult(id, { ok: true, name, result });
  } catch (err) {
    writeResult(id, { ok: false, name, error: String(err) });
  }
}

function takeCallNode(node: Element): void {
  if (node.getAttribute('data-webmcp-state') === 'taken') return;
  node.setAttribute('data-webmcp-state', 'taken');
  const raw = node.textContent ?? '';
  node.remove();
  void handleCall(raw);
}

function scanForCalls(root: ParentNode): void {
  root.querySelectorAll?.(`.${CALL_CLASS}`).forEach((n) => takeCallNode(n));
}

/** Start observing for call nodes / attributes. Idempotent. */
export function startDomBridge(d: DomBridgeDeps): void {
  if (typeof document === 'undefined') return;
  deps = d;
  syncDomManifest(d.list());
  if (observer) return;
  observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'attributes' && r.target === document.documentElement) {
        const raw = document.documentElement.getAttribute(CALL_ATTR);
        if (raw) {
          document.documentElement.removeAttribute(CALL_ATTR);
          void handleCall(raw);
        }
        continue;
      }
      r.addedNodes.forEach((n) => {
        if (!(n instanceof Element)) return;
        if (n.classList.contains(CALL_CLASS)) takeCallNode(n);
        else scanForCalls(n);
      });
    }
  });
  const start = () => {
    observer!.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [CALL_ATTR],
    });
    scanForCalls(document);
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
}
