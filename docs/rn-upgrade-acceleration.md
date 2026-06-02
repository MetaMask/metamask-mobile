# React Native Upgrade Acceleration Plan

MetaMask Mobile | Mobile Platform Team | June 2026

---

## 1. Overview

React Native upgrades are the most expensive recurring engineering task in MetaMask Mobile. The 0.81.5 upgrade took 2.5 months. The one before it was deferred for 22 months -- five major RN versions were skipped because the pain was too high. This creates a vicious cycle: upgrades are painful, teams defer them, versions accumulate, the next upgrade is worse.

### Where upgrade time goes today (6-10 weeks)

| Phase                                              | Cost      | Root cause                                     |
| -------------------------------------------------- | --------- | ---------------------------------------------- |
| Native file surgery (22 files in android/ + ios/)  | 2-4 weeks | Manually maintained native directories         |
| Library compatibility debugging (72 outdated deps) | 1-2 weeks | Dependencies not kept current between upgrades |
| Patch file audit and recreation (28 patches)       | 1 week    | Patches compensate for stale libraries         |
| Test fixes (Detox, snapshots, Enzyme, mocks)       | 1-2 weeks | Test infrastructure coupled to RN internals    |
| CI/CD + build verification                         | 1-2 weeks | Build tooling tied to native project structure |

### Four initiatives ranked by effort-to-impact ratio

| Rank | Initiative            | Effort        | Saves per upgrade | Risk     | Sprint-friendly? | Payback     |
| ---- | --------------------- | ------------- | ----------------- | -------- | ---------------- | ----------- |
| 1    | Expo Library Swaps    | **3-4 weeks** | 6-10 days         | Low      | Yes              | 1st upgrade |
| 2    | Library Updates       | 6-7 weeks     | 8-10 days         | Low      | Yes              | 1st upgrade |
| 3    | Testing Modernization | 10 weeks      | 5-9 days          | Low      | Yes              | 1st upgrade |
| 4    | Expo CNG              | 8-12 weeks    | **4-7 weeks**     | **High** | No               | 2nd upgrade |

**Expo Library Swaps** have the best ratio: least effort (3-4 weeks), high savings (6-10 days), zero risk on quick swaps. **Library Updates** is the broadest foundation -- nothing else works well on stale deps. Both can start now in parallel. **Testing** is independent and runs alongside everything. **CNG** is the transformational long-term win but depends on the first two being done, requires a dedicated branch, and only pays back on the second upgrade.

### Dependency chain

Initiatives 1 and 2 run in parallel and must complete before CNG. Testing is fully independent.

```
Library Updates [2] --+
                      +--> Expo CNG [4]
Expo Swaps [1]  -----+

Testing [3] --- runs in parallel, independent of all three
```

### Projected upgrade time

| After completing             | Upgrade time  |
| ---------------------------- | ------------- |
| Nothing (today)              | 6-10 weeks    |
| Library Updates + Expo Swaps | ~3-5 weeks    |
| + Testing Modernization      | **2-3 weeks** |
| + CNG                        | **1-2 weeks** |

### Total investment

| Initiative            | One-time cost        | Ongoing cost       | Saves per upgrade |
| --------------------- | -------------------- | ------------------ | ----------------- |
| Expo Library Swaps    | 3-4 weeks            | None               | 6-10 days         |
| Library Updates       | 6-7 weeks            | 3-4 weeks/year     | 8-10 days         |
| Testing Modernization | 10 weeks             | None               | 5-9 days          |
| Expo CNG              | 8-12 weeks           | None               | 4-7 weeks         |
| **All four**          | **~28-33 eng-weeks** | **3-4 weeks/year** | **6-8 weeks**     |

### Top risks

