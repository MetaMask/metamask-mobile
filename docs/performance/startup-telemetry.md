# Startup telemetry

Startup is measured as two Sentry spans, so the time a user spends typing a password or on a biometric prompt is never counted:

- **Leg 1, `Cold Start To Unlock Ready`**: from process start until the app is waiting on the user, or until the splash is gone if that is later.
- **Leg 2, `Homepage Ready` started by an unlock**: from the moment the unlock has its password (the _hand-back_) until the homepage shows usable content.

The time between the two legs is the user, and is not measured. Both legs have one child span per stage, so each stage can be tracked, improved and measured again on its own. The login method does not change the stages.

```
process start                                                                  usable homepage
|-------- Leg 1: Cold Start To Unlock Ready --------|  user  |------- Leg 2: Homepage Ready -------|
 native_launch ... engine_initialization ...           (not   credential_decrypt | submit_to_unlock
 splash_reveal_tax, unlock_prompt_delay               measured)  vault_unlock ... homepage_content
```

| Code                                                                                               | What it does                                                          |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`app/core/Performance/startupStageSpans.ts`](../../app/core/Performance/startupStageSpans.ts)     | Records Leg 1 marks and sends the root span and its stages, once      |
| [`app/core/Performance/unlockTraces.ts`](../../app/core/Performance/unlockTraces.ts)               | Starts Leg 2 at the hand-back in `Authentication.unlockWallet`        |
| [`app/core/Performance/homepageReadyStages.ts`](../../app/core/Performance/homepageReadyStages.ts) | Records Leg 2 stages and adds them to `Homepage Ready` when it ends   |
| [`app/core/Performance/HomepageReady.ts`](../../app/core/Performance/HomepageReady.ts)             | Starts, ends and cancels `Homepage Ready`                             |
| [`app/util/trace.ts`](../../app/util/trace.ts)                                                     | Span names (`TraceName.Startup*`, `TraceName.HomepageReady*`) and ops |

## Leg 1: Cold Start To Unlock Ready

The root span is `Cold Start To Unlock Ready`, op `startup.cold_start`, sent as its own transaction. It is built from `performance.now()` marks once startup has ended, and sent at most once per JS runtime. Each stage is a child span with op `startup.stage`.

### Stages

Top-level stages follow each other, so their durations add up to the leg. The rest is `startup.unattributed_ms`.

| Stage                          | Span name                                | From → to                                                                                | Covers                                                                                                                                     | Stage data and tags                                                                                                                                                                        |
| ------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `native_launch`                | `Startup - Native Launch`                | `nativeLaunchStart` → `nativeLaunchEnd`                                                  | Native process start, before React Native                                                                                                  |                                                                                                                                                                                            |
| `host_setup`                   | `Startup - Host Setup`                   | `nativeLaunchEnd` → `runJsBundleStart`                                                   | React Native host and native module setup, until the bundle starts                                                                         |                                                                                                                                                                                            |
| `js_bundle_load`               | `Startup - JS Bundle Load`               | `runJsBundleStart` → `runJsBundleEnd`                                                    | Parsing and running the bundle's top level. Metro's inline requires move most module loading into the stage that first requires the module |                                                                                                                                                                                            |
| `post_bundle_gap` \*           | `Startup - Post Bundle Gap`              | `runJsBundleEnd` → `storeInitStart`                                                      | Between the bundle and the store starting                                                                                                  |                                                                                                                                                                                            |
| `store_initialization`         | `Startup - Store Initialization`         | `storeInitStart` → `persistComplete` (`createStoreAndPersistor` in `app/store/index.ts`) | Creating the Redux store, starting the root saga, and rehydrating the persisted Redux state                                                | `startup.store.configure_ms`, `startup.store.root_saga_ms`                                                                                                                                 |
| ↳ `redux_persist_rehydration`  | `Startup - Redux Persist Rehydration`    | `persistStart` → `persistComplete`                                                       | Child of `store_initialization`: redux-persist reading the root state, migrating and merging it                                            | `startup.persist.read_ms`, `startup.persist.chars`, `startup.persist.migrate_ms`                                                                                                           |
| `post_store_gap` \*            | `Startup - Post Store Gap`               | `persistComplete` → `navInitStart`                                                       | `PersistGate` opening and the tree rendering down to `NavigationProvider`                                                                  |                                                                                                                                                                                            |
| `navigation_initialization`    | `Startup - Navigation Initialization`    | `navInitStart` → `navReady` (`NavigationProvider` first render → `onReady`)              | The navigation container getting ready                                                                                                     |                                                                                                                                                                                            |
| `controller_state_rehydration` | `Startup - Controller State Rehydration` | `engineStart` → `controllerStateLoaded` (`EngineService.start`)                          | Reading and parsing every controller's persisted state                                                                                     | `startup.persisted_state.chars`, `.parse_ms`, `.controllers`, `.largest_chars`; tag `startup.persisted_state.largest_controller`                                                           |
| `engine_initialization`        | `Startup - Engine Initialization`        | `controllerStateLoaded` → `engineEnd` (`EngineService.start`)                            | The analytics ID, `Engine.init` (every controller), then wiring controllers to Redux and persistence                                       | `startup.engine.analytics_id_ms`, `.init_ms`, `.redux_and_persistence_ms`, `.controllers`, `.controllers_ms`, and `startup.engine.controller.<name>_ms` for the 8 slowest controller inits |
| `post_init_gap` \*             | `Startup - Post Init Gap`                | `engineEnd` → `servicesReady` (`startAppServices` saga)                                  | Starting `DeeplinkManager` and `AppStateEventProcessor`, and vault initialization                                                          | `startup.post_init.deeplink_manager_ms`, `startup.post_init.app_state_processor_ms`                                                                                                        |
| `root_navigator_first_render`  | `Startup - Root Navigator First Render`  | `servicesReady` → `appFirstCommit` (first effect of `App`)                               | `ControllersGate` rendering `App` once services are ready                                                                                  |                                                                                                                                                                                            |
| `splash_reveal_tax`            | `Startup - Splash Reveal Tax`            | `appFirstCommit` → `splashGone` (`ControllersGate` fade-out ends)                        | The rest of the fox animation, then the 300 ms fade                                                                                        | `startup.splash.fade_ms`; tag `startup.splash.completion`: `exit_animation`, `timeout`, `rive_error`                                                                                       |
| `unlock_prompt_delay` \*       | `Startup - Unlock Prompt Delay`          | `splashGone` → awaiting user                                                             | App work after the splash is gone and before the app asks the user for anything                                                            |                                                                                                                                                                                            |

