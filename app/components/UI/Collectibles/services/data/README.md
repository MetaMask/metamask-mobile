# Collectibles background data services

This boundary follows ADR 0020 (TanStack Query adoption) and the PredictNext split between read services and workflow services. The Engine registers `BaseDataService` instances listed in `DATA_SERVICES`. React reads them through `@metamask/react-data-query` (`useQuery` and `useInfiniteQuery` with a query key and no `queryFn`). The app's `ReactQueryService` forwards each key to the service action it names. The UI client always asks the service (UI `staleTime: 0`, no UI retry); freshness, retries, request coalescing and invalidation belong to the background service.

## State ownership

| State                                                         | Owner                                                                                                 |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Pack catalogue, pack pools, Greatest Hits                     | `PackPartnerDataService` transient reads                                                              |
| Cards a wallet owns                                           | `PackPartnerDataService` query + last-success snapshot in standard `StorageService` (`getOwnedCards`) |
| Buyback offer of a card                                       | `PackPartnerDataService` cache (`getBuybackOffer`)                                                    |
| Sold-card and purchase history                                | `CollectiblesApiDataService` (`getWalletHistory`)                                                     |
| Purchases and buybacks this device started, until they settle | `CollectiblesController` persisted journal, driven by `PackPartnerProvider`                           |
| Public openings snapshot                                      | `PackPartnerDataService` cache (`getRecentOpenings`)                                                  |
| Public openings                                               | `PackPartnerDataService` snapshots; `usePackPartnerOpenings` polling and bounded presentation queue   |
| Form input and visual progress                                | React local state                                                                                     |

There is no owned-card state, merge rule or buyback cache in the controller. PackPartner's cards API is the source of truth for ownership: `getOwnedCards` returns its complete, validated inventory and nothing else. Sold cards are not hidden locally; once PackPartner stops listing a card, the next read drops it. History, including sold cards, comes from Collectibles API.