| Risk                                                           | Mitigation                                                      |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| `react-native-keychain` Expo migration loses vault credentials | Defer -- needs dedicated security RFC                           |
| CNG started before library work is done                        | Do not start until Initiatives 1+2 complete                     |
| Detox breaks on next RN (documented: 0.80, 0.81, 0.82)         | Complete Maestro smoke migration first                          |
| Crypto lib updates break wallet operations                     | Security team sign-off before merge                             |
| CNG product flavor complexity (prod + flask)                   | Spike first -- Prebuild doesn't support Gradle flavors natively |

---

## 2. Library Updates

**Effort: 6-7 weeks | Saves: 8-10 days per upgrade | Risk: Low | Payback: 1st upgrade**

72 outdated native dependencies, 33 one or more major versions behind. When an RN upgrade forces bumping a library from v9 to v15, the team debugs six major versions of breaking changes simultaneously with the RN migration. Example: `react-native-device-info` at v9 (latest v15) -- six versions of API removals, Kotlin rewrite, namespace migration, and architecture changes that would each be a 1-hour update done individually but become multi-day sessions during an upgrade.

### Update plan

| Wave                 | What                                                                                        | Effort          | Risk   |
| -------------------- | ------------------------------------------------------------------------------------------- | --------------- | ------ |
| Patches + Minors     | 29 libs in 5 grouped PRs by domain                                                          | 3 days          | None   |
| Critical Majors      | device-info (v9->15), firebase (v20->24), share (v7->12), mmkv (v3->4), permissions (v3->5) | 2 weeks         | Medium |
| High-Priority Majors | async-storage, branch, pager-view, lottie, ledger, veriff                                   | 2 weeks         | Medium |
| Crypto Majors        | quick-crypto, fast-crypto, keychain (security review required)                              | 1 week          | High   |
| Low-Priority         | UI/utility libs (confirmation-code, progress, url-polyfill, qrcode-svg)                     | 1.5 days        | Low    |
| Deferred             | 10 RN-pinned libs + reanimated v4, vision-camera v5 (need New Arch)                         | With RN upgrade | --     |

One PR per library for majors -- isolates breakage, easy to revert. Patches and minors can ship this week. Crypto libs require security team sign-off.

### Ongoing maintenance

Monthly dependency reviews (3-4h), quarterly deep audits (1 day), major updates as released (0.5-2 days each). Recommend Renovate bot with auto-merge for patches. Annual cost: ~3-4 weeks/year.

### Impact

| State                          | Library compat phase during upgrade |
| ------------------------------ | ----------------------------------- |
| Today (72 outdated)            | 1-2 weeks                           |
| After catchup                  | 1-2 days                            |
| Steady state (monthly updates) | 0.5-1 day                           |

---

## 3. Expo Library Migration

**Effort: 3-4 weeks | Saves: 6-10 days per upgrade | Risk: Low | Payback: 1st upgrade**

84 community `react-native-*` libraries each have their own release cycle and compatibility story -- version compat with new RN versions is discovered by trial and error. Expo SDK libraries ship as a coordinated, pre-tested set per RN version. Version alignment is automatic via `npx expo install`.

MetaMask already uses 17 Expo packages. The autolinking infrastructure and `app.config.js` are in place. Adding more is incremental.

### Migration plan

| Phase            | Libraries out -> in                                                                                                                                                 | Effort   | Risk   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| **Quick swaps**  | linear-gradient -> expo-linear-gradient, share -> expo-sharing, in-app-review -> expo-store-review, quick-base64 -> expo-crypto, launch-arguments -> expo-constants | 3 days   | None   |
| **Medium swaps** | vector-icons -> @expo/vector-icons, device-info -> expo-device + expo-application, get-random-values -> expo-crypto                                                 | 4 days   | Low    |
| **Cleanup**      | Remove react-native-fs, sensors, inappbrowser (Expo equivalents already installed)                                                                                  | 1.5 days | Low    |
| **Permissions**  | react-native-permissions -> Expo per-module permission APIs                                                                                                         | 3-5 days | Medium |
| **Keychain**     | DEFERRED -- expo-secure-store uses different storage backends; swapping without data migration makes vault credentials unreachable. Needs dedicated security RFC.   | --       | High   |

