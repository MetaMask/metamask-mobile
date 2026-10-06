# Gacha / CollectorCrypt integration tests

Domain detail for the Gacha CollectorCrypt provider. Shared four-layer rules live in [`../../STRATEGY.md`](../../STRATEGY.md). Use-case to layer assignments live in [`collector-crypt-use-cases.md`](collector-crypt-use-cases.md).

## TL;DR

Shape A exercises the Engine messenger factory, GachaController, its real CollectorCryptProvider, both HTTP clients, response validation and the Solana Snap adapter. Only HTTP fetch, Snap execution and error logging I/O are mocked. Transactions are opaque fixtures, matching the POC's trust in CollectorCrypt. There is no Shape B or C: screen layout and navigation stay in component-view tests.

## Harness inventory

When the harness is added or its public boundary changes, update this section.

### CollectorCrypt — [`collector-crypt.ts`](collector-crypt.ts)

- **Shape:** A, controller-level harness
- **Real:** `getGachaControllerMessenger`, `GachaController`, `CollectorCryptProvider` (created by the controller), `createCollectorCryptApi`, `createSolanaNftApi`, response schemas, the Solana Snap transaction adapter and collection reconciliation
- **Mocked:** HTTP fetch (one isolated mock shared by both API clients), `SnapController:handleRequest`, `Logger.error`
- **Factory:** `buildCollectorCryptIntegrationHarness({ respond?, state?, now? })`
  - `respond(url, init)` overrides an HTTP response; returning `undefined` keeps the default provider response
  - `state` restores serialized `GachaControllerState`, including nested `collectorCrypt` operations and cards, to simulate a restart
  - `now` sets the provider clock to exercise recovery after elapsed deadlines without fake timers
- **Returns:** `{ messenger, controller, fetchMock, snapMock, apiUrl, cleanup }`
- **Cleanup:** await every started operation, then call `cleanup()` in `afterEach`; it invalidates the provider wallet, unregisters Snap execution, clears state subscriptions and resets the harness I/O mocks
- **Helpers:** `ACCOUNT`, `PACK`, `MEMO`, `CARD_MINT`, `PURCHASE_TRANSACTION`, `SALE_TRANSACTION`, `SIGNED_PURCHASE`, `SIGNED_SALE`
- **Use when:** proving purchase, reveal, buyback, recovery after restart, or wallet reset during HTTP or signing through the public Gacha actions, with assertions on `controller.state.collectorCrypt` and on the HTTP and Snap mocks
- **Out of scope:** actual filesystem I/O, real Snap cryptography, UI layout and navigation. Recovery tests restore the metadata-filtered state after serialization; they do not guarantee a disk write before broadcast. Gacha uses the standard Engine debounce.
- **Tests:** [`app/components/UI/Gacha/controllers/GachaController.integration.test.ts`](../../../../app/components/UI/Gacha/controllers/GachaController.integration.test.ts)
- **Use cases:** see [`collector-crypt-use-cases.md`](collector-crypt-use-cases.md)
