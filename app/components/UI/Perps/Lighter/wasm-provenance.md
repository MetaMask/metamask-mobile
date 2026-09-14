# Embedded signer provenance

The embedded WASM was updated for authorized local testnet validation from
Lighter's deployed testnet frontend. The surrounding Go runtime and Mobile
message bridge are unchanged, including private-key response redaction.

- Artifact: https://testnet.app.lighter.xyz/assets/target-Cp9SgPiX.wasm
- SHA-256: `6874fd2b8174db7f21683b4d21c29861e32999f6d05cc53d5f1b91bd89db85d3`
- Size: 7,708,261 bytes
- Embedded build identity: Go 1.26.8, `github.com/elliottech/zklighter-sdk`, revision `ddc1b9821f14e4194d91e38812d9ea2df69fcd60`
- Referenced by the official frontend's `useAgentChat-DVz6UTij.js`.

The previous signer was built locally. Its current-market regression was
reproduced offline: order signing rejects testnet ETH4095 and BTC4096. The
replacement signs those IDs using a disposable key with network access
disabled. The public lighter-go source does not contain the replacement's
revision; this artifact must not be described as a reproducible local build
of that revision. Mainnet financial compatibility has not been validated.

## Runtime containment

Because this artifact is not a reproducible build, it is treated as untrusted
code that happens to receive a SecureKeychain-backed private key. Two
independent controls keep a compromised artifact from exfiltrating that key:

- **Deny-all CSP** in `wasm-wrapper.standalone.html` — `default-src 'none'`
  with an explicit `connect-src 'none'` blocks `fetch`, XHR, WebSocket, beacon
  and every subresource. The WASM payload is inlined as base64 and
  instantiated from memory, so the page needs no network access.
- **Navigation deny** on the host `WebView` — `onShouldStartLoadWithRequest`
  returns `false` for every request. `originWhitelist` stays `['*']` on
  purpose: a URL that _fails_ the whitelist is not blocked but forwarded to
  `Linking.openURL`, which would hand an attacker-chosen URL to the system
  browser. Keeping it permissive routes every request to the guard, which
  denies it in-process.

These are separate surfaces: `originWhitelist` gates navigation only and does
not stop `fetch`/XHR/WebSocket from the embedded JS or WASM. Both are asserted
in `LighterSignerWebView.test.tsx` under `outbound-network boundary`, including
a check that the shipped page contains no outbound-request primitive.