### What cannot be replaced

| Category                                                    | Why                                                                           |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Crypto (quick-crypto, fast-crypto, aes-crypto, randombytes) | Low-level OpenSSL/JSI for key derivation, AES encryption. No Expo equivalent. |
| Bluetooth (ble-plx)                                         | Only mature RN BLE library. Required for Ledger.                              |
| MetaMask forks (webview, payments, acm)                     | Custom security modifications.                                                |
| Vendor SDKs (firebase, branch, braze, veriff)               | Wrap specific third-party SDKs.                                               |

### Impact

After migration: Expo SDK coverage rises from 20% to 34% of native deps. `npx expo install` manages version alignment for 1/3 of all native deps. Patch file count drops by 2-4 files.

Industry validation: Alan (90 engineers) saved 30h/month after migration. Ornikar upgraded Expo 50->52 with developers who had never done native upgrades. Callstack client saw build success rate go from 63% to 97%.

---

## 4. Expo CNG (Continuous Native Generation)

**Effort: 8-12 weeks | Saves: 4-7 weeks per upgrade | Risk: High | Payback: 2nd upgrade**

The single largest upgrade cost is manual native file surgery: 22 files, 3,200+ lines, AppDelegate rewrites, 9 Gradle files, 2,600-line Podfile.lock diffs, 28 patch files, and days of post-merge CI fixups. CNG eliminates this entirely -- native directories are generated on-demand from `app.config.js` + config plugins and never committed to git.

An RN upgrade becomes: update dependencies, run `npx expo prebuild --clean`, build and test.

### Before vs after

| Dimension                       | Current                         | With CNG                |
| ------------------------------- | ------------------------------- | ----------------------- |
| Native files edited per upgrade | 22                              | 0 (regenerated)         |
| Branch lifetime                 | 2.5 months, 30+ merge conflicts | Days                    |
| Podfile.lock / pbxproj diffs    | Thousands of lines              | None (fresh generation) |
| Patch files audited             | 28                              | JS-only (~10-15)        |
| Post-merge CI fixups            | 3-5 days                        | 0-1 day                 |
| **Upgrade effort**              | **6-10 weeks**                  | **2-3 weeks**           |

Does NOT solve: crypto lib friction, BLE compatibility, E2E/QA time, JS-only patches.

### MetaMask-specific challenges

MetaMask is significantly more complex than a typical Expo app. The initial prebuild will almost certainly not build.

| Challenge                                                                          | Complexity |
| ---------------------------------------------------------------------------------- | ---------- |
| Product flavors (prod + flask) -- Prebuild doesn't support Gradle flavors natively | High       |
| 10+ signing configurations -- must become env-driven config plugins                | High       |
| 6 custom native modules -- must convert to Expo Modules API                        | High       |
| Branch, Braze, Firebase, Sentry, Veriff, LavaMoat -- each needs a config plugin    | High       |
| Two iOS targets (MetaMask + MetaMask-Flask) -- CNG generates one by default        | High       |
| 23 patch files -- each audited post-prebuild                                       | Medium     |

### Implementation phases

| Phase           | What                                                                   | Effort         |
| --------------- | ---------------------------------------------------------------------- | -------------- |
| Spike           | Run prebuild, document gap, scope work, decide Flask strategy          | 1 week         |
| Native modules  | Convert 6 modules to Expo Modules API                                  | 3-4 weeks      |
| Config plugins  | ~15 plugins for all native customizations                              | 3-4 weeks      |
| Product flavors | Env-driven app.config.js (recommended) or Gradle flavor plugin         | 1-2 weeks      |
| Validation      | Full CI, all flavors/environments, E2E, OTA, push, deep links, signing | 1-2 weeks      |
| **Total**       |                                                                        | **8-12 weeks** |

Requires Initiatives 1+2 as foundation. Cannot run alongside normal sprint work.

---

## 5. Testing Frameworks

**Effort: 10 weeks (5 E2E + 5 unit) | Saves: 5-9 days per upgrade | Risk: Low | Payback: 1st upgrade**

