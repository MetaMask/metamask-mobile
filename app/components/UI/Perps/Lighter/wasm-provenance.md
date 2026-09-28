# Embedded signer provenance

The embedded WASM was updated for authorized local testnet validation from
Lighter's deployed testnet frontend. The Go runtime and Mobile message bridge enforce local-only execution and
private-key response redaction. Registration output is validated before it
can reach the controller's headless personal-sign path.

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

The pinned signer remains trusted for cryptography and public-key derivation.
Mobile accepts only the exact `Register Lighter Account` plaintext binding the
returned 40-byte public key, requested nonce, account index, and API-key index.
Arbitrary text or mismatched fields are rejected before the controller receives
the result. Supported chain IDs are checked and key storage is chain-scoped.
The protocol's EIP-191 plaintext contains no chain ID; its L2 transaction
signature carries the chain binding. This is not a claim of chain-domain
separation in the L1 plaintext itself.

The HTML content security policy permits only the four embedded scripts by
SHA-256 hash and allows WASM compilation. It does not permit arbitrary inline
scripts. `scripts/lighter-wasm-wrapper.test.ts` checks these hashes against the
actual script contents; update the hashes whenever an embedded script changes.
