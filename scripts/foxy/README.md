# 🦊 Foxy (developer tooling)

Captures **every** `fetch` / `XMLHttpRequest` the app makes, with the JS stack that initiated it, and shows them in a live dashboard. Built for auditing which requests happen on which screen (e.g. TRAM-4463: Onboarding on a fresh install). Debug builds only; opt-in.

Unlike Charles/Proxyman it knows *who* made the call (symbolicated through Metro), and it installs before the Engine boots so early requests are not missed.

## Run

1. In `.js.env`: `export FOXY="true"` (restart Metro).
2. `yarn foxy` (same as `bash scripts/foxy/run.sh`) and open <http://localhost:8098>.
3. Android: `adb reverse tcp:8098 tcp:8098`. Physical iOS device: set `FOXY_URL=ws://<your-lan-ip>:8098/app`.
4. Fresh install (delete the app or wipe data), launch, and watch the Timeline. Press `M` and drop a marker (e.g. `Onboarding visible`, `Wallet created`) as things happen to split the capture into phases. Press `?` for the in-app guide.

Keep Metro running on `:8081` (override with `FOXY_METRO`) so stacks are symbolicated to `app/...` and `@metamask/...` frames.

## Views / output

- **Timeline**: every request in order. The **Call site** column leads with the `method()` that called `fetch` and the file tail beneath it, with a color bar for where it lives (app, `@metamask/*`, third-party, project). Click a row for the full call chain (oldest caller first, wrapper frames collapsed) plus the request and response (query params, headers, body).
- **Code owners**: team chips come from CODEOWNERS for the file that made the call (`.github/CODEOWNERS` for `app/`, the core monorepo's for `@metamask/<pkg>`; set `FOXY_REPO` / `FOXY_CORE` if the paths differ). Third-party calls show the package name instead (for example `@segment/analytics-react-native`), plus dashed *via* chips for the team that owns the code that started them. `@metamask/*` packages with no CODEOWNERS entry show a dashed fox chip, and unmatched app files show `unowned`.
- **Columns**: drag a header label to reorder, drag a header edge to resize (or focus it and use the arrow keys), double-click an edge to reset that column, **Reset columns** restores the defaults. Layout is saved in the browser.
- **Endpoints**: grouped by `METHOD host/path` with call counts, *identical duplicate* counts, status mix, average latency, an activity lane (every call as a tick on the capture timeline; ringed ticks repeat an earlier identical request), call sites and a verdict. Click a row for the full breakdown:
  - summary cards (calls, identical dupes with redundant ms/bytes, latency p95/max, burst size, first and last time, payload);
  - every call on a rail with when it happened (relative and wall-clock), the gap since the previous call (`⚡ same time` for bursts), status, size, call site and owner, with repeats flagged (`same as #N`); click a call to open it in the Timeline;
  - which query params change between calls and which stay the same, and who calls the endpoint;
  - a **verdict** (Keep / Defer / Move / Drop) and a note, saved in the browser and included when you **Copy markdown** on this tab.
- **Identical** means the same method and URL. For POST/PUT/PATCH/DELETE the body must match too (size plus a hash of the captured preview); with no body information a non-GET request is never called identical, so JSON-RPC and analytics batches are not falsely flagged. Turn on `FOXY_BODIES` for the strongest check.
- **Filters**: ownership buttons (We own / Third-party / Unowned) with counts, plus Failed and Duplicates toggles. Clicking a team or package chip filters by it.
- **Markers & phases**: a marker is a flag you drop while using the app; everything captured after it belongs to that phase until the next marker.
  - **Add**: press `M` or click **Markers**, type a label and press Enter, or tap a quick-add chip (your own labels are remembered). The *Now / 5s ago / 30s ago…* dropdown backdates a marker you noticed late.
  - **See**: each phase gets a colour. The activity strip shades the phases and labels their flags (click a flag to jump to it), the waterfall draws a line per marker, and the Timeline gets a collapsible header per phase with its time range, ownership mix, requests, new endpoints, identical dupes and failures (`🌙 quiet` when nothing was requested).
  - **Zoom**: **Only this** on a header (or the target icon in the panel) filters Timeline and Endpoints to that phase; Endpoints also has a Phase column showing where each endpoint first appeared.
  - **Edit**: rename a marker in the panel, delete it with the bin (neighbouring phases merge).
  - **Export**: *Copy markdown* adds a phases table; agents can call the `marker_add` MCP tool (`label`, optional `agoSeconds`).
  - Identical dupes are counted against the whole capture, so a repeat in a later phase of something fetched earlier is flagged.
- **Guide**: it opens on every launch until you tick *Don't show this guide when Foxy opens*; the `?` button (or the key) reopens it. It has illustrated topics (Start here, Markers & phases, Reading the Timeline, Endpoints & verdicts, Filters & duplicates, Shortcuts). To document another view, add an entry to the `HELP` array in `dashboard.html`; illustrations live in the `ART` object and are plain monospace strings with colour spans.
- **Time format**: the menu switches every time shown in the dashboard between `1m 23.4s`, `01:23.40` and plain seconds (`83.40s`). The choice is remembered; copied markdown always uses plain seconds.
- **Columns**: number-like columns (`#`, Time, Method, Status, ms, and Calls / Avg ms / First in Endpoints) size themselves to the widest value in the capture, within a realistic range, so digits never clip as the numbers grow. The other columns share the remaining width and can be dragged to resize.
- **Default column order** reads left to right as when, who, what, outcome: Timeline is `#`, Time, Code owners, Call site, Started from, Method, Host, Path, Status, ms, Waterfall. Endpoints is Phase, First, Code owners, Call sites, Endpoint, Calls, Identical dupes, Statuses, Avg ms, Activity, Verdict. Saved layouts from older versions are ignored once so you get this order; **Reset columns** restores it any time.
- **Play / pause**: the round button in the header freezes the view while Foxy keeps recording. A badge counts the requests being held. Press play and they appear, with a divider in the Timeline (when you paused, for how long, and how many requests arrived while paused) so you can tell them from what was already on screen.
- **GitHub links**: in a request's call chain, the file path of every app and project frame opens that file at that line on GitHub (`#L<line>`, GitHub cannot highlight a column). Packages and `@metamask/*` frames stay plain text because their frames point at built `dist` files, not source. Foxy links to your `origin` repo at `HEAD` when it is on a remote branch, otherwise at the merge-base with `origin/main`, so the lines match the running code. Set `FOXY_GITHUB_REPO=owner/name` and `FOXY_GITHUB_REF=<branch|sha>` to override (for example once your branch is pushed). Unpushed local edits can shift line numbers.
- **Logo**: the header and guide use the animated MetaMask fox (`vendor/foxy-loading.riv`, played with the vendored Rive web runtime). It loops forever, pauses for people who prefer reduced motion, and falls back to the 🦊 emoji if the files are missing. Restart `yarn foxy` after pulling so the server serves `/vendor/*`.
- **Menu**: the hamburger holds the Theme picker (Dark, Light, Navy, Orange; saved in the browser), Time format, Reset columns, Copy markdown and Clear. `/` focuses the filter, `M` opens markers.
- **Copy markdown**: the recommendation-table skeleton (verdict columns left blank). Also `GET /api/export`.
- Raw log: `scripts/foxy/logs/foxy.jsonl`.
- Replay an old capture into a running dashboard (no app needed): `node scripts/foxy/replay.mjs [logfile] [port]`.

## Agent access (MCP)

```bash
claude mcp add foxy -- node scripts/foxy/mcp.mjs
```

Tools: `network_list`, `network_get`, `network_summary`, `network_export_markdown`, `marker_add`, `network_clear`, `status`.

## Limits

- Only JS-initiated requests are seen. Native-side prefetches (registered in `MainApplication.kt` / `AppDelegate.swift` before JS boots) are not.
- Stacks are the synchronous call stack at `fetch()` time; after an `await` you see the polling function, not the original trigger.
- Header names are recorded, but values for credential-like headers (authorization, cookie, api keys, tokens) are replaced with `[redacted]`.
- Request and response bodies are **off by default**. Set `FOXY_BODIES="true"` in `.js.env` to record capped previews. They can contain tokens or personal data, so use this only on throwaway wallets.

## Tests

`node --test scripts/foxy/lib.test.mjs scripts/foxy/codeowners.test.mjs` and `yarn jest app/dev-tools/Foxy`.