\* **Derived**: the gap between two other stages. It is sent as a span only when positive; otherwise its `startup.stage.<stage>_ms` is 0.

The first four stages start from native marks recorded by [react-native-performance](https://github.com/oblador/react-native-performance). They are left out for a JS reload and when the native marks are missing, and the root then starts at the first JS mark.

The time between `navReady` and `engineStart` (the saga picking up both signals) is not a stage, and is counted in `startup.unattributed_ms`.

### Where Leg 1 ends

Leg 1 ends at the later of **splash gone** and **awaiting user**. Awaiting user is the moment the app starts waiting on the user, whichever login method is used:

1. **Keychain read** (biometrics, remember me, device passcode): the moment the password was requested, once the read returned a password or has been pending for 2 s. A read that is still pending is showing an OS prompt.
2. **Empty keychain read** (password-only users): the next route change after the read, normally to `Login`. With no route change within 2 s, the request time is used.
3. **No keychain read** (for example a new user): the first route change, such as `OnboardingRootNav`. `FoxLoader` routes are ignored.
4. **Nothing within 15 s of the splash being gone**: outcome `auth_timeout`, and the leg ends at splash gone.

With biometrics the keychain read often starts behind the splash, so the leg usually ends at splash gone (`startup.end_bound_by: splash`).

If `Homepage Ready` is still running when Leg 1 ends, or a keychain password has come back and the unlock has not reached the hand-back yet, sending Leg 1 waits for it, for at most 15 s. Sending a new transaction would otherwise stop the profile of the running `Homepage Ready`. The wait does not change any Leg 1 timestamps.

### Root span tags

Tags are strings or booleans, for filtering and grouping. Every stage span also carries the first seven, so stages split the same way as the root.

| Tag                           | Values                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `startup.schema`              | `1`. Bumped when the stages change                                                                                     |
| `startup.kind`                | `cold`, `js_reload`, `background_launch`                                                                               |
| `startup.outcome`             | `completed`, `new_user`, `backgrounded`, `auth_timeout`                                                                |
| `startup.legs_overlap`        | `true` when the unlock reached the hand-back before Leg 1 ended                                                        |
| `startup.anchor_suspect`      | Only when the start of the leg is doubtful: `missing_native_marks`, `native_marks_out_of_order`, `host_setup_over_30s` |
| `startup.state_size_bucket`   | Persisted controller state: `<100KB`, `100KB-1MB`, `1MB-5MB`, `5MB-20MB`, `20MB+`                                      |
| `wallet.account_bucket`       | `0`, `1`, `2-5`, `6-20`, `21-100`, `100+`                                                                              |
| `startup.end_bound_by`        | `splash`, `awaiting_user`, `background`                                                                                |
| `startup.awaiting_user_via`   | `credential_request`, `route:<name>`, `timeout`, `none`                                                                |
| `startup.credential_read`     | `none`, `returned`, `empty`, `unresolved`                                                                              |
| `startup.leg2`                | `started`; `missing` when the wallet unlocked without starting Leg 2; otherwise `not_applicable`                       |
| `startup.first_route`         | First route the app navigated to, such as `Login`, `HomeNav` or `OnboardingRootNav`                                    |
| `startup.open_stages`         | Stages that started and never ended, comma separated                                                                   |
| `startup.order_violations`    | Stages that ended before they started (sent with a duration of 0) or started before the previous stage ended           |
| `startup.backgrounded_during` | With outcome `backgrounded`: `credential_read` or `startup`                                                            |

### Root span data

Data values are numbers in ms. Milestones are ms after the start of the leg.

| Data                                                                                                                                                                                                      | Meaning                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `startup.duration_ms`                                                                                                                                                                                     | The whole leg. Use it instead of the span duration: Sentry can move the start of the first transaction after launch                     |
| `startup.stage.<stage>_ms`                                                                                                                                                                                | Each stage this startup measured                                                                                                        |
| `startup.unattributed_ms`                                                                                                                                                                                 | The leg minus its top-level stages                                                                                                      |
| `startup.native_splash_hidden_ms`, `startup.services_ready_ms`, `startup.splash_gone_ms`, `startup.credential_requested_ms`, `startup.awaiting_user_ms`, `startup.first_route_ms`, `startup.hand_back_ms` | Milestones                                                                                                                              |
| `startup.first_route_vs_splash_ms`                                                                                                                                                                        | First route change minus splash gone. Negative when the route changed behind the splash                                                 |
| `startup.auth_handoff_ms`                                                                                                                                                                                 | Services ready to awaiting user                                                                                                         |
| `startup.empty_read_ms`                                                                                                                                                                                   | How long an empty keychain read took                                                                                                    |
| `startup.seedless_precheck_ms`                                                                                                                                                                            | The saga's seedless password check, which runs before the keychain read                                                                 |
| `wallet.account_count`                                                                                                                                                                                    | Accounts once the engine is ready                                                                                                       |
| `startup.clock_drift_ms`                                                                                                                                                                                  | How far the clock offset moved between startup and sending. Normally 0; it moves on devices whose performance clock has no epoch origin |

## Leg 2: Homepage Ready after an unlock

`Homepage Ready` (op `homepage.performance`) is tagged `start_source: unlock` when an unlock starts it. It starts at the hand-back, in `Authentication.unlockWallet`, so every unlock path is covered:

- **Keychain** (biometrics, remember me, device passcode): when the keychain read returns.
- **Typed password**: when the user submits, passed by `Login` and `OAuthRehydration` as `handBackAt`. It defaults to when `unlockWallet` was called.

Rehydrating a wallet onto a new device is onboarding, so it gets no `Homepage Ready`.

Its tags are `start_source`, `app_start_type` (the first unlock in a JS runtime is `cold`, later ones `warm`), `unlock.before_navigate`, and, on a `cold` unlock, `startup.kind` from Leg 1.

### Stages

Each stage is a child span with op `homepage_ready.stage` and the same tags as its parent. A stage is only there when the unlock ran it.

| Stage                     | Span name                                  | From → to                                                                                | Runs for                                                                                            |
| ------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `submit_to_unlock`        | `Homepage Ready - Submit To Unlock`        | Password submitted → `unlockWallet` called. On `Login`, this includes its seedless check | Typed passwords                                                                                     |
| `credential_decrypt`      | `Homepage Ready - Credential Decrypt`      | Keychain read returned → password decrypted (`SecureKeychain.getGenericPassword`)        | Keychain unlocks                                                                                    |
| `seedless_rehydrate`      | `Homepage Ready - Seedless Rehydrate`      | `rehydrateSeedPhrase`                                                                    | Social login rehydration by an existing user. Rehydration onto a new device has no `Homepage Ready` |
| `seedless_password_check` | `Homepage Ready - Seedless Password Check` | The controller call in `checkIsSeedlessPasswordOutdated`                                 | Seedless users                                                                                      |
| `seedless_password_sync`  | `Homepage Ready - Seedless Password Sync`  | `syncPasswordAndUnlockWallet`, then reading the auth preference                          | Seedless users whose password was changed on another device                                         |
| `vault_unlock`            | `Homepage Ready - Vault Unlock`            | `loginVaultCreation`: unlocking the keyrings                                             | Every unlock                                                                                        |
| `unlock_finalize`         | `Homepage Ready - Unlock Finalize`         | Updating the auth preference, `dispatchLogin`, `setExistingUser`                         | Every unlock                                                                                        |
| `before_navigate`         | `Homepage Ready - Before Navigate`         | The caller's `onBeforeNavigate`                                                          | Callers that pass it. It can show an OS prompt, so exclude `unlock.before_navigate: true`           |
| `home_visible`            | `Homepage Ready - Home Visible`            | The metrics opt-in check and the navigation → the homepage focused (`useHomepageReady`)  | Every unlock that reaches the homepage                                                              |
| `homepage_content`        | `Homepage Ready - Homepage Content`        | The homepage focused → `Homepage Ready` ends with usable content                         | Every unlock that reaches the homepage                                                              |

### Data

| Data                        | Meaning                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `homepage.duration_ms`      | The whole leg, also on cancelled spans. Use it instead of the span duration, as for Leg 1                                                   |
| `homepage.stage.<stage>_ms` | Each stage this unlock ran                                                                                                                  |
| `homepage.unattributed_ms`  | The leg minus its stages: the short gaps between them                                                                                       |
| `success`, `content_state`  | `success: false` for `content_state: error`                                                                                                 |
| `reason`                    | On cancelled spans (`success: false`): `unlock_failed`, `metrics_opt_in`, `backgrounded`, `deeplink`, `navigated_away`. They have no stages |

## Building the flow in Sentry

In Sentry's Explore, query spans. Tags and data are both span attributes, so filter and group on the tags and chart percentiles of the data.

1. **Leg 1 headline.** Filter `span.op:startup.cold_start startup.outcome:completed startup.kind:cold !has:startup.anchor_suspect`, and chart p50, p75 and p95 of `startup.duration_ms`.
2. **Leg 1 breakdown.** With the same filter, chart p75 of every `startup.stage.<stage>_ms` and of `startup.unattributed_ms`. In stage order they read as the startup waterfall.
3. **Splits.** Group by `startup.state_size_bucket`, `wallet.account_bucket`, `startup.end_bound_by`, OS, device and release.
4. **One stage.** Filter `span.op:startup.stage` and the stage's span name, then look at its stage data and tags, and open sample traces for the waterfall.
5. **Leg 2 headline and breakdown.** Filter `span.op:homepage.performance start_source:unlock success:true app_start_type:cold startup.kind:cold unlock.before_navigate:false`, and chart p75 of `homepage.duration_ms`, every `homepage.stage.<stage>_ms` and `homepage.unattributed_ms`. Use `span.op:homepage_ready.stage` to look at one stage.
6. **Across releases.** Split by `startup.schema` when the stages changed between the releases compared.

The two legs are separate transactions. Chart them side by side rather than adding them per session.

## Reading the numbers

- **Nothing is sent without metrics consent.** Leg 1 is held until Sentry is set up and consent is known, and dropped if consent is declined. Leg 2 stage spans are only added when consent is already known to be given when `Homepage Ready` ends; the stage durations are in its data either way.
- **Backgrounded.** `startup.outcome: backgrounded` means the app went to the background before Leg 1 ended; leave it out. `inactive` does not count, since iOS Face ID passes through it. On Android the device credential screen is its own activity, so a pending keychain read that backgrounds the app counts as awaiting user.
- **JS reload.** `startup.kind: js_reload` follows an in-app reload, such as an iOS OTA update. Its native marks belong to the earlier process, so the native stages are left out.
- **Background launch.** `startup.kind: background_launch` means the app was not in the foreground before its services were ready, as when iOS launches it for a fetch or a push.
- **New users.** `startup.outcome: new_user` ends Leg 1 at onboarding, with no Leg 2.
- **Legs overlap.** With `startup.legs_overlap: true`, Leg 2 started before Leg 1 ended, and each leg is still right on its own. Adding them counts the overlap twice; `startup.hand_back_ms` shows where Leg 2 started.
- **Doubtful start.** Leave out samples with `startup.anchor_suspect`. `host_setup_over_30s` usually means the process started long before the user opened the app, as with iOS prewarming. `missing_native_marks` happens with a debugger attached.
- **15 s caps.** Awaiting user gives up 15 s after the splash is gone, and sending Leg 1 waits at most 15 s for Leg 2.
- **Locally.** Dev builds log the stages with `Logger.log` as `[startup] Cold Start To Unlock Ready: …`, so a change can be checked without Sentry. Dev builds are slower than release builds, so compare numbers from the same kind of build.

## Changing the stages

- Mark a new point with `markStartup`, time a step inside a stage with `timeStartupStep`, and add a string or boolean with `setStartupStageTag`. Leg 2 stages use `startHomepageReadyStage` and `recordHomepageReadyStage`.
- Numbers go in data and strings or booleans in tags: `trace()` turns numeric tags into measurements.
- When adding, removing or moving a stage, update `STAGES`, the span names in `app/util/trace.ts`, the tests and this page, and bump `STARTUP_SCHEMA`.
