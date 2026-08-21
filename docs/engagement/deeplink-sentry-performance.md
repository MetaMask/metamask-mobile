# Deeplink Sentry Performance

Duration telemetry for deeplink handling. Separate from product analytics (`DEEP_LINK_USED`) — see [Deep Link Analytics](../readme/deeplink-analytics.md).

**Module:** `app/core/Performance/DeeplinkPerformance.ts`
**Op:** `deeplink.performance`

A module-level singleton owns in-flight state (one Processed + one Navigated at a time). Call the module's functions; do not `trace({ name: TraceName.DeeplinkProcessed })` from a handler. Destination screens do not start or end these spans.

**Rule:** spans must not include human wait (password entry, interstitial think-time). Abandoned flows are left open; after 5 minutes (`TRACES_CLEANUP_INTERVAL`) they are marked `trace.timed_out` and dropped.

---

## Pipeline you need in order to read the spans

Intake is `handleDeeplink`. It stores the URL on `AppStateEventProcessor.pendingDeeplink` and dispatches `checkForDeeplink`.

From there the path splits on whether the wallet is unlocked:

|                      | Locked (pending link waits)                                 | Already unlocked                              |
| -------------------- | ----------------------------------------------------------- | --------------------------------------------- |
| **Navigated starts** | Unlock submit (password / biometric / OAuth), not at intake | Intake in `handleDeeplink`                    |
| **Processed starts** | `DeeplinkManager.resolve()` after unlock                    | `DeeplinkManager.parse()` from the saga       |
| **Navigation**       | `executeStartupDeeplinkIntent` → `navigation.reset`         | handler `navigate` or `executeDeeplinkIntent` |

`parse` **executes** the link (legacy handlers navigate inside the call). `resolve` only **builds** a `DeeplinkIntent` when the handler supports it, then startup execution runs later.

> **Current behavior:** the locked-path `resolve()` column above is design intent, not what ships today. On unlock, the deeplink saga wins the race: it forks `parseDeeplinkAfterNavReady` (carrying the captured unlock-session `app_start_type`) and clears `pendingDeeplink` (`app/store/sagas/index.ts`) before `navigateToPendingStartupDeeplink` reads it. Locked/cold links therefore go through `parse` after the post-unlock Home reset, and **`start_source: resolve` is never emitted** — expect zero such spans in Sentry. The startup-resolve code stays in place (it would skip the Home flash for `intent/` routes); making it win the race is a possible follow-up, not current behavior.

Handlers live in two buckets:

- **`handlers/intent/`** — return a `DeeplinkIntent` (`target.routeName` + optional `prepare()`). Both warm execute and startup execute go through `executeDeeplinkIntent.ts`.
- **`handlers/legacy/`** — navigate themselves inside parse. No shared pre-navigate seam.

Universal links can show a confirmation modal in `handleUniversalLink` (PUBLIC always; PRIVATE unless the user disabled it). That gate sits in the middle of processing.

[Deeplink Handling Guide](../readme/deeplinking.md) covers protocols, signatures, and adding handlers. This page only covers the clocks around that pipeline.

---

## What we track

| TraceName                     | Measures                                                                  | Fires for                       |
| ----------------------------- | ------------------------------------------------------------------------- | ------------------------------- |
| **Deeplink Processed**        | App work from `parse`/`resolve` entry until immediately before navigation | Every deeplink                  |
| **Deeplink Navigated**        | Last blocking user action until the navigation state **commits**          | Every deeplink that navigates   |
| **Deeplink Signature Verify** | Child of Processed: `verifyDeeplinkSignature`                             | When a Processed parent is open |
| **Deeplink Intent Prepare**   | Child of Processed: `intent.prepare()`                                    | When a Processed parent is open |

Processed and Navigated set `forceTransaction: true` so a cold launch does not nest them under the still-open `UI Startup` transaction. Child spans nest under Processed via `parentContext`; they are skipped when no parent is open (including while the interstitial is up).

Navigated is a navigation-state commit, not first paint.

---

