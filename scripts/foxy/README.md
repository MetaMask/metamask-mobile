# 🦊 Foxy (developer tooling)

Captures **every** `fetch` / `XMLHttpRequest` the app makes, with the JS stack that initiated it, and shows them in a live dashboard. Built for auditing which requests happen on which screen (e.g. TRAM-4463: Onboarding on a fresh install). Debug builds only; opt-in.

Unlike Charles/Proxyman it knows *who* made the call (symbolicated through Metro), and it installs before the Engine boots so early requests are not missed.

## Run

Switch to this branch, then:

```bash
yarn install
yarn foxy        # prepares everything below, then serves http://localhost:8098
```

`yarn foxy` runs `scripts/foxy/setup.mjs` first. It is safe to run any number of times, and it:

- turns on `export FOXY="true"` in `.js.env` (creating the file from `.js.env.example` if it is missing; `FOXY_URL` and `FOXY_BODIES` are never touched);
- tells you when Metro has to be restarted with `yarn watch:clean` because of that change, and warns if Metro is not running;
- runs `adb reverse tcp:8098 tcp:8098` for every attached Android device or emulator;
- prints the exact `FOXY_URL` line for a physical iPhone (your Mac's LAN address);
- downloads the core monorepo's `CODEOWNERS` into `scripts/foxy/.cache/` when there is no `../core` checkout, so `@metamask/*` calls get team chips;
- reports a busy port, or exits quietly when Foxy is already running;
- installs the `foxy` agent skill (`scripts/foxy/skill/skill.md`) into `.claude/skills`, `.agents/skills` and `.cursor/skills`, which are gitignored. Skip it with `FOXY_SKIP_SKILL=1`.

`node scripts/foxy/setup.mjs --check` prints the same checklist without changing anything.

Then:

1. Start the debug app (`yarn start:ios` / `yarn start:android`, no native rebuild is needed for JS changes). Android: re-run `yarn foxy` after plugging a device in. Physical iOS device: add the `FOXY_URL` line it printed to `.js.env` and restart Metro.
2. Fresh install (delete the app or wipe data), launch, and watch the Timeline. Press `M` (or the **Markers** button beside Filters) and drop a marker (e.g. `Onboarding visible`, `Wallet created`) as things happen to split the capture into phases. Press `?` for the in-app guide.

Keep Metro running on `:8081` (override with `FOXY_METRO`) so stacks are symbolicated to `app/...` and `@metamask/...` frames.

**Install it as an app.** The dashboard is a PWA. Open `http://localhost:8098` in Chrome or Edge and use the install icon in the address bar (or Safari's Share > Add to Dock on macOS). It opens in its own window, and the last shell still opens when the server is stopped. The install is tied to that exact address, so keep the port the same. The manifest, service worker and icons live in `server.mjs` and `pwa/`.

## Views / output

- **Timeline**: every request in order. The **Call site** column leads with the `method()` that called `fetch` and the file tail beneath it, with a color bar for where it lives (app, `@metamask/*`, third-party, project). Click a row for the full call chain (oldest caller first, wrapper frames collapsed) plus the request and response (query params, headers, body).
- **Code owners**: team chips come from CODEOWNERS for the file that made the call (`.github/CODEOWNERS` for `app/`, the core monorepo's for `@metamask/<pkg>`; set `FOXY_REPO` / `FOXY_CORE` if the paths differ). Third-party calls show the package name instead (for example `@segment/analytics-react-native`), plus dashed *via* chips for the team that owns the code that started them. `@metamask/*` packages with no CODEOWNERS entry show a dashed fox chip, and unmatched app files show `unowned`.
- **Sorting**: click a column header to sort by it (again for the other direction, a third time to go back to the default order). The Timeline always keeps its marker phases: ID and Time choose which end comes first, and any other column orders the requests inside each phase (phases stay newest first). Duration and count columns (Duration, Calls, Identical Dupes, Avg Duration) sort largest first. Rows with no value always sit last.
- **Columns**: drag a header label to reorder, drag a header edge to resize (or focus it and use the arrow keys), double-click an edge to reset that column, **Reset columns** restores the defaults. Layout is saved in the browser.
- **Endpoints**: grouped by `METHOD host/path` with call counts, *identical duplicate* counts, status mix, average latency, an activity lane (every call as a tick on the capture timeline; ringed ticks repeat an earlier identical request), call sites. Click a row for the full breakdown:
  - summary cards (calls, identical dupes with redundant ms/bytes, latency p95/max, burst size, first and last time, payload);
  - every call on a rail with when it happened (relative and wall-clock), the gap since the previous call (`⚡ same time` for bursts), status, size, call site and owner, with repeats flagged (`same as #N`); click a call to open it in the Timeline;
  - which query params change between calls and which stay the same, and who calls the endpoint;
- **Audit a phase** (Endpoints tab): focus a phase (its focus icon, or its row in the Markers panel), then turn on **Audit** beside the phase pill. Only then does the table get a **Verdict** column, and each endpoint's detail a **Verdict** panel with Keep / Defer / Move / Drop and a reason. The **?** beside the Verdict title opens a small legend of what the four mean. Endpoints without a verdict read "no verdict" and stay listed. Verdicts are kept per phase, in the browser (`foxy.audit.v1`), keyed by the marker's label, so the same endpoint can be Keep in one flow and Defer in another. They are included in the markdown and CSV exports.
  - Audit is a switch at the trailing edge of the filter row; turning it on or off animates the Verdict column, the panel and the Export button in and out. While it is on, an **Export Audit** button appears beside it and opens the same export dialog as every other download button (see **Exports**), scoped to the phase.
- **Identical** means the same method and URL. For POST/PUT/PATCH/DELETE the body must match too (size plus a hash of the captured preview); with no body information a non-GET request is never called identical, so JSON-RPC and analytics batches are not falsely flagged. Turn on `FOXY_BODIES` for the strongest check.
- **Filters**: ownership buttons (We own / Third-party / Unowned) with counts, plus Failed and Duplicates toggles. Clicking a team, package or status pill (in a row or its detail) filters by it; click it again to clear. A status pill filters by its kind (2xx, 4xx, Failed…) through the Filters panel.
- **Markers & phases**: a marker is a flag you drop while using the app; everything captured after it belongs to that phase until the next marker.
  - **Add**: press `M` or click **Markers**, type a label and press Enter, or tap a quick-add chip (your own labels are remembered). The *Now / 5s ago / 30s ago…* dropdown backdates a marker you noticed late.
  - **See**: each phase gets a colour. The activity strip shades the phases and labels their flags (click a flag to jump to it), the waterfall draws a line per marker, and the Timeline gets a collapsible header per phase with its time range, ownership mix, requests, new endpoints, identical dupes and failures (`🌙 quiet` when nothing was requested).
  - **Zoom**: **Only this** on a header (or the target icon in the panel) filters Timeline and Endpoints to that phase; Endpoints also has a Phase column showing where each endpoint first appeared.
  - **Edit**: rename a marker in the panel, delete it with the bin (neighbouring phases merge).
  - **End a phase**: the stop icon on the last phase (in its header, or in the Markers panel) closes it where you are, so a flow you are done with stops collecting. Everything after that moment, until the next marker, is **Between phases**, so idle traffic does not count toward the flow. Reopen with the icon that replaces it. Ending is one-way until reopened (a second End keeps the first time), and only the latest marker can be ended or reopened: an older phase is already closed by the marker after it, and reopening it would swallow the phases in between and scramble their order (the UI hides the icon on older phases and the server answers 409). `POST /api/marker/<id>/end` and `DELETE` (reopen).
  - **Export a phase**: the download icon on a phase header (or on its row in the Markers panel) opens the export dialog for that phase. Its *JSON, full detail* option saves every request of the phase in full: headers, bodies, the call chain with owners and GitHub links, plus the phase's totals. The last marker's phase is still collecting, so it saves what has arrived so far (`phase.open` is `true` and the file is named `…-so-far.json`); download it again later for more. The file is cut on the server, so Pause and the filters do not change it. Scripts can use `GET /api/export/phase?marker=<id>` (`marker=pre` for before the first marker, `&format=md` for the markdown table).
  - **Export**: see **Exports** below. Agents can add, list and end markers and export phases with the MCP tools (see **Agent access**).
  - **One time axis**: the activity strip, the Waterfall column and the Endpoints call lanes all share it, so a bar means the same moment everywhere. It is drawn to scale, except that a long stretch with no request running (more than 15s, or 5% of the capture) is shortened to a hatched break labelled `⋯ 1h 12m`, so a launch followed by an hour of idling and then a burst of activity does not squash the burst into a sliver. It only does this when it frees up at least a quarter of the width, so ordinary captures stay exactly to scale. Time labels always show real capture time. Filtering to one phase (**Only This**) zooms the axis to that phase.
  - Marker labels on the strip never overlap and never run off the window: they stack in up to three rows, flip to the left of their line near the right edge, and a marker with no room left keeps its line and shows as a dot (hover for its name).
  - Identical dupes are counted against the whole capture, so a repeat in a later phase of something fetched earlier is flagged.
- **Guide**: it opens on every launch until you tick *Don't show this guide when Foxy opens*; the `?` button (or the key) reopens it. It has illustrated topics (Start here, Markers & phases, Reading the Timeline, Endpoints & verdicts, Filters & duplicates, Shortcuts). To document another view, add an entry to the `HELP` array in `dashboard.html`; illustrations live in the `ART` object and are plain monospace strings with colour spans.
- **Time format**: the menu switches every time shown in the dashboard between `1m 23.4s`, `01:23.40` and plain seconds (`83.40s`). The choice is remembered; copied markdown always uses plain seconds.
- **Columns**: number-like columns (ID, Time, Method, Status, Duration, and Calls / Avg Duration / First in Endpoints) size themselves to the widest value in the capture, within a realistic range, so digits never clip as the numbers grow. The other columns share the remaining width and can be dragged to resize.
- **Default column order** reads left to right as when, who, what, outcome: Timeline is ID, Time, Code owners, Call site, Launched from, Method, Host, Path, Status, Duration, Waterfall. Endpoints is Phase, First, Code owners, Call sites, Endpoint, Calls, Identical dupes, Statuses, Avg Duration, Activity (plus Verdict while auditing). Saved layouts from older versions are ignored once so you get this order; **Reset columns** restores it any time.
- **Launched from view**: every request records the screen the app was showing when it was made. The Timeline's **Launched from** column shows it at a glance: the screen name, the navigators just above it, and an `on mount` flag when the request fired as the screen appeared (sortable by screen; a build that does not report it reads "(not reported)"). Open a request and the strip at the top of its detail names the screen, the navigator path to it (`Main › SwapsAmountView`), how long the screen had been showing (a request fired within half a second of a screen opening is flagged, since it is most likely triggered by mounting it), the app state when it is not in the foreground, and the screen's param *names* (never values). Requests made before the navigator mounted read "Before navigation was ready". The Filters panel has a **Screen** section, and the filter box matches screen names. The app side lives in `app/dev-tools/Foxy/FoxyView.ts` and is registered from `NavigationService` only when `FOXY="true"`. Rebuild the app once to start sending it; older captures show "Not reported".
  - **Package links**: call-chain frames from `node_modules` link to the package's source on GitHub. MetaMask packages (`@metamask/*`) link to the release tag in `MetaMask/core` at the line behind the published `dist` file, using its source map (for example `src/api/base-client.ts:194`). Packages from other repos link to the file and line at their release tag (`v<version>` or `<name>@<version>`, read with `git ls-remote` the first time a repo is needed) when they ship a source map. Anything else links to the release folder or the repository front page, and frames with no repository stay plain text. This is in `scripts/foxy/packages.mjs`.
  - **Source link**: the strip also shows where the screen is defined, as `file:line`, linked to that line on GitHub (the same `FOXY_GITHUB_*` settings as call-site links apply). Foxy works this out on the server by reading the `<Stack.Screen name component>` tags in `app/` (`scripts/foxy/views.mjs`), following imports, `#app/*` aliases and re-exports to the component's declaration, and shows a "Registered in" link when the navigator that mounts it is somewhere else. It is static analysis re-run at most every 15s, so lines follow your edits. Config-driven screens are read too: a `{ key, name }` object (such as a bottom tab definition) is joined to a `{ key: Component }` map on the same key, and a navigator that is itself a screen (`initialRouteName`) is followed to the screen it opens first. Screens none of these reach fall back to a file named after the route, labelled "Best match", and otherwise show no link.
- **Big captures**: the Timeline and Endpoints lists are virtualized, so only the rows near the viewport exist in the page (about 50, however long the capture). Scrolling, filtering and jumping to a request, phase or strip bar stay fast with tens of thousands of requests, and the view stays put when new requests arrive while you are scrolled down the list.
- **Play / pause**: the round button in the header freezes the view while Foxy keeps recording. A badge counts the requests being held. Press play and they appear, with a divider in the Timeline (when you paused, for how long, and how many requests arrived while paused) so you can tell them from what was already on screen.
- **Filters**: the button at the right of the filter row (or `F`) opens a panel styled like Markers. Pick several code owners, statuses, methods or hosts (any of them matches), flip a section to "Is not" to exclude instead, match owners on the call site, the code that started it, or either, and set a minimum duration. Star your teams in the list and the **My teams** quick filter shows only their requests (stored in the browser). Active filters appear as removable pills.
- **GitHub links**: in a request's call chain, the file path of every app and project frame opens that file at that line on GitHub (`#L<line>`, GitHub cannot highlight a column). Packages and `@metamask/*` frames stay plain text because their frames point at built `dist` files, not source. Foxy links to your `origin` repo at `HEAD` when it is on a remote branch, otherwise at the merge-base with `origin/main`, so the lines match the running code. Set `FOXY_GITHUB_REPO=owner/name` and `FOXY_GITHUB_REF=<branch|sha>` to override (for example once your branch is pushed). Unpushed local edits can shift line numbers.
- **Logo**: the header and guide use the animated MetaMask fox (`vendor/foxy-loading.riv`, played with the vendored Rive web runtime). It loops forever while the feed is live; when you pause, he stops and faces straight ahead (a second, never-played copy of the artboard, because the loop cannot be scrubbed to that pose), and he starts looking around again on play. People who prefer reduced motion get the still fox all the time, and falls back to the 🦊 emoji if the files are missing. Restart `yarn foxy` after pulling so the server serves `/vendor/*`.
- **Menu**: the hamburger holds the Theme picker (Dark, Light, Navy, Orange; saved in the browser), Time format, Reset columns, Export… and Clear (a fresh capture: request IDs start again at 1 and the clock at +0s from that moment). Durations show their unit (`212 ms`, then `1.24 s` from a second up). Keyboard: `1` and `2` switch between Timeline and Endpoints, `/` focuses the filter, `M` opens markers, `E` stops the running phase (press it again to resume it) and `P` pauses or resumes live updates. `Esc` closes whatever panel is open first; with nothing open it folds the row you opened in the current tab. The shortcuts are ignored while you type in a field.
- **Exports**: every download button (a phase header, a phase row in the Markers panel, the divider between phases, **Export Audit**, and **Export…** in the hamburger menu) opens one dialog. Pick a format, then tap the button at the bottom (it reads *Download JSON*, *Download CSV* or *Copy Markdown* to match). The format you pick is remembered for next time. The title shows what is being exported.
  - **JSON, full detail**: for a phase, every request in full (headers, bodies, call chain with owners and GitHub links) plus the phase totals; for the whole capture, `foxy-capture-<time>.json` with `foxy` (export time, session, platform, build), `summary`, `markers`, `phases` and `requests` in time order. Both ignore filters and Pause. Scripts: `GET /api/export/phase?marker=<id>` and `GET /api/export/capture` (`?session=<id>`, 404 for an unknown one).
  - **CSV, one row per request** (ID, time, clock, phase, method, host, path, query, status, error, duration, size, identical dupe, code owners, via, call site, started from) and **CSV, one row per endpoint** (phase, endpoint, calls, identical dupes, failed, statuses, avg and p95 ms, bytes, first call, owners, call site, verdict, reason). UTF-8 with a BOM so Excel reads it; any text that starts with `=`, `+`, `-` or `@` is prefixed with `'` so a spreadsheet never runs it as a formula.
  - **Markdown table**: copied, not saved. For a phase it is the audit table (phase window, counts by verdict, a row per endpoint with verdict and reason); for the whole capture it is the phases table plus the Endpoints table. Also `GET /api/export`.
  - **JSON for an agent** (phases only): the verdicts, reasons and call sites with instructions an AI agent can act on (`foxy-audit-<phase>.json`).
  - For the whole capture, when filters are active a checkbox offers to export only what they show (CSV and Markdown; the full JSON always has everything).
- Raw log: `scripts/foxy/logs/foxy.jsonl`.
- Replay an old capture into a running dashboard (no app needed): `node scripts/foxy/replay.mjs [logfile] [port]`.

## Agent access (MCP)

```bash
claude mcp add foxy -- node scripts/foxy/mcp.mjs
```

Tools:

| Tool | What it does |
|---|---|
| `network_list`, `network_get`, `network_summary`, `network_export_markdown` | Read the capture: requests, one request with its call stack, endpoints grouped, the markdown skeleton |
| `marker_add` | Drop a marker (`label`, optional `agoSeconds`). It starts a phase and closes the previous one |
| `marker_list` | The session's phases: id, label, start and end, `open`/`ended`, totals (requests, new endpoints, identical dupes, failed, bytes) and how many endpoints have a verdict |
| `marker_end` | End the newest marker's phase now (anything after it, until the next marker, is "Between phases"); `reopen: true` undoes it. Older markers answer with an error, as in the dashboard |
| `network_export_phase` | Everything one phase holds. `phase` is a marker id or label (or `pre`; part of a label works when only one phase has it; omit for the newest). `format: "json"` (default) writes the full records to a file and returns its path with the phase totals; `format: "md"` returns the markdown table inline. The newest phase is still collecting, so it reports `open: true` |
| `network_export_capture` | The whole session as a file (path, request/marker/phase counts, the phases) |
| `audit_get` | A person's audit of one phase: what the verdicts mean, then every endpoint the phase called with its verdict (`keep`, `defer`, `move`, `drop`, or `null` when unjudged), their reason, calls, identical dupes, statuses, owners and the call sites (function, file, line) to change. `phase` as in `network_export_phase`; `verdict` narrows it (`defer`, `judged`, `unjudged`…). The same document as the dashboard's *JSON for an agent* export. Small ones come back inline; a big one is written to a file |
| `network_clear`, `status` | Clear the capture; server status |

Big exports go to a file, not into the agent's context: `$TMPDIR/foxy/` by default, or `FOXY_EXPORT_DIR`. The file is named like the dashboard's download (for example `foxy-onboarding-visible.json`). A scripted run looks like: `marker_add` "Onboarding visible", drive the app, `marker_add` "Done" (which closes the previous phase), then `network_export_phase` with `phase: "Onboarding visible"`. If a phase name does not match, the error lists the phases that exist. Verdicts are given in the dashboard and synced to the server (kept in `logs/audit.json`, or `FOXY_AUDIT_FILE`, across restarts), so `audit_get` can read them.

## Limits

- Only JS-initiated requests are seen. Native-side prefetches (registered in `MainApplication.kt` / `AppDelegate.swift` before JS boots) are not.
- Stacks are the synchronous call stack at `fetch()` time; after an `await` you see the polling function, not the original trigger.
- Header names are recorded, but values for credential-like headers (authorization, cookie, api keys, tokens) are replaced with `[redacted]`.
- Request and response bodies are **off by default**. Set `FOXY_BODIES="true"` in `.js.env` to record capped previews. They can contain tokens or personal data, so use this only on throwaway wallets.

## Tests

`node --test scripts/foxy/*.test.mjs` and `yarn jest app/dev-tools/Foxy`.
