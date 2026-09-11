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

**How these were obtained, and why they are not reproducible from this repo alone.** The per-stage
numbers came from throwaway local instrumentation that logged stage marks through
`global.nativeLoggingHook` (the one log channel `transform-remove-console` does not strip from
release builds), driven over `adb`. That instrumentation was deliberately **not** merged — it is
measurement code, and this repo ships product code. Reproducing the table therefore means
re-adding equivalent local probes. The `HomepageReady` Sentry CUF already covers the
unlock → homepage window in production and is the durable place to watch this number, though it is
not yet dashboarded.

## The fix: make the root pin the version the floating ranges already want

One line in `package.json`:

```diff
-"@noble/curves": "1.9.6",
+"@noble/curves": "1.9.7",
```

`1.9.7` was already the highest published `1.x`, so every floating range in the tree resolved there
while the root's exact pin stayed behind. Moving the root forward makes `~1.9.0` and `^1.8.1`
converge on it naturally — no `resolutions` entries, no patch files, and the change is a net
deletion in the lockfile.

Two alternatives were tried and rejected:

- **Pinning the two edges down to 1.9.6** via `resolutions`. Works, and was the original approach,
  but it leaves the rest of the tree fragmented and adds two entries that have to be kept in step
  with the root pin forever.
- **Patching sources with `yarn patch`.** Would carry two patch files and a
  `require('@metamask/native-utils')` inside third-party code, to achieve what a version bump does
  declaratively.

### What this widens

Deduplication drops `@noble/curves` from **25 copies (58.6 MB) to 12 (25.4 MB)** and puts 15
packages on the patched copy, up from 3. Of the newcomers, only three actually call the patched
`getPublicKey` — `@solana/web3.js` (7 call sites), `ripple-keypairs` (2) and
`@metamask/toprf-secure-backup` (2). The rest import `@noble/curves/secp256k1` for signing, point
arithmetic or modular utilities, or use ed25519/p256, none of which `shimPerf.js` touches.

Seven consumers keep their own copies because they pin exact versions: `ethers` (`1.2.0`),
`ethereum-cryptography` (`1.4.2` and `1.9.0`), `@walletconnect/relay-auth` (`1.8.0`),
`@walletconnect/utils@2.19.x` (`1.8.1`), `ox@0.9.3` (`1.9.1`) and `viem` (`1.9.2`). Forcing those
would mean overriding exact pins across seven minor versions of internal API churn, for no startup
benefit. Don't.

### Why 1.9.6 -> 1.9.7 is safe for the packages that move

`secp256k1.js` and `abstract/weierstrass.js` — the entire secp256k1 implementation — are
**byte-identical** between the two versions. The only differences anywhere are an ed25519 method
rename (`toMontgomeryPriv` -> `toMontgomerySecret`) and re-export plumbing in
`abstract/utils.js`, which drops three underscore-prefixed internals (`_abool2`, `_abytes2`,
`_validateObject`). Nothing in the tree references any of them; the sole tree-wide hit is a
self-bundled snap that resolves no dependencies of its own.

## Guarding it

The failure mode is silent version drift, so it needs a test that fails loudly:
[`shimPerf.test.js`](../../shimPerf.test.js). It asserts that the HD-derivation packages resolve the
**same** `@noble/curves` copy as the repo root, and pins derivation behaviour to published
constants — the secp256k1 generator point, and the BIP-32 Test Vector 1 master fingerprint
(`0x3442193e`).

Note the guard is a **resolution** check, not a runtime one. A runtime variant (patch the root copy,
assert `HDKey` observes it) was written and rejected: it passes even with the nested copies present,
verified by reinstalling the drifted tree. It could not detect the regression it existed to catch.

The resolution checks were verified in both directions — they fail on a drifted tree, naming the
offending nested path, and pass once the versions converge. They assert _sameness with the root_,
not a specific version, so they keep working across future bumps.

Correctness was additionally verified **on device** against 13 vectors (4 private keys × compressed
and uncompressed, the BIP-32 master fingerprint, three derivation paths, and `key-tree`'s
uncompressed output): `pass=13 fail=0`, with 5/5 cold unlocks reaching a usable homepage.

## If you add or bump a dependency that does elliptic-curve work

1. Run `yarn jest shimPerf.test.js`. If it fails, a new nested `@noble/curves` appeared on the
   unlock path.
2. Prefer moving the root pin to the version the floating ranges already resolve to. Pin an
   individual edge in `resolutions` only when that is impossible, and never patch sources.
3. If a _new_ package needs to join the patched set, validate its output against the native
   implementation before pinning it — native and pure-JS must be byte-identical, for both
   compressed (33-byte) and uncompressed (65-byte) public keys.

## Related

- `shimPerf.js` — the patch site
- `app/core/Engine/wallet-init/keyrings.ts` — where native `pbkdf2Sha512`/`hmacSha512` are injected
  into the HD keyring via `CryptographicFunctions`