## Deeplink Processed

**Start:** `DeeplinkManager.parse` → `start_source: parse`. `DeeplinkManager.resolve` → `start_source: resolve` (currently unreached — see the current-behavior note above). A second start while one is in flight is a no-op (recursive parse: send → `ethereum:`, WalletConnect unwrap).

**End (first seam wins):**

| `seam`             | Where                                                                                               | Who                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `pre_navigate`     | After `intent.prepare()`, immediately before navigate/reset, in `prepareIntentAndEndProcessedTrace` | `intent/` handlers                                        |
| `handler_finished` | When `parse()` returns                                                                              | `legacy/` handlers (includes their own `navigate()` call) |

`resolve()` does **not** end Processed on success. The span stays open until `executeStartupDeeplinkIntent` hits `pre_navigate`. If `parse()` later calls `handler_finished` after `pre_navigate` already fired, that end is a no-op.

**Cancel:** `rejected` (parse/resolve returned false), `unresolved` (resolve produced no intent), `error` (startup throw). Cancel **always cascades** to Navigated — a link that will not navigate must not leave Navigated waiting.

---

## Deeplink Navigated

**Start when locked:** unlock submit via `startUnlockDeeplinkTraces` (Login password, Login biometric, OAuth rehydration). `start_source: unlock`. `navigateToPendingStartupDeeplink` also calls `startDeeplinkNavigatedTrace`; the in-flight guard makes that a no-op when Login/OAuth already started it (covers saga-driven biometric auto-unlock, which never hits an unlock screen).

**Start when already unlocked:** `handleDeeplink` after duplicate-delivery and MWP short-circuits, only if `user.userLoggedIn`. `start_source: intake`, `app_start_type: warm`. This **includes** saga waits (SDK warm-up, MainNavigator ready) because the user sits through them.

**Does not start** for links that never navigate: protocols `wc:` / `ethereum:`, actions `wc` / `bind` / `connect` / `mmsdk`.

**End:** `NavigationProvider` `onStateChange` → `handleDeeplinkNavigationStateChange`, which walks the focused route chain (root → leaf).

| `nav_target` | Close when                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| `known`      | Chain contains the intent's `target.routeName` (not leaf-only: nested navigators focus a child of that route) |
| `inferred`   | No intent target. First commit **after** Processed has closed                                                 |

**Cancel:** `unlock_failed` is token-scoped so a stale failed attempt cannot close a newer submit's span. Every Processed cancel also cancels Navigated.

`startUnlockDeeplinkTraces` always starts **Homepage Ready** as well. Navigated starts only when a pending deeplink will divert the launch. Failed unlock cancels both (`cancelUnlockDeeplinkTraces`).

---

## Interstitial split

The confirmation modal is human wait inside what Processed would otherwise measure. Processed **splits** around it:

```
start → phase: single ── markDeeplinkInterstitialShown() ──► awaiting_continue
              │ end as segment:before_gate                        │
              │ (ungated path ends here as segment:full)          │ no span open
              ▼                                                   │
       segment: full                         markDeeplinkInterstitialContinued()
                                                                  ▼
                                                           phase: after_gate
                                                           (second Processed span)
                                                                  │ end(seam)
                                                                  ▼
                                                           segment: after_gate
```

- Modal will show (PUBLIC, or PRIVATE with interstitial enabled) → two Processed transactions: `before_gate` then `after_gate`.
- Modal skipped (trusted source, whitelist, PRIVATE + disabled) → one transaction, `segment: full`, `interstitial: skipped`. `markDeeplinkInterstitialContinued` is a no-op if shown never ran.
- User taps Back → `before_gate` already ended as a valid measurement; no `after_gate`; Navigated cancels as `interstitial_rejected`. Rejection rate = `count(before_gate) − count(after_gate)`.

Marks run in `handleUniversalLink` under the same PUBLIC / PRIVATE+disabled conditions analytics uses for `interstitialShown`.

Navigated is **not** split. Gated Navigated includes modal dwell. App-side processing time for those links is `before_gate + after_gate`.

