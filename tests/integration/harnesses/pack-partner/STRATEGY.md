# Collectibles / PackPartner integration tests

Domain detail for the Collectibles PackPartner provider. Shared four-layer rules live in [`../../STRATEGY.md`](../../STRATEGY.md). Use-case to layer assignments live in [`pack-partner-use-cases.md`](pack-partner-use-cases.md).

## TL;DR

Shape A exercises the Engine messenger factories, CollectiblesController, its real PackPartnerProvider, the registered PackPartnerDataService, both PackPartner HTTP clients, response validation, the Solana Snap adapter and a react-data-query UI client fed by the data-service cache events. The real StorageService uses its in-memory disk adapter. Only HTTP fetch, Snap execution and error logging I/O are mocked. Transactions are opaque fixtures because this harness replaces the signing boundary; the companion Snap validates real transaction contents, presignatures and simulated effects in its own suites. There is no Shape B or C: screen layout and navigation stay in component-view tests.

The controller keeps only the operation journal (purchases by memo, buybacks by mint). Owned cards, buyback offers and the public openings snapshot are data-service reads: PackPartner's cards API is authoritative, each offer is its own read, and the workflow refreshes those reads through `PackPartnerDataService:invalidateQueries` after a terminal outcome, even when their background entries were already collected. Public openings are polled through the read service; the hook owns the bounded presentation queue, never the controller. Signed bytes are never stored; recovery resolves purchases by memo through `/openPack` and `/pack/status`, and buybacks through `/buyback/check`.

## Harness inventory

When the harness is added or its public boundary changes, update this section.

### PackPartner — [`pack-partner.ts`](pack-partner.ts)

- **Shape:** A, controller-level harness
- **Real:** `getCollectiblesControllerMessenger` (delegates `SnapController:handleRequest`, `PackPartnerDataService:invalidateQueries` and `KeyringController:unlock`), `CollectiblesController`, `PackPartnerProvider` (created by the controller), `PackPartnerDataService`, two `createPackPartnerApi` clients (the uncached workflow client injected like Engine init, and the data-service client), response schemas, the Solana Snap transaction adapter and `createUIQueryClient`
- **Mocked:** HTTP fetch (one isolated mock for all PackPartner endpoints, shared by both clients), `SnapController:handleRequest`, `Logger.error`
- **Factory:** `buildPackPartnerIntegrationHarness({ respond?, state?, now? })`
  - `respond(url, init)` overrides an HTTP response; returning `undefined` keeps the default provider response (`/getAllWinners` defaults to no openings). `/pack/status` has no default: override it when a scenario reaches it
  - `state` restores serialized `CollectiblesControllerState` (the `operations` and `sales` journal) to simulate a restart; legacy persisted shapes go through the controller's migration
  - `now` sets the provider and data-service clock to exercise the 60 s unsigned TTL, the 2 h opening window and the 72 h buyback window without fake timers
- **Returns:** `{ messenger, controller, dataService, ui, resetWallet, fetchMock, snapMock, apiUrl, cleanup }`
- **Wallet unlock:** publish `KeyringController:unlock` on `messenger`; the controller resumes every address of its journal.
- **Read refresh:** subscribe to `PackPartnerDataService:cacheUpdated:<hashKey(queryKey)>` on `messenger` to observe a cached read republished after a workflow outcome; the refresh is fire-and-forget, so await the event before asserting.
- **UI observer:** observe a key on `ui` with a `QueryObserver` to see what a screen shows. The UI hydrates only an entry newer than its own read, and the global test setup pins `Date.now`: use `jest.useFakeTimers({ advanceTimers: true })` so the clock moves, and advance it past the 5 min gcTime to collect an unobserved background entry.
- **Wallet reset:** `resetWallet()` mirrors Engine reset ordering: clear controller workflow state, then clear the server cache.
- **Cleanup:** await every started operation and read refresh, unsubscribe UI observers, then call `cleanup()` in `afterEach`; it clears the UI client, invalidates the provider wallet, clears the data-service cache, destroys the data service, unregisters Snap execution, clears state subscriptions and resets the harness I/O mocks
- **Helpers:** `ACCOUNT`, `PACK`, `MEMO`, `CARD_MINT`, `PURCHASE_TRANSACTION`, `SALE_TRANSACTION`, `SIGNED_PURCHASE`, `SIGNED_SALE`
- **Use when:** proving purchase, reveal, buyback, recovery after restart or unlock, read refresh after an outcome (up to a UI observer), or wallet reset during HTTP or signing through the public Collectibles and data-service actions, with assertions on `controller.state.packPartner`, data-service cache events, the HTTP and Snap mocks
- **Out of scope:** actual filesystem I/O, real Snap cryptography, UI layout and navigation, data-service read mapping and retry policies (covered by `PackPartnerDataService.integration.test.ts`), polling, pausing and paced insertion of openings (hooks arrive in step 2.4). Recovery tests restore the metadata-filtered state after serialization; they do not guarantee a disk write before broadcast. Collectibles uses the standard Engine debounce.
- **Tests:** [`app/components/UI/Collectibles/controllers/CollectiblesController.integration.test.ts`](../../../../app/components/UI/Collectibles/controllers/CollectiblesController.integration.test.ts)
- **Use cases:** see [`pack-partner-use-cases.md`](pack-partner-use-cases.md)

### Collection storage — [`storage.ts`](storage.ts)

- **Real:** Engine data-service messenger factory, `StorageService`, `PackPartnerDataService`, the validated HTTP client and the UI query bridge.
- **I/O substitutes:** `InMemoryStorageAdapter` for disk and a fetch mock for HTTP. Reusing the adapter across harness instances models a process restart without adding another cache implementation.
- **Factories:** `buildPackPartnerStorageHarness(storage?)` supplies the real storage messenger for service unit/integration tests; `buildPackPartnerPersistenceHarness(storage?)` adds the real HTTP client, read service and UI proxy.
- **Returns:** storage harness `{ messenger, storage, storageService }`; persistence harness additionally `{ service, ui, fetchMock, cleanup }`. Cleanup destroys process state without deleting the persisted snapshot. Tests call `service.clearCache()` explicitly to model a wallet reset.
- **Coverage:** `PackPartnerCollectionPersistence.integration.test.ts` verifies offline restart, snapshot publication before a held online refresh, empty success replacing older ownership, failed cursor pagination preserving the previous snapshot, wallet/network isolation, malformed storage, collection-only persistence and reset ordering against an in-flight storage write. These are deterministic service/storage tests, not proof of native filesystem behavior.
