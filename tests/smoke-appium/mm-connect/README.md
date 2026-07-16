# MetaMask Connect Appium Smoke (`SmokeMMConnect`)

Appium smoke coverage for the active MMConnect multichain browser connect test.
Specs run on PR CI via `appium-mmconnect-android-smoke` and locally with:

```bash
yarn appium-smoke:mmconnect:android
```

Requires a **main-e2e release** APK (`HAS_TEST_OVERRIDES=true`). See
[`docs/testing/appium-smoke-testing.md`](../../../docs/testing/appium-smoke-testing.md).

## Active specs

| Spec | Status |
|------|--------|
| `connection-multichain.spec.ts` | Active — Multichain API connect via Browser Playground |

Remaining MMConnect specs still live under `tests/performance/mm-connect/`
(mostly `test.skip` / [WAPI-1511](https://consensyssoftware.atlassian.net/browse/WAPI-1511))
until a follow-up migration.

## Wallet & mocks

- Fixture: `FixtureBuilder().withSolanaAccountPermission().build()` (standard e2e vault)
- Login: `loginToAppPlaywright({ scenarioType: 'e2e' })`
- API mocks: `DEFAULT_MOCKS` via `withFixtures`

## CI notes

Android Appium smoke for this tag uses the `google_apis` system image so Chrome
(`com.android.chrome`) is available. Specs call
`launchMobileBrowser({ safelyOnboardChrome: true })` to dismiss Chrome FRE.
