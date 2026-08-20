# E2E Proxy CA (checked in on purpose)

This directory contains the certificate authority used by MockServerE2E to
intercept device-level HTTPS traffic in E2E runs (MMQA-1923, Decision DA/A1).

| File           | Purpose                                                                           |
| -------------- | --------------------------------------------------------------------------------- |
| `proxy-ca.pem` | CA certificate (PEM). Trusted by E2E builds; mockttp HTTPS option.                |
| `proxy-ca.cer` | Same certificate in DER form, for `xcrun simctl keychain add-root-cert` on iOS.   |
| `proxy-ca.key` | CA private key. mockttp uses it to mint per-host interception certs at test time. |

## Why is a private key committed?

The Android E2E APK trusts this CA by **bundling the certificate at build
time** (`android/app/src/main/res/raw/e2e_proxy_ca.pem`, referenced from
`react_native_config_e2e.xml`). In CI, the APK build and the test shards are
separate jobs on separate runners, so the cert baked into the APK and the key
mockttp signs with must match **without runtime coordination**. A checked-in,
deterministic CA is the simplest way to guarantee that, and it removes the
previous `adb root` runtime-install dependency entirely.

### Alternatives considered

| Approach                          | Why not chosen for Phase 0                                                                                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub Actions secret for the key | Works for CI, but breaks local repro against CI-built APKs, fork/external contributor runs, and APK reuse across workflow runs without also distributing the secret. |
| Per-run CA as a workflow artifact | Cleaner secrecy, but couples every local/debug path to regenerating + re-baking the APK; APK reuse across shards/days becomes impossible without re-upload.          |

This key protects nothing: it signs only throwaway TLS interception certs for
mocked E2E traffic, and only `METAMASK_ENVIRONMENT=e2e` builds trust it.
Production binaries use the default network security config and never trust
this CA. Do not reuse it for anything else.

## Rotation

1. Delete **all three** files here (`proxy-ca.key`, `proxy-ca.pem`,
   `proxy-ca.cer`). Partial deletes are refused by `ensureE2EProxyCa()` so we
   never mint a new CA while the APK still trusts the old bundled cert.
2. Run `yarn jest tests/framework/utils/E2EProxyCa.test.ts` — generation kicks
   in via `ensureE2EProxyCa()` (requires `openssl` on PATH); the sync-guard
   test will then fail, telling you to:
3. Copy the new `proxy-ca.pem` over
   `android/app/src/main/res/raw/e2e_proxy_ca.pem`.
4. Commit all four files together.
