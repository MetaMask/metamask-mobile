# MetaMask Connect Appium Smoke (`SmokeMMConnect`)

Appium smoke coverage for MetaMask Connect flows via the system browser
(Chrome on Android) and local Browser Playground / RN Playground dApps.

Specs run on PR CI via `appium-mmconnect-android-smoke` and locally with:

```bash
yarn appium-smoke:mmconnect:android
```

Requires a **main-e2e release** APK (`HAS_TEST_OVERRIDES=true`). See
[`docs/testing/appium-smoke-testing.md`](../../../docs/testing/appium-smoke-testing.md).

## Specs

| Spec | Status |
|------|--------|
| `connection-multichain.spec.ts` | Active — Multichain API connect via Browser Playground |
| `connection-evm-account.spec.ts` | Skipped — [WAPI-1511](https://consensyssoftware.atlassian.net/browse/WAPI-1511) |
| `connection-evm-rejection.spec.ts` | Skipped — WAPI-1511 |
| `connection-evm-session-timeout.spec.ts` | Skipped — WAPI-1511 |
| `connection-evm-sign.spec.ts` | Skipped — WAPI-1511 |
| `connection-wagmi.spec.ts` | Skipped — WAPI-1511 |
| `connection-wagmi-chains.spec.ts` | Skipped — WAPI-1511 |
| `connection-multiclient.spec.ts` | Skipped — WAPI-1511 |
| `connection-multiclient-resilience.spec.ts` | Skipped — WAPI-1511 |
| `legacy-evm-rn-connect.spec.ts` | Skipped — WAPI-1511 (RN Playground APK) |
| `multichain-rn-evm.spec.ts` | Skipped — WAPI-1511 (RN Playground APK) |
| `multichain-rn-solana.spec.ts` | Skipped — WAPI-1511 (RN Playground APK) |

Un-skipping remaining specs is tracked in
[MMQA-2062](https://consensyssoftware.atlassian.net/browse/MMQA-2062).

## Wallet & mocks

- Fixture: `FixtureBuilder().withSolanaAccountPermission().build()` (standard e2e vault)
- Login: `loginToAppPlaywright({ scenarioType: 'e2e' })`
- API mocks: `DEFAULT_MOCKS` via `withFixtures`

## RN Playground APK (local)

Skipped RN playground specs need the playground APK when un-skipped:

```bash
./tests/scripts/fetch-rn-playground-apk.sh
```

## CI notes

Android Appium smoke for this tag uses the `google_apis` system image so Chrome
(`com.android.chrome`) is available. Specs call
`launchMobileBrowser({ safelyOnboardChrome: true })` to dismiss Chrome FRE.