---

## Tags

Set at **start** on Processed and Navigated. `start_source` uses **different value sets** on each trace — do not query them as one enum.

| Tag                | Values                                                           | Meaning                                                                                                     |
| ------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `deeplink_route`   | `trending`, `perps`, `home`, … / `unknown`                       | Path of a universal link, or host of `metamask://`. Unparseable URLs stay measured as `unknown`.            |
| `deeplink_variant` | `crypto`, … / `default`                                          | `?screen=` or `?tab=`. Must match `^[a-z][a-z-]{0,23}$` or it becomes `default` (navigation does the same). |
| `signed`           | `true` / `false`                                                 | URL has a `sig` param.                                                                                      |
| `start_source`     | Processed: `parse` \| `resolve`. Navigated: `unlock` \| `intake` | Which entry point opened **this** span. `resolve` is reserved and currently never emitted.                  |
| `app_start_type`   | `cold` \| `warm`                                                 | JS **process** temperature. Not parse vs resolve, and not locked vs unlocked.                               |

`deeplinkUrlTags(uri)` builds the URL tags.

Set at **end** (unknown at start):

| Attribute       | On              | Values                                                                          |
| --------------- | --------------- | ------------------------------------------------------------------------------- |
| `success`       | both            | `true` / `false`                                                                |
| `seam`          | Processed       | `pre_navigate` / `handler_finished`                                             |
| `segment`       | Processed       | `full` / `before_gate` / `after_gate`                                           |
| `interstitial`  | Processed       | `shown` / `skipped`                                                             |
| `target_route`  | both            | Intent route name when known                                                    |
| `nav_target`    | Navigated       | `known` / `inferred`                                                            |
| `focused_route` | Navigated       | Leaf route at close                                                             |
| `reason`        | both, on cancel | `rejected` / `unresolved` / `error` / `interstitial_rejected` / `unlock_failed` |

### `app_start_type`

Same definition as Login (`loginPerformanceTags.ts`): `cold` until the first login interaction in this JS process completes, then `warm`. Lock-then-unlock in a live process is `warm`.

Login flips `getLoginAppStartType()` to warm at submit, so deeplink code **captures** the type at unlock (`rememberUnlockDeeplinkAppStartType`) and reads it later (`getUnlockDeeplinkAppStartType`). In practice the saga reads it when forking the post-unlock `parse` (`consumeNextParseAppStartType() ?? getUnlockDeeplinkAppStartType()`); `resolve()` would also use it if it ever ran. Already-unlocked intake and ordinary saga `parse()` are `warm`.

`clearUnlockDeeplinkAppStartType()` runs on failed unlock, interstitial reject, successful startup execute, and no pending deeplink. It does **not** always pair with `clearPendingDeeplink`.

---

## Leftover parse

This sequence only runs when startup `resolve` actually sees the pending link. Today it does not (see the current-behavior note): the saga clears `pendingDeeplink` first and forks `parse` directly, passing the unlock-session type via the `getUnlockDeeplinkAppStartType()` fallback. The steps below describe the latent startup-resolve path.

Startup `resolve` only produces an intent for `intent/` handlers. For a leftover `legacy/` link (or a throw during startup execute):

1. Processed cancels (`unresolved` or `error`) and cascades to Navigated.
2. Home resets. Pending is kept (except interstitial reject, which clears it so the modal does not show twice).
3. `markNextParseAsUnlockSession()` then the saga `consumeNextParseAppStartType()` **before** clearing pending, and passes that type into `parse()`.
4. A **new** Processed span starts (`start_source: parse`, unlock-session `app_start_type`). Navigated is **not** restarted.

A startup throw must **not** clear the remembered type — leftover parse still needs it.

---

## Call sites

