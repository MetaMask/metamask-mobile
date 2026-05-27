# Snap binary mocks

Local snap tarballs served via MockServer's `/proxy` endpoint during E2E snap tests, instead of hitting `registry.npmjs.org` live. Wired up per spec via `testSpecificMock`, with `mockBip32Snap`, `mockWasmSnap`, etc. exported from `snap-binary-mocks.ts`.

## Refreshing a binary

When the test-snaps dapp pins a new snap version, re-download the tarball:

```sh
yarn update-snap-binary --<snap-name>@<version>
# e.g. yarn update-snap-binary --bip32-example-snap@2.3.1
```

This pulls the `.tgz` from npm and writes both `<snap>@<version>.txt` (the raw tarball, stored with `.txt` extension so it survives Git CRLF normalization — `.gitattributes` marks them as binary) and `<snap>@<version>-headers.json` (the response headers).

Versions are encoded into the mock-matching URL pattern. The dapp must request the same `<snap>@<version>` the binary file uses, or no mock will match.

## Safety net

If a `testSpecificMock` is missing for a snap a test installs, or the dapp has bumped to a version we haven't refreshed locally, the request falls through `/proxy`'s catch-all to live npm. The decoded URL `registry.npmjs.org/@metamask/...` is **not** in `tests/api-mocking/mock-e2e-allowlist.ts`, so `isUrlAllowed()` returns false → push to `_liveRequests` → `validateLiveRequests()` throws at cleanup → the test fails with:

> `Test made 1 unmocked request(s): [GET] https://registry.npmjs.org/@metamask/<snap>/...`

Empirically verified by the reverted experiment commit `94d1bfb435`. Stale binaries never silently hit the live registry.

## Conventions for spec authors

### One mock per spec, not per `it()`

Mobile preserves wallet state across `it()` blocks in the same describe via `skipReactNativeReload: true`. The snap installed by the first `it()` stays installed for every subsequent `it()` in the file. Only the install test needs a `testSpecificMock` — follow-up tests reuse the already-installed snap and never re-fetch the tarball.

This differs from `metamask-extension`, where each test reloads the wallet and needs its own per-test mock. Don't carry that pattern over here; it's wasted setup and adds noise.

### Snap error paths assert on the alert, not the result span

When a snap throws (e.g. invalid entropy source, scheduling a past-dated event), the test-snaps page surfaces the error via a native `window.alert()`. On both iOS and Android, that alert covers the WebView, so any `checkResultSpan` call fails with a `browser-webview not found` error rather than a useful assertion.

For these tests use `Assertions.expectTextDisplayed('<error text>', { timeout: 30000 })` to match the alert content directly. See `test-snap-bip-32.spec.ts` ("fails when choosing the invalid entropy source") for the canonical example.