Settlement-token balances reuse `AssetsController` on mainnet. The devnet-only exception uses the existing MetaMask Assets API client and the existing `useUsdcBalance` query; it is not a PackPartner API read or operation-journal entry. Its scope/mint checks and the upstream asset-prefix workaround are documented in the [environment section](../../README.md#environment-and-access).

## Read services

- `PackPartnerDataService` owns the cached PackPartner reads for display and normalizes the transport responses into PackPartner models, exposed to the app through type aliases: `getPacks`, `getPackInventory` (paginated), `getGreatestHits`, `getOwnedCards` and `getBuybackOffer`. Its descriptors live in `packPartnerQueries.ts` (`queryKey`, invalidation `family`, service `staleTime`). Every key carries the environment; the owned-cards key carries the public Solana address the PackPartner route requires, never a credential. `getOwnedCards` does not copy offers: a card still within the 72-hour buyback window has `buyback.status: 'unknown'`, and the screen reads its own `getBuybackOffer` entry (at most four offer reads run at once), so every offer lives in exactly one cache entry and an offer change refreshes every screen. `getGreatestHits` is built from the `getPacks` and first-page `getPackInventory` entries, so a screen loading both reads each endpoint once. `getRecentOpenings` is the REST snapshot of the latest public openings of a pack, or of every pack, fresh for 5 seconds.
- `CollectiblesApiDataService` reads indexed history, wallet summaries, Pokédex and batched indicators. It receives a `CollectiblesApiClient` at initialization.
- `CollectiblesSocialApiDataService` reads public profiles, feed and leaderboards, and submits comments, reactions, shares and follow requests through its injected `CollectiblesSocialApiClient`.

Each cached PackPartner read has its own retry policy (two retries for network failures, timeouts, rate limits and 5xx responses) and its own circuit, which opens for 30 seconds after repeated retryable failures, so one failing endpoint cannot block another for long. All three background query clients are unmounted and use `networkMode: 'always'`: a request started during a connectivity loss reaches its client and can resolve or reject, instead of waiting indefinitely for a reconnect notification the query client cannot observe. PackPartner applies the retry policy above; the two optional API services do not retry failed reads. This setting does not fabricate connectivity or make an offline request succeed. The UI gates reads on connectivity, and an owned-cards or catalogue read that never succeeded is reported as a connection error offline, not as an empty list. Catalogue reads have zero stale/GC time (only concurrent reads coalesce); other inactive entries are collected after five minutes and infinite queries keep at most ten pages. Owned collections use the standard memory GC window; their independent last-success disk snapshot survives query garbage collection and restarts. Wallet reset removes every entry (`clearCache`) instead of marking it stale, so the previous wallet's data is never republished.

### Owned collection offline snapshot

`getOwnedCards` lazily reads the last complete snapshot from the standard Engine `StorageService`, keyed by environment and wallet. It seeds the existing TanStack query with the original successful-read timestamp, so the normal DataService events publish the saved list before the online refresh finishes. The hook permits local restoration offline (`networkMode: 'always'`); the service uses the app's NetInfo-backed TanStack `onlineManager` to gate HTTP. Reconnection revalidates the collection. An offline wallet with no saved list is unknown, not an empty collection.

Only a fully validated, complete ownership response replaces the snapshot, including a successful empty list. Every refresh retrieves all cursor pages of 500 before publishing. A failed later page, failed refresh or failed disk write leaves the previous successful disk snapshot intact; storage failure does not turn a successful API read into an error. Restoration validates the stored schema and recalculates display buyback-window eligibility, but never persists offers. Cards are partitioned by wallet and network; no catalogue, pool, buyback quote or financial transaction is stored in this snapshot. There is no snapshot expiry: online revalidation establishes freshness, offline data is only the last observed ownership.

This intentionally does **not** enable `BaseDataService.persistenceConfig`: the installed version persists every successful query family, cannot select ownership alone, and omits a query after a failed refetch even when it still has data. Using the standard `StorageService` directly for this one last-success response preserves the requested behavior without a filesystem adapter or controller cache. Serialization is versioned and writes are ordered; wallet reset invalidates in-flight reads synchronously, drains pending writes and awaits namespace deletion. Engine resets before destroying services so storage messenger actions remain available during cleanup. Writes remain asynchronous, so a process killed before a write finishes may restore the preceding successful snapshot.

Packs are never restored from disk. Their hook hides prior packs while offline, loading or errored; a confirmed empty catalogue displays the shared empty-state message. Skeletons use standard MetaMask components and fixed tile slots. Collection refreshes retain their cached cards and balance; skeletons appear only before the first collection is known.

### Invalidation

The service cache has no observers in the background, so TanStack's refetch-on-invalidate is inert there. `PackPartnerDataService.invalidateQueries` therefore marks matching entries stale, then re-reads each matching read through the action its key names (keys are `[action, ...arguments]`, the react-data-query contract). Each re-read publishes `cacheUpdated` with newer data, which the UI client hydrates. The reads to refresh come from a bounded list of recently served read keys, most recently used last, like the cached-read registry of `PredictPortfolioService`: a read a screen still shows is refreshed even after its background entry was collected, and a frequently used read is never evicted. A read already in flight when the invalidation starts is read once more after it settles, because it began before the change. `clearCache` also advances a cache generation: an invalidation waiting across wallet reset must not start another read for the old wallet. Cancelling cached queries alone would not stop that scheduled re-read. The UI never writes the cache with `setQueryData`: ADR 0020 notes that hydration would overwrite it.

## Owned collection value on the wallet homepage

`getCollectionValueUsd` sums `insuredValue` over the complete owned collection, before filters or homepage preview limits; missing insured values contribute zero. My Collection and `useCollectiblesPortfolioValue` use this same calculation. The homepage `useCollectiblesSlice` converts USD with the shared fiat normalizer exactly once. Wallet USDC, listing prices, buyback offers and the future Collectibles API summary are not inputs. No new balance cache or controller state is introduced.

The slice observes the same environment/address query as My Collection. `hasLoaded` distinguishes a successful empty snapshot from an unknown collection. Cached data, including an empty collection, remains ready during a refresh or a later error. Without a snapshot, loading/error is not reported as a zero balance. Feature disablement or no selected Solana account makes the slice ineligible. Account switches use their own query keys. The slice follows the existing homepage visibility convention (zero rows hidden) and contributes no 24-hour delta.

Homepage pull-to-refresh uses the mounted Collectibles section's refresh, or `useRefreshPackPartnerCards` when that section is not mounted. Both use the same exact-key invalidation, through the UI query bridge to this DataService; the fallback does not mount another observer. Refresh is skipped offline and when disabled. Open/sale invalidations already refresh all observers, including the balance slice. Do not add a second refresh alongside the section refresh, an optimistic balance, or polling for this total.

### Test layer placement

- Component-view: `CollectiblesBalance.view.test.tsx` exercises real slice/currency/row/query refresh behavior through the standard Collectibles fixture services.
- Integration: `PackPartnerCollectionPersistence.integration.test.ts` covers the real client/service/messenger/storage bridge, shared reads, forced refresh within the freshness window and offline restoration.
- Unit: `collectionValue.test.ts` and the existing balance aggregation tests cover arithmetic; the existing homepage shell tests cover refresh routing and navigation contracts. Full homepage CV needs a combined Money/Perps/Predict fixture, so these shell seams remain focused unit coverage rather than mocking those features inside a new view test.

## Workflow

`PackPartnerProvider` is the business workflow behind `CollectiblesController`: purchase, multipack, opening, reveal progress, buyback and recovery. Engine init creates separate instances of the same [validated API client](../clients/PackPartnerApiClient.ts) for the two paths:

```text
UI query hooks → PackPartnerDataService → API client
UI commands → CollectiblesController → PackPartnerProvider → API client
```

This follows [PredictOrderService](../../../PredictNext/services/PredictOrderService.ts): cached display reads and financial workflows need different freshness and retry rules. The provider does not call the read service to execute transactions and does not add another server-data cache. No extra facade or shared automatic retry policy is introduced.

| Workflow call                            | Why its policy differs from display reads                                                                                                                                                                                                                                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generatePack` / `generatePacks`         | Creates checkout memos and expiring transactions. Reusing a cached result could reuse an old transaction. A new request is a new checkout attempt; the client does not assume a backend idempotency guarantee.                                                                                                             |
| `submitTransaction`                      | A lost response can hide a successful broadcast. The workflow records the attempt before sending and reconciles by memo instead of generating another payment. Re-sending identical Solana signed bytes does not itself create a second transaction; the danger is replacing an uncertain payment with a newly signed one. |
| `openPack`                               | The workflow deliberately polls the same memo after pending responses or HTTP 404, within its attempt and opening-window limits. This is controlled continuation, not a blanket ban on retries or a generic HTTP retry.                                                                                                    |
| Buyback availability and `createBuyback` | The displayed offer may be cached; signing requires a fresh availability check and a check of the refund in the newly created transaction against the user's accepted amount. Transaction creation is not cached or blindly repeated.                                                                                      |
| `getPackStatus` / `checkBuyback`         | These are fresh observations of an existing operation. They can be repeated during recovery; an old cached pending result must not hide settlement.                                                                                                                                                                        |

These policies do not prove general backend idempotency. The workflow uses the returned memo and observed status to decide its next step. After a terminal outcome, it calls `PackPartnerDataService:invalidateQueries` with the affected families (`packPartnerQueryFamilies`), fire-and-forget:

| Outcome                    | Refreshed families             |
| -------------------------- | ------------------------------ |
| Pack opened                | Owned cards of the account     |
| Buyback completed          | Owned cards, offer of the card |
| Offer unavailable or lower | Offer of the card              |

The journal persists only safe references (memo, status, amounts, reveal progress, the awarded card as the opening's receipt). Signed transactions are never stored. Interrupted operations resume by memo when the wallet unlocks (`KeyringController:unlock`), whichever screen is shown. See [recovery and persistence](recovery-persistence.md).

## Recent openings

`usePackPartnerOpenings` polls REST through the read service. These short visits
already need a snapshot; polling avoids a socket/auth/reconnection lifecycle and
an additional dependency. All scheduling and the bounded presentation queue live
in this hook. Views report visibility and scrolling; they do not keep a second
snapshot or implement timers.

Defaults are 20 displayed/queued items, a 1000 ms poll and a 1000 ms insertion.
Every view can override `listLimit`, `pollIntervalMs`, `insertIntervalMs` through
hook options. `pause()` stops insertions while the user reads further down the
list; polling continues. `resume()` restarts the normal insertion cadence.
Disabled, background and offline states stop both clocks. Filters are forwarded
to the same endpoint; the API always sorts newest first.

See the [recent openings specification](recent-openings.md) for option bounds,
filter precedence, lifecycle acceptance criteria and test ownership.

## Responsibility boundaries

The [HTTP client](../clients/PackPartnerApiClient.ts) validates PackPartner responses and maps protocol errors for both paths. Calling it from the provider does not bypass validation. The data service owns cached-read policy and normalizes transport responses into PackPartner models. Application types are aliases of those models; no additional provider-to-application mapper exists. The client drops raw upstream error messages and payload-bearing causes, verifies returned status memos, and propagates cancellation for reads. The workflow owns transitions, recovery and the checks against the approved account, mint and amount; the Snap guard verifies the transaction before signing. The workflow and controller do not expose parallel catalogue, inventory or ownership reads, and no screen calls PackPartner directly.

Social command hooks express share, reaction, comment and follow intent. The Social data service owns their affected query families and refreshes the relevant cached reads through the background/UI bridge. Views do not separately invalidate the whole Social or Collectibles scope. A refresh failure after a completed command must not turn it into permission to submit the mutation again. A first read started before the command can otherwise be reused by TanStack invalidation and republish the old state. The service waits for those affected reads before refetching. Feed and social-context projections still loading are included in that wait, then their content is rechecked to refresh only projections containing the changed item. [Follow integration tests](CollectiblesFollow.integration.test.ts) and [Social command tests](CollectiblesSocialCommands.integration.test.ts) exercise this ordering through the real service/query bridge.

Global search is intentionally local: the catalogue, the current account's owned cards and public inventories already loaded in the current environment. See [the search contract](../../views/CollectiblesSearch/README.md).

PackPartner, Collectibles API and Social API are complementary services, not interchangeable purchase providers. Introduce shared product models and provider-qualified identities only when a second concrete execution provider demonstrates the required differences.

## Testing

Unit tests cover each service with a mocked client. [PackPartnerDataService.test.ts](PackPartnerDataService.test.ts) covers reset racing with invalidation; [CollectiblesDataServices.integration.test.ts](CollectiblesDataServices.integration.test.ts) covers optional API reads failing during a connectivity loss through the real Messenger/query bridge. The offer concurrency limiter transfers a freed slot directly to the oldest waiter so a newly arriving read cannot overtake it and exceed the limit; [async.test.ts](../../providers/pack-partner/utils/async.test.ts) covers that handoff. Integration tests use the real data services, messenger, UI query proxy and workflow, with only HTTP, the Snap and the backend clients mocked. They cover refresh after workflow outcomes, account and environment isolation, wallet reset, read retry discrimination, controlled opening retries, submission recovery and token confidentiality.

## Production prerequisites

An approved PackPartner proxy and authentication contract remain required. Purchase and sale references use standard controller metadata persistence through `EngineService` and `ControllerStorage`. Writes are debounced for 200 ms; an abrupt crash can lose an unflushed update. [Recovery and persistence](recovery-persistence.md) describes restoration from saved references and its limits. Native interruption validation remains a release check.

Social and Collectibles API still require approved live schemas, authentication, error contracts and reconciliation of their projections after Core purchases and sales. Engine currently injects `MockCollectiblesApiClient` and `MockCollectiblesSocialApiClient` directly. Each contains its own static responses; neither simulates server calculations, pagination or mutable state. There is no demo mode, layer gate, client registry or extra provider wrapper. Replacing those two injected clients with authenticated HTTP clients does not change the services, hooks or screens. Solana mainnet/devnet configuration is independent of this transport choice.