| File                                 | What it does                                                                                        |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `DeeplinkManager.parse` / `.resolve` | Processed start; parse ends `handler_finished` or cancels `rejected`; resolve stays open or cancels |
| `executeDeeplinkIntent.ts`           | Prepare child, record Navigated target, Processed `pre_navigate`                                    |
| `handleUniversalLink.ts`             | Signature child; interstitial shown / continued                                                     |
| `handleDeeplink.ts`                  | Navigated `intake` if already unlocked                                                              |
| `unlockDeeplinkTraces.ts`            | Unlock submit: Homepage Ready; Navigated if pending; remember `app_start_type`                      |
| Login / OAuthRehydration             | Call `startUnlockDeeplinkTraces` / `cancelUnlockDeeplinkTraces`                                     |
| `startupDeeplinkNavigation.ts`       | Auto-unlock Navigated fallback; error cancel; leftover-parse flag                                   |
| `app/store/sagas/index.ts`           | Forwards leftover `appStartType` into parse before clearing pending                                 |
| `NavigationProvider.tsx`             | Navigated close on `onStateChange`                                                                  |

---

## Querying in Sentry

In **Performance** or **Discover**, the transaction name is the TraceName string (`Deeplink Processed`, `Deeplink Navigated`). `op` is `deeplink.performance`.

### What you can filter as tags

These are set at **span start**:

| Tag                        | Typical filters                                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `deeplink_route`           | `home`, `trending`, `perps`, …                                                                                                    |
| `deeplink_variant`         | `crypto`, `default`, …                                                                                                            |
| `signed`                   | `true` / `false`                                                                                                                  |
| `start_source`             | Processed: `parse` / `resolve` (`resolve` currently never emitted). Navigated: `unlock` / `intake`. Different enums — do not mix. |
| `app_start_type`           | `cold` / `warm` (JS process, not locked vs unlocked)                                                                              |
| `segment` / `interstitial` | Start tags **only** on the `after_gate` span (`segment:after_gate`, `interstitial:shown`)                                         |

```
transaction:"Deeplink Processed" deeplink_route:trending start_source:parse
transaction:"Deeplink Navigated" start_source:unlock app_start_type:cold
transaction:"Deeplink Processed" segment:after_gate
```

### What is span data, not a start tag

`endTrace` writes these with `setAttribute`. Open a transaction to read them. Do not assume they work as Discover tag filters (`seam:pre_navigate` is **not** a start tag):

| Attribute       | How to use it                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------- |
| `success`       | Drop `false` from latency percentiles (cancels).                                                    |
| `seam`          | `pre_navigate` = exact (intent). `handler_finished` = legacy, includes that handler's `navigate()`. |
| `segment`       | `full` = ungated. `before_gate` / `after_gate` = split. `before_gate` and `full` are end data only. |
| `interstitial`  | `shown` / `skipped` on the span that closed that segment.                                           |
| `nav_target`    | `known` (intent route in the focused chain) vs `inferred` (first commit after Processed closed).    |
| `focused_route` | Leaf route at Navigated close — check this when `inferred` looks wrong.                             |
| `reason`        | Why a cancel happened.                                                                              |
| `target_route`  | Intent route when known.                                                                            |

### Which number answers which question

| Question                                                      | Look at                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How long did the app spend processing this link?              | Processed. For intent routes prefer `seam: pre_navigate`. For gated links **sum is not automatic**: one user action produces **two** Processed transactions (`before_gate` + `after_gate`). A p90 of all `Deeplink Processed` mixes `full`, `before_gate`, and `after_gate`. |
| Did the user reject the interstitial?                         | `count(before_gate) − count(after_gate)`. Back does not emit a separate cancel on Processed.                                                                                                                                                                                 |
| How long until navigation committed after the user unblocked? | Navigated. Locked start: `start_source:unlock`. Already unlocked: `start_source:intake`. Prefer `nav_target: known`.                                                                                                                                                         |
| Cold process vs lock-then-unlock?                             | `app_start_type`, not `start_source`.                                                                                                                                                                                                                                        |
| Was this the leftover legacy execute after startup resolve?   | Processed with `start_source:parse` after a cancelled resolve. That span is **not** tap-to-navigation; Navigated was already cancelled. (Latent path — does not occur today, see the current-behavior note.)                                                                 |

