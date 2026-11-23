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
- **Sorting**: click a column header to sort by it (again for the other direction, a third time to go back to the default order). In the Timeline, `#` and Time keep the phases and choose which end comes first; any other column lists requests flat. Duration and count columns (ms, Calls, Identical Dupes, Avg ms) sort largest first. Rows with no value always sit last. A "Sorted by" pill next to the filters clears it.
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
- **Launched from view**: every request records the screen the app was showing when it was made. Open a request and the strip at the top of its detail names the screen, the navigator path to it (`Main › SwapsAmountView`), how long the screen had been showing (a request fired within half a second of a screen opening is flagged, since it is most likely triggered by mounting it), the app state when it is not in the foreground, and the screen's param *names* (never values). Requests made before the navigator mounted read "Before navigation was ready". The Filters panel has a **Screen** section, and the filter box matches screen names. The app side lives in `app/dev-tools/Foxy/FoxyView.ts` and is registered from `NavigationService` only when `FOXY="true"`. Rebuild the app once to start sending it; older captures show "Not reported".
  - **Package links**: call-chain frames from `node_modules` link to the package's source on GitHub. MetaMask packages (`@metamask/*`) link to the release tag in `MetaMask/core` at the line behind the published `dist` file, using its source map (for example `src/api/base-client.ts:194`). Other packages link to their repository. Frames with no repository stay plain text. This is in `scripts/foxy/packages.mjs`.
  - **Source link**: the strip also shows where the screen is defined, as `file:line`, linked to that line on GitHub (the same `FOXY_GITHUB_*` settings as call-site links apply). Foxy works this out on the server by reading the `<Stack.Screen name component>` tags in `app/` (`scripts/foxy/views.mjs`), following imports, `#app/*` aliases and re-exports to the component's declaration, and shows a "Registered in" link when the navigator that mounts it is somewhere else. It is static analysis re-run at most every 15s, so lines follow your edits. Config-driven screens are read too: a `{ key, name }` object (such as a bottom tab definition) is joined to a `{ key: Component }` map on the same key, and a navigator that is itself a screen (`initialRouteName`) is followed to the screen it opens first. Screens none of these reach fall back to a file named after the route, labelled "Best match", and otherwise show no link.
- **Big captures**: the Timeline and Endpoints lists are virtualized, so only the rows near the viewport exist in the page (about 50, however long the capture). Scrolling, filtering and jumping to a request, phase or strip bar stay fast with tens of thousands of requests, and the view stays put when new requests arrive while you are scrolled down the list.
- **Play / pause**: the round button in the header freezes the view while Foxy keeps recording. A badge counts the requests being held. Press play and they appear, with a divider in the Timeline (when you paused, for how long, and how many requests arrived while paused) so you can tell them from what was already on screen.
- **Filters**: the button at the right of the filter row (or `F`) opens a panel styled like Markers. Pick several code owners, statuses, methods or hosts (any of them matches), flip a section to "Is not" to exclude instead, match owners on the call site, the code that started it, or either, and set a minimum duration. Star your teams in the list and the **My teams** quick filter shows only their requests (stored in the browser). Active filters appear as removable pills.
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
