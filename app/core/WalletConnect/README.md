# WalletConnect v2 — Architecture

This folder hosts MetaMask Mobile's WalletConnect v2 (via
[`@reown/walletkit`](https://docs.reown.com/walletkit)) integration. The code
is organized around two responsibilities:

1. **Session lifecycle** — pairing, session proposal, session persistence,
   session request dispatch, chain-changed / accounts-changed emission.
2. **Multichain namespace orchestration** — turning a dapp's CAIP-25 proposal
   into the namespaces the wallet actually approves, handling multiple
   chains (EVM, Tron, …) through a pluggable `ChainAdapter` registry.

The `multichain/` subfolder is the single place that knows about individual
chains. Everything outside it is chain-agnostic glue.

---

## End-to-end flow

```
Dapp
  │  (1) wc:… URI                              (pairing / proposal)
  ▼
WC2Manager  ──────────────────────────────►  _handleSessionProposal
(WalletConnectV2.ts)                          │
                                              │  buildApprovedNamespaces(proposal, channelId)
                                              │    ├─ collectRequestedNamespaceKeys
                                              │    ├─ getAllAdapters().filter(requested)
                                              │    ├─ adapter.onBeforeApprove?  (Tron seeds CAIP-25 accounts)
                                              │    └─ adapter.buildNamespace    (per-namespace slice)
                                              │
                                              ▼
                                          walletKit.approveSession(...)
                                              │
                                              ▼
                                  new WalletConnect2Session(session)
                                  │   ├── emits accountsChanged / chainChanged
                                  │   │   via getChainChangedEmission + shouldEmitChainChanged
                                  │   ├── updateSession()        ◄── permission changes, chain switches
                                  │   │     buildApprovedNamespaces + mergeApprovedWithSession
                                  │   │     + filterToRequestedNamespaces
                                  │   ├── session_request       ◄── JSON-RPC from the dapp
                                  │   │     ├─ EVM  → switchToChain / handleSendTransaction
                                  │   │     │         (WalletConnect2Session.chain.ts,
                                  │   │     │          WalletConnect2Session.routing.ts)
                                  │   │     └─ non-EVM → routeToSnap
                                  │   │                   getAdapter(namespace)
                                  │   │                   .adaptRequest → handleSnapRequest
                                  │   │                   .adaptResponse → approveRequest
                                  └── removeListeners() / delete
```

Key invariants:

- Only namespaces the dapp actually requested (directly or via `wallet:<ns>`
  delegated scopes) make it into the approved session.
- EVM JSON-RPC still runs through `BackgroundBridge`. Non-EVM JSON-RPC runs
  through Snaps, selected by the adapter registry.
- `chainChanged` must be emitted whenever the wallet's active chain changes
  **and** the session both contains that chain and declares `chainChanged`
  as a supported event for that namespace.

---

## Top-level files

### `WalletConnectV2.ts`

The `WC2Manager` singleton. It owns the WalletKit client, persists session
metadata in `StorageWrapper`, and fans out WalletKit events
(`session_proposal`, `session_request`, `session_delete`, …) to the right
handlers. Session proposals are where the multichain module is first
consulted: `_handleSessionProposal` calls
`buildApprovedNamespaces({ proposal, channelId })` to assemble the
namespaces map, then `walletKit.approveSession` with it.

### `WalletConnect2Session.ts`

Wraps a single approved WalletKit session. Responsibilities:

- Construct a `BackgroundBridge` for EVM JSON-RPC.
- Normalize persisted session namespaces via
  `normalizeSessionNamespaces` so dapp providers never read `undefined`
  arrays.
- Handle `session_request` events and dispatch to the correct place
  (EVM path, switch-chain path, or Snap routing).
- Update the session namespaces when permissions or the active chain
  change (`updateSession`), re-using `buildApprovedNamespaces` +
  `mergeApprovedWithSession` + `filterToRequestedNamespaces`.
- Emit `chainChanged` / `accountsChanged` to the dapp using
  `getChainChangedEmission` + `shouldEmitChainChanged`.

The class delegates chain-switching and request routing to the two sibling
files below so it stays focused on session lifecycle + emission.

### `WalletConnect2Session.chain.ts`

Pure helpers for chain existence and switching, extracted from
`WalletConnect2Session`:

- `doesChainExist(caip2ChainId)` — true if the wallet has an EVM network
  configured for this CAIP-2 chain id.
- `switchToChain({ caip2ChainId, session, channelId, … })` — checks
  permissions via `hasPermissionsToSwitchChainRequest`, optionally prompts
  the user (clearing any pending approvals, legacy behavior), and delegates
  to `switchToNetwork` from the shared `ethereum-chain-utils` helpers.

### `WalletConnect2Session.routing.ts`

Pure helpers that route a `session_request` off the session class:

- `routeToSnap({ requestEvent, snapId, unverifiedOrigin, host })` — looks up
  the owning `ChainAdapter` by CAIP-2 namespace, lets the adapter translate
  the WalletConnect request shape into what the Snap expects
  (`adapter.adaptRequest`), invokes `handleSnapRequest`, then lets the
  adapter rebuild the response the dapp expects (`adapter.adaptResponse`).
  `host.approveRequest` / `host.rejectRequest` are callbacks back into the
  owning `WalletConnect2Session`.
- `handleSendTransaction({ caip2ChainId, requestEvent, methodParams, … })`
  — dispatches `eth_sendTransaction` through
  `addTransaction` (TransactionController) with a PPOM validation hook, and
  forwards the resulting tx hash back through `host.approveRequest`.

### `wc-utils.ts`

A small kitchen sink of chain-agnostic helpers used by both `WC2Manager`
and `WalletConnect2Session`:

- URI / hostname helpers: `parseWalletConnectUri`, `isValidWCURI`,
  `getHostname`, `isValidUrl`, `normalizeDappUrl`.
- Loading / network-onboarding UI: `showWCLoadingState`,
  `hideWCLoadingState`, `waitForNetworkModalOnboarding`.
- CAIP translation: `normalizeCaipChainIdInbound`,
  `getChainIdForCaipChainId`, `getNetworkClientIdForCaipChainId`,
  `getRequestCaip2ChainId`.
- Permission / request helpers: `hasPermissionsToSwitchChainRequest`,
  `isSwitchingChainRequest`, `getUnverifiedRequestOrigin`.

All per-chain logic was moved out of this file into `multichain/` — this
module is intentionally chain-agnostic.

### `extractApprovedAccounts.ts`

Tiny helper that pulls the flat account array out of a caveat-shaped
permission blob. Used when resolving approved accounts from the
`PermissionController`.

---

## `multichain/` — per-chain namespace orchestration

The multichain module is the single integration point for adding a new
chain to WalletConnect. Each chain provides one `ChainAdapter` and registers
it in `registry.ts`; generic namespace / emission logic lives in
`namespaces.ts` and `emission.ts`.

### `multichain/types.ts`

Pure type declarations. No runtime code.

- `NamespaceConfig` — the wallet's own strict namespace shape
  (`{ chains, methods, events, accounts }`, all required). This is what we
  hand to WalletKit during `approveSession` / `updateSession`.
- `ProposalLike` — minimal structural subset of a WalletConnect proposal
  (`requiredNamespaces?`, `optionalNamespaces?`). Keeps the module decoupled
  from the upstream `@walletconnect/types` package.
- `SnapMappedRequest` — `{ method, params }` as shipped to a Snap.
- `ChainAdapter` — the interface a chain implementation must satisfy:
  - `namespace`, `methods`, `events`, `redirectMethods`, optional `snapId`.
  - `buildNamespace({ proposal, channelId })` — produce the slice the
    wallet wants to approve (or `undefined` if nothing to expose).
  - `onBeforeApprove?({ proposal, channelId })` — run side effects that
    must be visible before `buildNamespace` (e.g. seed CAIP-25 accounts).
  - `adaptRequest?(req)` / `adaptResponse?({ method, params, result })` —
    optional hooks for Snap-based chains that need request/response shape
    translation.

### `multichain/registry.ts`

Runtime registry of adapters. Currently wires up `eip155Adapter` and
`tronAdapter` (the Tron entry is compiled out when the `tron` build flag
is off via the `///: ONLY_INCLUDE_IF(tron)` directive). Exposes:

- `getAllAdapters()` — every registered adapter.
- `getAdapter(namespace)` — adapter for a CAIP-2 namespace.
- `getAdapterForCaipChainId(caipChainId)` — adapter for a CAIP-2 chain id.
- `getAdapterForMethod(method)` — adapter whose `methods` array contains
  `method`. EIP-155 is explicitly skipped here because EVM RPC is dispatched
  through `BackgroundBridge`, not Snaps.

To add a new chain: implement the `ChainAdapter`, import it in
`registry.ts`, append it to the `adapters` array.

### `multichain/namespaces.ts`

The namespace-math layer used by both proposal approval and session
updates. All functions are pure and side-effect free (except
`buildApprovedNamespaces`, which awaits adapter hooks).

- `resolveProposalNamespaceKey(scopeOrChain)` — maps plain namespaces
  (`eip155`, `tron:0x2b6…`) and delegated scopes (`wallet:eip155`) back to
  the concrete namespace key the wallet serves.
- `collectRequestedNamespaceKeys(proposal)` — every concrete namespace
  implied by the proposal (top-level keys + delegated scopes + bare chain
  references in any scope's `chains`).
- `buildApprovedNamespaces({ proposal, channelId })` — for every adapter
  whose namespace is requested: run `onBeforeApprove`, then
  `buildNamespace`, and collect the results. Mirrors the EIP-155 slice
  under a `wallet` namespace when the proposal used `wallet:eip155` so
  dapp universal providers can find it on session restore.
- `filterToRequestedNamespaces(namespaces, proposal, { preserveKeys? })`
  — drops namespaces the dapp didn't ask for. Preserves `wallet` when any
  delegated `wallet:<ns>` scope / chain was seen, and any extra keys the
  caller explicitly asks to preserve (e.g. previously-approved namespaces).
- `normalizeSessionNamespaces(namespaces)` — guarantees every slice has
  arrays for `chains`, `methods`, `events`, `accounts`. Derives `chains`
  from `accounts` CAIP-10 prefixes when missing, because dapp providers
  crash on `undefined.length` in that slot when sessions are rehydrated
  from storage.
- `mergeApprovedWithSession(current, computed)` — normalizes the current
  session's namespaces and overlays the freshly computed ones on top.
  Keeps keys that exist only in `current` (previously approved slices).
- `isEmptyApprovedNamespaces(namespaces)` — true when every slice has an
  empty `chains` array. Used as a guard before no-op `updateSession` calls.
- `getRedirectMethodsForChain(caipChainId)` — delegates to the adapter's
  `redirectMethods` list, answering "should the wallet redirect back to
  the dapp after confirming this RPC?"

### `multichain/emission.ts`

`chainChanged` selection + gating, independent of the WalletConnect SDK's
namespace shape.

- `EmissionNamespaceSlice` / `EmissionNamespaces` — relaxed structural
  types that match both our strict `ApprovedNamespaces` and the optional
  shape WalletConnect hands back on a rehydrated session. Avoids the type
  gymnastics we'd otherwise need in `WalletConnectV2.ts`.
- `getChainChangedEmission({ namespaces, fallbackEvmDecimal, fallbackEvmHex })`
  — picks the CAIP chain id to emit `chainChanged` for. Prefers non-EVM
  namespaces (Tron specifically; they expect chain-specific CAIP data),
  then the first EIP-155 chain (emitting the hex wallet chain id as
  payload), then falls back to the wallet's active EVM chain.
- `shouldEmitChainChanged({ chainId, namespaces })` — returns
  `{ shouldEmit, reason, … }` telling the caller whether to emit. Reasons
  are `'chain_not_in_session'` (session doesn't know about this chain)
  and `'event_not_supported'` (namespace doesn't list `chainChanged` in
  its `events`).

### `multichain/eip155.ts`

The EVM adapter. Static lists of supported methods / events / redirect
methods, plus `buildNamespace({ channelId })`: reads permitted EVM chains
via `getPermittedChains(channelId)`, reads permitted accounts via
`getPermittedAccounts(channelId)`, and emits
`eip155:<chainRef>:<address>` accounts for every chain × account pair.
Returns `undefined` if no EVM chain is permitted, so the namespace
disappears rather than shipping an empty slice.

No `adaptRequest` / `adaptResponse` — EVM RPC is dispatched by
`BackgroundBridge`, not by Snaps.

### `multichain/tron.ts` (build flag: `tron`)

The Tron adapter. Wraps interactions with `@metamask/keyring-api`,
`@metamask/chain-agnostic-permission`, and the Tron Wallet Snap.

- `buildNamespace({ proposal, channelId })` — echoes back exactly the
  Tron CAIP chain ids the dapp requested (dapp Tron adapters look each
  chain id up in an internal map keyed by the exact string they sent),
  falling back to `TrxScope.Mainnet` if no Tron chain was asked for but
  Tron accounts exist locally. Accounts are the cross-product of
  addresses × approved chains; addresses come from the CAIP-25 caveat
  first, then from `AccountsController.listAccounts()` (filtered to
  `TrxAccountType.Eoa`).
- `onBeforeApprove({ channelId })` — writes the local Tron EOAs back into
  the CAIP-25 caveat via `addPermittedAccounts`. This way `buildNamespace`
  and downstream consumers all observe the same set of accounts.
- `adaptRequest({ method, params })` — translates WalletConnect Tron
  methods into what the Tron Snap expects:
  - `tron_signMessage` → `{ method: 'signMessage', params: { address, message } }`
  - `tron_signTransaction` → `{ method: 'signTransaction', params: { address, transaction: { rawDataHex, type } } }`
  - `tron_sendTransaction` → `{ method: 'sendTransaction', params }`
  - `tron_getBalance` → `{ method: 'getBalance', params }`
- `adaptResponse({ method, params, result })` — when the Snap returns a
  bare `{ signature }` object for `tron_signTransaction`, wraps the
  original transaction alongside the signature so the dapp receives the
  legacy `{ raw_data_hex, type, signature: [hex] }` shape it expects.
  Fully-shaped results (with `txID`) and non-signing results are
  forwarded unchanged.

### `multichain/index.ts`

Barrel file. The only public surface the rest of the app should import
from is `./multichain`; never reach inside individual files. Exports:

- Types: `ChainAdapter`, `NamespaceConfig`, `ProposalLike`,
  `SnapMappedRequest`, `ApprovedNamespaces`, `ChainChangedEmission`,
  `ChainChangedEmitDecision`, `ChainChangedSkipReason`.
- Registry: `getAdapter`, `getAdapterForCaipChainId`,
  `getAdapterForMethod`, `getAllAdapters`.
- Namespaces: `buildApprovedNamespaces`,
  `collectRequestedNamespaceKeys`, `filterToRequestedNamespaces`,
  `getRedirectMethodsForChain`, `isEmptyApprovedNamespaces`,
  `mergeApprovedWithSession`, `normalizeSessionNamespaces`,
  `resolveProposalNamespaceKey`.
- Emission: `getChainChangedEmission`, `shouldEmitChainChanged`.

---

## Adding a new chain

1. Create `multichain/<chain>.ts` exporting a `ChainAdapter` named
   `<chain>Adapter`. Implement `buildNamespace` and, if the chain is
   Snap-backed, set `snapId` + `adaptRequest` / `adaptResponse`.
2. Register it in `multichain/registry.ts` (guard with a build flag if
   the chain is optional).
3. (Optional) Re-export any chain-specific types from `multichain/index.ts`.
4. Add unit tests next to the adapter (`<chain>.test.ts`). The rest of the
   WalletConnect code will pick the new chain up automatically — neither
   `WalletConnectV2.ts` nor `WalletConnect2Session.ts` needs changes.