### Pitfalls when reading charts

- **Gated Navigated includes interstitial dwell.** App-only time for those links is Processed `before_gate` + `after_gate`, not Navigated.
- **`nav_target: inferred`** on a gated **legacy** link can close one frame early when the modal dismisses. `focused_route` is the pre-modal screen if that happened.
- **Cancels** (`success: false`) are real transactions. Exclude them from “how slow is processing” charts.
- **Abandons** do not appear: they time out and are dropped.
- **Child spans** (`Deeplink Signature Verify`, `Deeplink Intent Prepare`) nest under Processed. They are not a substitute for the parent duration.

---

## Changing this

Processed and Navigated already run for every deeplink. A new route usually needs no new traces.

| Change                         | What to do                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Add an `intent/` handler       | Nothing. `executeDeeplinkIntent` already ends Processed at `pre_navigate` and sets `target_route`.      |
| Add a `legacy/` handler        | Nothing. It closes at `handler_finished` until you migrate it.                                          |
| Migrate legacy → intent        | Seam becomes `pre_navigate` with no telemetry change. Prefer that over a one-off end.                   |
| Time a stage inside processing | Child span with `parentContext: getDeeplinkProcessedTraceContext()`. Skip if missing.                   |
| New `?tab=` / `?screen=` value | Keep `^[a-z][a-z-]{0,23}$` or the tag and navigation both become `default`.                             |
| Link that never navigates      | Add the action or protocol to the skip lists in `DeeplinkPerformance.ts`.                               |
| New `TraceName`                | Add it in `app/util/trace.ts` and a row to the catalog above. Go through the module, not raw `trace()`. |

Do not start a second Processed/Navigated pair from a screen. Do not hardcode `app_start_type: 'cold'` on parse/resolve. Do not end Processed at modal present except via `markDeeplinkInterstitialShown`.

### Reviewing a change

1. Processed still starts only in `parse`/`resolve`, with `start_source` matching the method.
2. Intent paths still end at `pre_navigate` after `prepare()`, not after navigate.
3. Interstitial shown/continued still match whether the modal actually shows.
4. Navigated still starts at unlock submit when locked, intake only when `userLoggedIn`.
5. Every Processed cancel still cascades to Navigated.
6. `app_start_type` is still captured at unlock and reused on resolve and leftover parse; leftover consume still happens before pending is cleared; a throw still keeps the remembered type.
7. In-flight guards still make recursive parse and the auto-unlock fallback no-ops.
8. Skip list still covers links that never navigate.

---

## Related

- [Deeplink Handling Guide](../readme/deeplinking.md)
- [Deep Link Analytics](../readme/deeplink-analytics.md)
- [Measuring performance](../performance/measuring.md) — `trace()` / `endTrace()`

## Code

- [`DeeplinkPerformance.ts`](../../app/core/Performance/DeeplinkPerformance.ts)
- [`unlockDeeplinkTraces.ts`](../../app/core/Performance/unlockDeeplinkTraces.ts)
- [`DeeplinkManager.ts`](../../app/core/DeeplinkManager/DeeplinkManager.ts)
- [`executeDeeplinkIntent.ts`](../../app/core/DeeplinkManager/utils/executeDeeplinkIntent.ts)
- [`startupDeeplinkNavigation.ts`](../../app/core/DeeplinkManager/utils/startupDeeplinkNavigation.ts)
- [`handleDeeplink.ts`](../../app/core/DeeplinkManager/handlers/handleDeeplink.ts)
- [`handleUniversalLink.ts`](../../app/core/DeeplinkManager/handlers/handleUniversalLink.ts)
- [`NavigationProvider.tsx`](../../app/components/Nav/NavigationProvider/NavigationProvider.tsx)
- [`app/store/sagas/index.ts`](../../app/store/sagas/index.ts) — leftover `appStartType` into parse
- [`trace.ts`](../../app/util/trace.ts) — `TraceName.Deeplink*` / `TraceOperation.DeeplinkPerformance`
