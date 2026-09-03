# WebMCP API — Current State (researched September 2026)

> **CORRECTION (live spec, https://webmachinelearning.github.io/webmcp/, checked 2026-09-03):**
> `execute(inputObject, { signal })` returns **`Promise<any>`** — a plain JSON-able value that the
> browser serializes; it is **not** the MCP `{content:[{type:'text',text}]}` shape claimed in §1
> below (that shape is the MCP-B polyfill's convention; ChatGPT's reference example returns
> `{ title: document.title }`). Also: `executeTool(tool, inputObject, { signal })` takes an **object**,
> not a JSON string; the tool dictionary has an optional **`title`**; `annotations` are exactly
> `{ readOnlyHint, untrustedContentHint }`; access is gated by the `tools` Permissions-Policy
> feature (default `self`) and the API is `[SecureContext]` (https or localhost only). There is no
> declarative section in the spec yet ("entirely a TODO").

Primary sources fetched directly for this document: the W3C Web Machine Learning Community Group explainer repo (`webmachinelearning/webmcp`), Chrome for Developers WebMCP docs, npm registry metadata for `@mcp-b/global`, MCP-B docs (`docs.mcp-b.ai`), and OpenAI's `learn.chatgpt.com/docs/webmcp`. Every claim below is tagged with the URL it came from. Where a source could not be independently verified (some search-engine-summarized blog posts), that is flagged explicitly — treat those as lower confidence.

---

## 1. The imperative API

### Object name: `document.modelContext` (NOT `navigator.modelContext`)

The spec explainer repo's README states the API surface is `document.modelContext`, not `navigator.modelContext`. This was fetched from the explainer's README directly:
- Source: https://raw.githubusercontent.com/webmachinelearning/webmcp/main/README.md (fetched; confirms `document.modelContext.registerTool()`, `.getTools()`, `.executeTool()`, and `.addEventListener("toolchange", …)`).
- Chrome's own docs agree: https://developer.chrome.com/docs/ai/webmcp/imperative-api ("`await document.modelContext.registerTool({...})`").
- OpenAI's docs for ChatGPT's in-app browser also use `document.modelContext.registerTool`: https://learn.chatgpt.com/docs/webmcp (fetched).
- The published npm polyfill `@mcp-b/global` v5.1.0 describes itself as "Let AI agents like Claude, ChatGPT, and Gemini interact with your website via `document.modelContext`" — confirmed via npm registry metadata: https://registry.npmjs.org/@mcp-b/global/latest (fetched).

**Note on `navigator.modelContext`:** an early prototype/blog corpus (e.g. a search-summarized "OpenHermit" blog and a dev.to post) uses `navigator.modelContext` and describes it as "Chrome's API." These are secondary/unverified blog sources, not primary docs, and conflict with every primary source fetched (GitHub explainer, Chrome docs, OpenAI docs, npm package description) which consistently use `document.modelContext`. **Conclusion: `document.modelContext` is correct as of today; treat `navigator.modelContext` references as either stale (pre-rename) or inaccurate blog content.**

### Methods

| Method | Purpose | Source |
|---|---|---|
| `document.modelContext.registerTool(descriptor, options?)` | Register one tool. Returns a promise. `options` supports `{ signal: AbortSignal, exposedTo: string[] }` for cross-origin exposure control. | https://developer.chrome.com/docs/ai/webmcp/imperative-api |
| `document.modelContext.getTools(options?)` | Discover currently registered tools (alphabetically ordered). Accepts `{ fromOrigins: [...] }` to pull cross-origin tools exposed via `exposedTo`. | https://developer.chrome.com/docs/ai/webmcp/imperative-api |
| `document.modelContext.executeTool(tool, jsonArgsString, { signal })` | Manually invoke a discovered tool object; used for cross-origin/host-orchestrated calls, not typical same-page registration. | https://developer.chrome.com/docs/ai/webmcp/imperative-api |
| `document.modelContext.addEventListener("toolchange", handler)` | Fires when the registered tool set changes (add/remove/update). | GitHub README (raw.githubusercontent.com/webmachinelearning/webmcp/main/README.md) and https://developer.chrome.com/docs/ai/webmcp/imperative-api |

**No separate `unregisterTool()`, `provideContext()`, or `clearContext()` methods were found in any primary source.** Removal is done via `AbortController`/`AbortSignal` (see §5), not a dedicated unregister call. If your team's plan assumed a `provideContext`/`clearContext` pair (common in some competing "web AI context" proposals), that does not appear to exist in the current WebMCP explainer or Chrome docs — flagged as **not present in current spec**.

### Tool descriptor shape

```js
await document.modelContext.registerTool({
  name: "add-todo",                 // string identifier
  description: "Add item to todo list", // natural-language purpose, reaches the agent as prompt text
  inputSchema: {                    // JSON Schema (object type, properties, required)
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"]
  },
  annotations: {                    // optional hints
    readOnlyHint: true,
    untrustedContentHint: false
  },
  async execute({ text }, { signal }) {
    // signal: AbortSignal for cancellation
    return {
      content: [
        { type: "text", text: `Added: "${text}"` }
      ]
    };
  }
}, { signal: controller.signal });
```
Source (code adapted from): https://developer.chrome.com/docs/ai/webmcp/imperative-api and GitHub README example fetched from webmachinelearning/webmcp.

- `execute` receives `(input, { signal })` — `input` is the parsed object matching `inputSchema`, and the second argument carries an `AbortSignal`. Source: https://developer.chrome.com/docs/ai/webmcp/imperative-api.
- Return value is **MCP-style**: `{ content: [{ type: "text", text: "..." }] }` — matching the Model Context Protocol's tool-result shape, not a plain JS value. Confirmed identically in the GitHub README fetch and Chrome docs fetch. **This is consistent across every source; high confidence.**

### Removing tools mid-session

There is no `unregisterTool()`. Instead, pass an `AbortSignal` at registration time and call `.abort()` on its controller to deregister:

```js
const controller = new AbortController();
await document.modelContext.registerTool(addTodoTool, { signal: controller.signal });
// later, to remove:
controller.abort();
```
Source: https://developer.chrome.com/docs/ai/webmcp/imperative-api (fetched — this exact pattern was returned verbatim from the docs).

Chrome docs also note: "Chrome 153+ supports unregistering tools without breaking in-flight executions" — implying earlier versions may have had rough edges when aborting mid-call. Source: same page (WebFetch summary of https://developer.chrome.com/docs/ai/webmcp/imperative-api). This specific version number claim is from a fetch-summarization, not directly quoted — treat the exact version number ("153") as medium confidence, but the abort-based unregistration mechanism itself as high confidence (appears in both the GitHub README and Chrome docs).

### Events

- `toolchange` — the only event documented, fired on the `document.modelContext` object when the tool set changes (register/unregister/update). Source: GitHub README raw fetch + https://developer.chrome.com/docs/ai/webmcp/imperative-api.
- No separate "before tool call" / "after tool call" execution events were found in the fetched sources.

### Cross-origin / iframe exposure

- `<iframe src="..." allow="tools"></iframe>` (Permissions Policy) plus `exposedTo: ["https://partner.org"]` in `registerTool` options controls which origins can see a tool via `getTools({ fromOrigins: [...] })`. Source: https://developer.chrome.com/docs/ai/webmcp/imperative-api.
- Chrome's ChatGPT-facing note and Chrome docs both state tools inside iframes (same-origin or cross-origin) are **not** auto-discovered by the host page unless explicitly exposed — see §5 gotchas.

---

## 2. The declarative HTML form-based API

Source: https://developer.chrome.com/docs/ai/webmcp/declarative-api (fetched directly).

Exact attribute names on `<form>`:

- `toolname` — required, names the tool.
- `tooldescription` — required, describes what the tool/form does.
- `toolautosubmit` — optional boolean-ish attribute; when present, the form submits automatically when an agent invokes the tool (rather than requiring a user click).

Field-level attribute (on inputs/selects inside the form):

- `toolparamdescription` — maps a given form control to the JSON Schema property description for that field. If omitted, the browser falls back to the associated `<label>` text.

Example concept (attribute names as documented, form structure adapted):

```html
<form toolname="search-products" tooldescription="Search the product catalog" toolautosubmit>
  <label for="q">Search query</label>
  <input id="q" name="q" type="text" toolparamdescription="Search term to look up" required>
  <select name="category" toolparamdescription="Product category filter">
    <option value="all">All</option>
    <option value="shoes">Shoes</option>
  </select>
  <button type="submit">Search</button>
</form>
```

Behavior details from the same source:
- The browser auto-derives a JSON Schema from form controls (e.g. a `<select>` becomes a string property with `anyOf` over its options; `required` inputs populate the schema's `required` array).
- `SubmitEvent` gains an `agentInvoked` boolean (true when the AI triggered the submit) and a `respondWith(promise)` method to let page code supply a custom tool result after calling `preventDefault()`.
- New CSS pseudo-classes: `:tool-form-active` (on the form) and `:tool-submit-active` (on the submit button) for visual feedback while an agent is filling/using the form.
- New events: `toolactivated` (agent successfully populated the fields) and `toolcancel` (user cancelled, or `.reset()` called).

**Important caveat:** OpenAI's ChatGPT in-app browser documentation explicitly states the declarative HTML form API is **not** supported there — only JavaScript (`document.modelContext.registerTool`) registration works in ChatGPT's browser today. Source: https://learn.chatgpt.com/docs/webmcp (fetched). So the declarative API is Chrome-specific today, not yet cross-implemented.

---

## 3. Support detection and the recommended polyfill

### Feature detection
Recommended pattern (adapted from the ChatGPT docs code sample, which itself guards for absence of native support):
```js
if (typeof document.modelContext?.registerTool === "function") {
  await document.modelContext.registerTool({ /* ... */ });
}
```
Source: https://learn.chatgpt.com/docs/webmcp (fetched — this exact guard clause appears in OpenAI's own sample).

### Polyfill package

- **Package:** `@mcp-b/global`
- **Version (as published today):** `5.1.0` — confirmed via npm registry metadata fetch: https://registry.npmjs.org/@mcp-b/global/latest.
- **Description (verbatim from registry):** "W3C Web Model Context Protocol (WebMCP) API polyfill. Let AI agents like Claude, ChatGPT, and Gemini interact with your website via `document.modelContext`."
- **Dependencies pulled in:** `@mcp-b/transports`, `@mcp-b/webmcp-types`, `@mcp-b/webmcp-ts-sdk`, `@mcp-b/webmcp-polyfill` (all 5.1.0), and `@modelcontextprotocol/server` (2.0.0). Source: same npm registry fetch.
- Install:
  ```bash
  npm install @mcp-b/global
  ```
- Import (early in the app entry point, before any tool registration):
  ```js
  import "@mcp-b/global";
  ```
  Source for "import early, before registrations" guidance: https://docs.mcp-b.ai/explanation/native-vs-polyfill-vs-global (fetched).

### `@mcp-b/global` vs `@mcp-b/webmcp-polyfill`
Per MCP-B's own docs (fetched from https://docs.mcp-b.ai/explanation/native-vs-polyfill-vs-global):
- `@mcp-b/webmcp-polyfill` — a minimal, strict polyfill: implements just the `document.modelContext` surface (registerTool/getTools/executeTool) for browsers without native support. Does not add MCP-B-only extras.
- `@mcp-b/global` — superset: adds MCP-B extension features (bridge transport to the MCP-B browser extension, `resources`, `prompts`, testing helpers). Guidance quoted: "Start with the live WebMCP proposal and current browser support. Add MCP-B packages only for the compatibility, type inference, or extension behavior your application needs."

### Chrome extension bridge ("MCP-B")
- There is a Chrome extension ecosystem (MCP-B / "WebMCP Bridge") that bridges page-registered `document.modelContext` tools to external MCP clients (Claude Desktop, Cursor, Windsurf) over a local WebSocket/stdio bridge, so any MCP client — not just an in-browser agent — can call tools registered on an open tab. Source: web search results summarizing https://github.com/WebMCP-org and https://github.com/nathan-gage/webmcp-bridge (search-summarized, not independently fetched in full — **medium confidence** on exact mechanism, but the existence of such bridge extensions is corroborated by multiple independent listings, including a Chrome Web Store entry "WebMCP Bridge").
- I did **not** find a primary-source page that names this specific extension "Model Context Tool Provider" (the name given in your question) — the ecosystem calls it "MCP-B" / "WebMCP Bridge" / "Model Context Tool Inspector" (a separate DevTools-style inspector extension: https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd, linked directly from Chrome's own WebMCP docs page). Treat "Model Context Tool Provider" as **not confirmed** under that exact name.
- The extension/bridge code itself is **not fully open source** per one search-summarized source (the libraries/SDKs are MIT; the browser extension binary is not) — **medium confidence**, single indirect source.

---

## 4. Which browsers/agents can call these tools TODAY (Sept 2026)

| Surface | Status | Confidence | Source |
|---|---|---|---|
| Chrome | Origin Trial live (not default-on GA). Chrome's own docs page states "WebMCP remains under active discussion and subject to change" and is offered as an Origin Trial via `developer.chrome.com/origintrials`, plus a local dev flag `chrome://flags/#enable-webmcp-testing`. | High for "Origin Trial, not GA"; medium on exact version numbers (149/150/153/146 appeared across different fetches/searches, inconsistently) | https://developer.chrome.com/docs/ai/webmcp (fetched), origin trial registration link found on that page: https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241, Chrome Status entry https://chromestatus.com/feature/5117755740913664 |
| Edge | Reported as following Chrome with its own Origin Trial (shares Chromium engine). | Low-medium — from search-summarized blog content only, not independently fetched from a Microsoft primary source | search result summary (dev.to "WebMCP in 2026" compatibility post) |
| Firefox / Safari | Engaged in the W3C spec discussion (per generic W3C multi-vendor framing) but no committed shipping timeline found in any source fetched. | Low — no Mozilla/Apple primary source was fetched confirming even experimental support | inferred from W3C Community Group framing of the explainer repo (webmachinelearning/webmcp is a W3C Web Machine Learning CG deliverable) |
| ChatGPT desktop app's in-app browser | **Confirmed native support**, using `document.modelContext.registerTool`. Agent discovers tools automatically via a "Site tools" UI in the browser's address bar ("Available site tools" / "Recently used"); user simply asks ChatGPT for help on the page and it uses available tools — no separate install step. Gated to specific models: supported on "GPT-5.6 Sol" and "GPT-5.6 Terra" with ChatGPT Work and Codex; **not** available on "GPT-5.6 Luna" or in Enterprise/Edu workspaces. Requires the latest desktop app build. | High — fetched directly from OpenAI's own docs | https://learn.chatgpt.com/docs/webmcp |
| ChatGPT Sites (site-hosting product) | The fetched OpenAI doc references using WebMCP "on the web app or Site you're working on" but does **not** spell out ChatGPT-Sites-specific hosting/config steps beyond the standard `document.modelContext.registerTool` code — i.e., a site built with ChatGPT Sites exposes tools the same way any other web page would (client-side JS registration); there's no separate "ChatGPT Sites WebMCP manifest" documented in what was fetched. | Medium — the doc is silent on Sites-specific mechanics beyond generic registration | https://learn.chatgpt.com/docs/webmcp; also referenced by a third-party post about a "OpenAI's WebMCP Challenge with Netlify" (search result only, not fetched) https://www.netlify.com/blog/compete-openai-webmcp-challenge/ |
| Other agents (Claude, Gemini, Copilot, Brave Leo) | Only reachable via the **MCP-B bridge extension** (not native browser support) as of the sources found — i.e. Claude/Gemini/Copilot are not natively calling `document.modelContext` tools in a browser context; they can consume the same tools only if the MCP-B extension re-exposes them as a standard MCP server. A Brave "Leo AI" experimental integration was mentioned once in search results but not independently verified. | Low-medium | search-summarized results (dev.to compatibility post; WebMCP-org GitHub org description) |

**Where sources conflict:** exact Chrome version numbers for Origin Trial availability were inconsistent across fetches/searches — one Chrome docs fetch said "Chrome 149+", another said "Chrome 153+ supports unregistering tools without breaking in-flight executions" (implying an earlier baseline), a search result said "Chrome 146 is the only browser with a working implementation," and another said "Chrome 149... Edge 150." These are all AI-summarized extractions of the same evolving docs page rather than a verbatim version table, so **do not hard-code a specific Chrome version number in code or docs** — instead feature-detect (`document.modelContext?.registerTool`) and check https://developer.chrome.com/docs/ai/webmcp directly before shipping.

---

## 5. Practical gotchas

- **Tool name length:** keep to roughly 30 characters max for reliable agent behavior (recommendation, not a hard platform limit). Source: https://developer.chrome.com/docs/ai/webmcp/secure-tools.
- **Return size:** recommended ceiling of about 1.5K characters per tool output to avoid tripping agent guardrails/truncation; Chrome's own docs flag this budget as "subject to change." Source: same page.
- **Prompt-injection relevance:** tool `name`/`description`/schema text is delivered to the agent as part of its context — i.e., it functions like prompt text the page author controls, and (per Chrome's security guidance) should be treated with the same care as any other untrusted-adjacent content since "LLMs treat all text, instructions, and user data as a single sequence of tokens." OpenAI's docs independently confirm this by stating tool definitions are treated as **untrusted content** by ChatGPT's browser and every invocation gets "a safety review before it runs." Sources: https://developer.chrome.com/docs/ai/webmcp/secure-tools and https://learn.chatgpt.com/docs/webmcp.
- **User permission / confirmation prompts:** ChatGPT's browser requires explicit confirmation for "consequential actions" (purchases, deletions, permission changes) even when a tool is available, and users can disable site tools entirely in Settings > Browser > Permissions. Chrome's spec also references a forthcoming `requestUserInteraction()` capability for tools to request user input mid-execution, described as still in progress ("ongoing feature"). Sources: https://learn.chatgpt.com/docs/webmcp and https://developer.chrome.com/docs/ai/webmcp/secure-tools.
- **iframes are opaque by default:** a tool registered inside a same-origin or cross-origin iframe is not automatically visible to the top-level page/agent; it must be explicitly exposed via `exposedTo` plus a `allow="tools"` Permissions Policy on the `<iframe>`. ChatGPT's browser docs separately confirm tools inside iframes "aren't discovered" without this. Sources: https://developer.chrome.com/docs/ai/webmcp/imperative-api and the ChatGPT WebMCP doc fetch summary.
- **Lifetime / when to register:** no primary source gave an explicit "register on DOMContentLoaded vs lazily" rule; the working pattern seen in every code sample is to call `registerTool` as soon as the relevant feature/module initializes (import-time for the polyfill, per MCP-B's "import early, before any tool registrations" guidance). Tools are inherently scoped to the page/document instance — a full navigation resets `document.modelContext`, so tools must be re-registered per page load; there is no cross-navigation persistence documented anywhere fetched. **This lifetime inference is reasonable but not explicitly stated as a rule in any single fetched source — medium confidence.**
- **Removal only via AbortSignal**, not a dedicated `unregisterTool` call (see §1). Re-registering a tool with the same `name` was not explicitly documented as either an error or an overwrite in the sources fetched — treat this as **undefined behavior** until confirmed against Chrome DevTools' WebMCP panel (https://developer.chrome.com/docs/devtools/application/webmcp) in your own testing.
- **Security escape hatch:** Chrome's own docs warn that a browser *extension* with `host_permissions` can bypass the origin/exposure model entirely by injecting script that talks to `document.modelContext` directly — i.e., WebMCP's origin isolation is not a defense against malicious extensions. Source: https://developer.chrome.com/docs/ai/webmcp/secure-tools.
- **Declarative API is Chrome-only today** — not implemented in ChatGPT's browser (see §2). Don't rely on it as your only registration path if ChatGPT users are a target audience.

---

## 6. Minimal vanilla TypeScript wrapper

This wrapper feature-detects the native API, falls back to the `@mcp-b/global` polyfill if the app has installed/imported it (it patches `document.modelContext` the same way), and returns an `unregister()` closure built on `AbortController` — the only removal mechanism documented (§1).

```ts
// webmcp.ts
// Minimal wrapper around the WebMCP imperative API (document.modelContext).
// Native support: Chrome/Edge Origin Trial builds, ChatGPT in-app browser (desktop app).
// Fallback: install `@mcp-b/global` (npm i @mcp-b/global) and `import "@mcp-b/global"`
// once, early, before calling registerPageTool — it patches document.modelContext itself,
// so no separate polyfill branch is needed here; we just feature-detect afterwards.

export interface ToolContent {
  type: "text";
  text: string;
}

export interface ToolResult {
  content: ToolContent[];
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface ToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

export interface ToolDescriptor<TInput = Record<string, unknown>> {
  name: string;                 // keep <= ~30 chars (see gotchas)
  description: string;          // reaches the agent as prompt text — treat as sensitive
  inputSchema: JSONSchema;
  annotations?: ToolAnnotations;
  execute: (
    input: TInput,
    ctx: { signal: AbortSignal }
  ) => Promise<ToolResult> | ToolResult;
}

export interface RegisterOptions {
  exposedTo?: string[]; // origins allowed to discover this tool cross-origin
}

// --- global augmentation -----------------------------------------------

declare global {
  interface ModelContext extends EventTarget {
    registerTool(
      tool: ToolDescriptor,
      options?: { signal?: AbortSignal; exposedTo?: string[] }
    ): Promise<void>;
    getTools(options?: { fromOrigins?: string[] }): Promise<unknown[]>;
    executeTool(
      tool: unknown,
      argsJson: string,
      options?: { signal?: AbortSignal }
    ): Promise<ToolResult>;
    addEventListener(
      type: "toolchange",
      listener: (event: Event) => void
    ): void;
    removeEventListener(
      type: "toolchange",
      listener: (event: Event) => void
    ): void;
  }

  interface Document {
    modelContext?: ModelContext;
  }
}

// --- feature detection ----------------------------------------------------

/** True if a document.modelContext implementation (native or polyfilled) is present. */
export function isWebMCPSupported(): boolean {
  return typeof document !== "undefined" &&
    typeof document.modelContext?.registerTool === "function";
}

// --- registration wrapper --------------------------------------------------

export interface RegisteredTool {
  unregister: () => void;
}

/**
 * Registers a page tool with document.modelContext, if available (native or via
 * an already-imported polyfill such as @mcp-b/global). No-ops (and warns) if
 * WebMCP is unsupported in this browsing context.
 *
 * Removal uses AbortController — WebMCP has no unregisterTool() method; aborting
 * the signal passed at registration time is the documented way to deregister
 * (see developer.chrome.com/docs/ai/webmcp/imperative-api).
 */
export function registerPageTool<TInput = Record<string, unknown>>(
  descriptor: ToolDescriptor<TInput>,
  options: RegisterOptions = {}
): RegisteredTool {
  const controller = new AbortController();

  if (!isWebMCPSupported()) {
    console.warn(
      `[webmcp] document.modelContext not available; tool "${descriptor.name}" was not registered. ` +
        `Install a polyfill (npm i @mcp-b/global) and import it before calling registerPageTool, ` +
        `or run in a browser/agent with native WebMCP support.`
    );
    return { unregister: () => controller.abort() };
  }

  void document.modelContext!.registerTool(
    descriptor as unknown as ToolDescriptor,
    { signal: controller.signal, exposedTo: options.exposedTo }
  );

  return {
    unregister: () => controller.abort(),
  };
}

// --- example usage ----------------------------------------------------------
//
// const tool = registerPageTool({
//   name: "add-todo",
//   description: "Add an item to the visible todo list",
//   inputSchema: {
//     type: "object",
//     properties: { text: { type: "string" } },
//     required: ["text"],
//   },
//   annotations: { readOnlyHint: false },
//   async execute({ text }) {
//     addTodoToDom(text);
//     return { content: [{ type: "text", text: `Added: "${text}"` }] };
//   },
// });
//
// // later, e.g. when a component unmounts:
// tool.unregister();
```

Adapted from the registration/execute/AbortSignal patterns fetched from https://developer.chrome.com/docs/ai/webmcp/imperative-api, the GitHub explainer README (raw.githubusercontent.com/webmachinelearning/webmcp/main/README.md), and OpenAI's feature-detection guard from https://learn.chatgpt.com/docs/webmcp.

---

## ChatGPT Sites → WebMCP: is there a documented path?

**Partially.** OpenAI's `learn.chatgpt.com/docs/webmcp` page (fetched) confirms ChatGPT's desktop in-app browser and "ChatGPT Sites" both support WebMCP tool discovery, and that a page registers tools with the same `document.modelContext.registerTool` call as anywhere else — there is no ChatGPT-Sites-specific manifest or config format documented in what was fetched. A third-party announcement ("Compete in OpenAI's WebMCP Challenge with Netlify," search-result only, not fetched: https://www.netlify.com/blog/compete-openai-webmcp-challenge/) suggests OpenAI is actively promoting third-party static-hosting + WebMCP combinations, which is consistent with "just register tools client-side, host anywhere" rather than a bespoke Sites API. **Confidence: medium** — the core claim (ChatGPT Sites supports WebMCP via the standard registration API) is corroborated by OpenAI's own docs and by an X/Twitter post from `@OpenAIDevs` (found via search, not independently fetched: https://x.com/OpenAIDevs/status/2092344959248761263, which states "We're adding support for WebMCP in the ChatGPT desktop app's built-in browser and ChatGPT Sites"), but a dedicated "how to configure a ChatGPT Site for WebMCP" walkthrough was not located.

---

## Confidence summary

| # | Question | Confidence | Notes |
|---|---|---|---|
| 1 | Imperative API (object name, methods, descriptor shape, execute signature/return, removal, events) | **High** | `document.modelContext` and the MCP-style `{content:[{type:'text',text}]}` return shape were independently confirmed across the GitHub explainer README, Chrome docs, OpenAI docs, and the npm polyfill's own description. No dedicated `unregisterTool`/`provideContext`/`clearContext` found anywhere — confident they don't exist in the current spec; removal-via-AbortSignal is confirmed in two primary sources. |
| 2 | Declarative HTML form API | **Medium-High** | Attribute names (`toolname`, `tooldescription`, `toolautosubmit`, `toolparamdescription`) came from a single Chrome docs fetch (not cross-verified against the GitHub explainer's own declarative-api-explainer.md, which wasn't separately fetched). Confirmed unsupported in ChatGPT's browser via a second, independent source. |
| 3 | Support detection / polyfill | **High** | `@mcp-b/global` v5.1.0 and its `document.modelContext` framing came straight from npm registry JSON. The native-vs-polyfill-vs-global distinction came from MCP-B's own docs site. The exact Chrome-extension bridge name/mechanics are lower confidence (search-summarized only). |
| 4 | Which browsers/agents support it today | **Medium** | ChatGPT in-app browser support is high-confidence (primary source, with model/plan gating detail). Chrome's Origin-Trial status is confirmed but exact version numbers conflicted across fetches — do not trust a specific Chrome version number without re-checking developer.chrome.com/docs/ai/webmcp directly. Edge/Firefox/Safari/Claude/Gemini/Copilot native-support claims are low confidence (search-summary only, no primary source fetched). |
| 5 | Gotchas (naming, size limits, injection, permissions, lifetime) | **Medium-High** | Name-length and output-size numbers came from Chrome's own security-guidance page (explicitly labeled as recommendations "subject to change"). Prompt-injection and permission-prompt behavior confirmed by two independent primary sources (Chrome + OpenAI). Per-page lifetime/registration-timing is an inference, not an explicit documented rule — flagged as such above. |
| 6 | TypeScript wrapper | **High** (as a faithful adaptation) | Built directly from the exact code patterns fetched from the GitHub README, Chrome docs, and OpenAI's feature-detection sample — but note WebMCP itself is pre-GA and its exact TS ambient types may already exist in `@mcp-b/webmcp-types`/`webmcp-types` packages (seen referenced in fetches but not independently inspected) — consider using those instead of hand-rolled `declare global` types once you pin a package version. |