Test maintenance added 8-12 days to the 0.81.5 upgrade: React 19 mock breakage (2-3d), deprecated testing lib migration (1-2d), 300 snapshot baseline rebuilds (0.5-1d), Detox patch and build config updates (1-3d), component test fixes (2-3d). This cost hits every upgrade regardless of how fast code changes land.

### E2E: Detox vs Maestro vs Appium

Detox hooks into RN's JS runtime, network layer, and view hierarchy -- all of which change between versions. It is documented to break on RN 0.80, 0.81, and 0.82 with no upstream fix. MetaMask already patches Detox to work around crashes.

Maestro talks to the OS accessibility layer with zero knowledge of React Native. Tests require no changes after an RN upgrade.

| Dimension         | Maestro                   | Detox                              | Appium           |
| ----------------- | ------------------------- | ---------------------------------- | ---------------- |
| RN upgrade impact | **Zero**                  | **High** (coupled to RN internals) | Low              |
| Test language     | YAML (no code)            | TypeScript                         | Any language     |
| Setup             | 10-15 min, no npm package | 2-4 hours, native deps             | 1-3 hours        |
| Flow speed        | 15-20s                    | 20-30s                             | 30-45s           |
| Flakiness         | <1%                       | <2% (with tuning)                  | 15-20%           |
| CI time           | 8-12 min                  | ~40 min                            | 6-9 min          |
| WebView support   | Basic                     | Excellent                          | Good             |
| State injection   | Deep links / API          | FixtureBuilder (rich)              | Deep links / API |

**Recommendation:** Maestro for smoke + regression tests (193 specs). Keep Detox for WebView/dApp browser tests and FixtureBuilder-dependent flows. Keep Appwright for performance benchmarks.

### E2E migration effort

| Phase                                                                  | Effort       |
| ---------------------------------------------------------------------- | ------------ |
| Foundation: CLI on CI, shared login/wallet flows, first 10 smoke tests | 3 days       |
| Smoke migration: 129 specs to YAML, disable Detox smoke CI             | 2 weeks      |
| Regression migration: 70% of regression suite                          | 2 weeks      |
| Detox reduction: remove from smoke CI, simplify build config           | 2 days       |
| **Total**                                                              | **~5 weeks** |

### Unit test modernization

300 snapshot files break on every upgrade (RN changes internal tree structure). Enzyme 3.9.0 is unmaintained with no React 19 adapter. The 834-line testSetup.js mocks 40+ modules globally and cascades failures across thousands of tests when APIs change.

| Phase                                                                | Effort       |
| -------------------------------------------------------------------- | ------------ |
| Stop the bleeding: ESLint rules banning new snapshots + Enzyme       | 2 days       |
| Snapshot elimination: convert ~300 .snap to explicit RNTL assertions | 2 weeks      |
| Enzyme removal: migrate all Enzyme tests to RNTL                     | 2 weeks      |
| Mock reduction: consolidate testSetup.js from 834 to <300 lines      | 1 week       |
| **Total**                                                            | **~5 weeks** |

### Combined testing impact

| Dimension                       | Before        | After                      |
| ------------------------------- | ------------- | -------------------------- |
| E2E changes per upgrade         | 3-5 days      | **0** (Maestro unaffected) |
| Snapshot updates                | 0.5-1 day     | **0** (no snapshots)       |
| Enzyme fixes                    | 0.5-1 day     | **0** (no Enzyme)          |
| Mock breakage                   | 1-2 days      | 0.5-1 day                  |
| E2E CI time                     | ~40 min       | ~10-15 min                 |
| **Total test work per upgrade** | **8-12 days** | **1-3 days**               |

Industry context: State of React Native 2025 survey shows Maestro now dominates E2E testing, surpassing Detox and Appium. Infinite Red switched Ignite's default from Detox to Maestro. Jupiter (fintech) migrated after Detox succeeded only 2/10 times on physical devices.
