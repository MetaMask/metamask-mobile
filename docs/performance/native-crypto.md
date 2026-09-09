# Native crypto and the `@noble/curves` single-copy invariant

`shimPerf.js` replaces the pure-JS elliptic-curve and hashing primitives with native (C++)
implementations from [`@metamask/native-utils`](https://www.npmjs.com/package/@metamask/native-utils).
It is one of the highest-leverage performance mechanisms in the app, and it has a sharp edge that
already cut us once.

## How it works

`@metamask/native-utils` is a **Nitro** module, so it is JSI-backed and therefore **synchronous**.
That matters: it can be dropped into synchronous call sites such as `@scure/bip32`'s `HDKey`
constructor, which an async bridge module could never serve.

`shimPerf.js` installs it by **mutating module instances**:

```js
const secp256k1_1 = require('@noble/curves/secp256k1');
secp256k1_1.secp256k1.getPublicKey = getPublicKey;
```

## The edge: it only reaches the copy it mutates

Mutating a module instance only affects consumers that resolve **the very same copy**. `shimPerf.js`
says so explicitly:

> IMPORTANT: This patching works only if @noble/curves version in root package.json is same as
> @noble/curves version in package.json of @scure/bip32.

That invariant broke silently. The repo root pinned `@noble/curves` to `1.9.6`, while:

| Package              | Declared range | Resolved       | Patched? |
| -------------------- | -------------- | -------------- | -------- |
| `@scure/bip32`       | `~1.9.0`       | nested `1.9.7` | **no**   |
| `@metamask/key-tree` | `^1.8.1`       | nested `1.9.7` | **no**   |

Both ranges _accept_ `1.9.6`, but Yarn resolves each range independently to the highest matching
version, so each package got its own nested `1.9.7` and dropped off the patched path.

Nothing threw. Nothing logged. HD key derivation simply went back to interpreted BigInt maths on
Hermes — and `KeyringController.submitPassword` re-derives every account's key from the seed on
**every unlock**, with the homepage blocked behind it.

Measured cost of the drift, unlock submit → usable homepage, on a Samsung Galaxy A14 5G
(Android 15, `production` release build, populated wallet, cold starts, n=5 medians):

|                                  |           unlock → homepage |
| -------------------------------- | --------------------------: |
| Drifted (nested copies, pure JS) |                    3,846 ms |
| Deduped (patch reaches both)     | **2,059 ms** (p90 2,204 ms) |
|                                  |       **−1,787 ms / −46 %** |

No other stage moved: controller rehydration 88 → 79 ms, `Engine.init` 778 → 686 ms, post-init gap
1,102 → 1,069 ms, navigator module-eval 24 → 23 ms, splash reveal tax 1,752 → 1,785 ms — all within
run-to-run noise.

## The fix: pin the edge, don't patch the source

Two targeted entries in `package.json` `resolutions`:

```json
"@scure/bip32/@noble/curves": "1.9.6",
"@metamask/key-tree/@noble/curves": "1.9.6",
```

This dedupes exactly those two edges onto the root copy that `shimPerf.js` already patches. Nothing
else in the tree moves — the other `@noble/curves` copies (`1.2.0` through `1.9.7`, spread across
Ledger, Trezor, WalletConnect, Solana, viem and others) are untouched, which is deliberate: those
packages have not been validated against the native implementation.

Patching package sources with `yarn patch` was considered and rejected. It would have carried two
patch files and a `require('@metamask/native-utils')` inside third-party code, to achieve what a
resolution pin achieves declaratively.

## Guarding it

The failure mode is silent version drift, so it needs a test that fails loudly:
[`shimPerf.test.js`](../../shimPerf.test.js). It asserts that the HD-derivation packages resolve the
**same** `@noble/curves` copy as the repo root, and pins derivation behaviour to published
constants — the secp256k1 generator point, and the BIP-32 Test Vector 1 master fingerprint
(`0x3442193e`).

Note the guard is a **resolution** check, not a runtime one. A runtime variant (patch the root copy,
assert `HDKey` observes it) was written and rejected: it passes even with the nested copies present,
verified by reinstalling the drifted tree. It could not detect the regression it existed to catch.

The resolution checks were verified in both directions — they fail on the drifted tree, naming the
offending nested path, and pass once the edges are pinned.

Correctness was additionally verified **on device** against 13 vectors (4 private keys × compressed
and uncompressed, the BIP-32 master fingerprint, three derivation paths, and `key-tree`'s
uncompressed output): `pass=13 fail=0`, with 5/5 cold unlocks reaching a usable homepage.

## If you add or bump a dependency that does elliptic-curve work

1. Run `yarn jest shimPerf.test.js`. If it fails, a new nested `@noble/curves` appeared on the
   unlock path.
2. Fix it by pinning the edge in `resolutions`, not by patching sources.
3. If a _new_ package needs to join the patched set, validate its output against the native
   implementation before pinning it — native and pure-JS must be byte-identical, for both
   compressed (33-byte) and uncompressed (65-byte) public keys.

## Related

- [startup-instrumentation.md](./startup-instrumentation.md) — how to measure a cold start
- `shimPerf.js` — the patch site
- `app/core/Engine/wallet-init/keyrings.ts` — where native `pbkdf2Sha512`/`hmacSha512` are injected
  into the HD keyring via `CryptographicFunctions`
