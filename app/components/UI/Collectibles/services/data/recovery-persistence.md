# Recovery and persistence boundary

## What is persisted

`CollectiblesController` persists one journal per account: pack purchases keyed by memo and manual buybacks keyed by mint. It holds only the references needed to resume observation. Offers are transient server reads. The last successful complete owned-card response is separately persisted by `PackPartnerDataService` through the standard `StorageService` for offline display; it is never part of the controller journal or proof for a financial action. See [the owned collection snapshot policy](README.md#owned-collection-offline-snapshot).

| State                      | Persisted information                                                                   | Recovery                                                             |
| -------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Generated purchase         | Omitted; the unsigned transaction lives in memory only                                  | None: nothing was signed                                             |
| Submitted or paid purchase | Memo, pack, price, batch references and status                                          | `/openPack` and `/pack/status` by memo; never signs or submits again |
| Opened purchase            | The awarded card as the opening's receipt, and reveal progress, until dismissed or 24 h | Restores the reveal; no payment                                      |
| Expired or failed purchase | Status and error, for 24 h                                                              | None                                                                 |
| Pending buyback            | Mint, buyback memo, refund amount, submission marker and signature                      | `/buyback/check` by memo; never signs or submits again               |
| Completed buyback          | The same fields, as a receipt, for 24 h                                                 | None                                                                 |

Signed transactions are never stored, neither persisted nor in controller state. The signed bytes exist only for the duration of the `/submitTransaction` call.

## Why the memo is enough

PackPartner's documented endpoints resolve every interrupted operation from its memo:

- `/pack/status?memo=` returns the payment (`pack.status`, `webhook_received`, the payment `transaction_signature`), the delivery (`send`), the refund (`refunded`, `refund_transaction_signature`) and the buybacks of that pack. `pack.status` is terminal: once `confirmed`, it never reverts, even after a refund. An abandoned checkout keeps a null status forever.
- `/openPack` can open a paid pack only within 2 hours of `/generatePack`, and keeps returning the award of a pack already opened. A paid pack never opened becomes eligible for an automatic refund from 2 h 10 min.
- `/buyback/check?memo=` returns whether a buyback exists and whether it completed. PackPartner deletes a buyback whose transaction never landed.

Resubmitting stored signed bytes would add nothing: a transaction is valid for 150 blocks after its blockhash (PackPartner documents about 30 seconds on mainnet), and the payment can only land once. Storing them would keep transfer-authorization material on the device, which PredictNext's architecture forbids for persisted product state.

## Recovery rules

Recovery runs for every account with a journal when the wallet unlocks, and again whenever a screen resumes an operation. A screen showing a pending sale checks only the account's sales (`checkSales`), without waiting on purchases. Neither ever signs, submits or throws.

- A `submitted` or `paid` purchase is opened by memo. Within the opening window, PackPartner is polled until it awards the card or the polling budget runs out; the purchase then stays resumable.
- After the 2-hour opening window, no polling happens: the pack status decides. Delivered means opened from the status, refunded means failed, and paid but not refunded means waiting for the refund. A `submitted` purchase still unpaid means the payment never landed, so it expires. A purchase whose submission PackPartner confirmed stays `paid` until delivery or refund, even if the payment webhook never arrived.
- Any `/submitTransaction` failure, including HTTP 4xx, keeps the purchase `submitted` until its pack status resolves it. An HTTP status alone is not a provider guarantee that no broadcast happened.
- A pending buyback never handed to `/submitTransaction` is discarded. Otherwise `/buyback/check` decides: complete means sold, a buyback that no longer exists never landed and is discarded, anything else stays pending and blocks a new sale of that card.

Elapsed time alone never proves non-payment. Only PackPartner's pack status, read after the opening window, does.

## Standard controller persistence

Collectibles uses the same persistence path as other MetaMask controllers:

1. Controller metadata marks ordinary fields with `persist: true` and filters the operation journal through its `persist` functions. This projection contains references and receipts, never transaction bytes.
2. `EngineService` subscribes to controller state changes and passes that projection to `createPersistController(200)`.
3. The shared persistence function debounces updates for 200 ms, then writes `persist:CollectiblesController` through `ControllerStorage` to native filesystem storage.
4. At startup, `ControllerStorage.getAllPersistedState()` loads the saved state. Engine initializes the Controller from that projection, and wallet unlock starts recovery from the saved operation references.

After signing, the Provider records the purchase as `submitted` (or the buyback as attempted) in controller state before calling `/submitTransaction`. Persistence proceeds asynchronously through the standard Engine subscription; submission does not wait for a disk write. There is no Collectibles-specific storage implementation or persistence error policy.

This means an abrupt process termination can lose the latest update that has not yet been flushed, including a newly recorded submission reference. Recovery can only observe operations present in the saved state; it cannot recover a missing reference from this journal. It never signs or submits a replacement payment. PackPartner remains authoritative for settlement and ownership.

Wallet reset clears the controller's onboarding and operation state, including archived environments, through the normal Engine reset flow. Existing state-schema restoration supports older operation shapes by dropping card caches and transaction bytes; it does not introduce a separate filesystem migration or storage format.

Provider renames also restore development journals before selecting the active environment. The controller recognizes a single journal by its `operations`/`sales` shape and its `Environment`/`ByEnvironment` sibling keys, then writes only the current `packPartner` keys. It preserves memos, batches, pending sales and network archives; a missing network marker still means mainnet, never the current build's network. Mixed provider namespaces, unsupported saved networks or duplicate active/archived journals for the same network stop initialization with an explicit error instead of choosing or overwriting data. This compatibility is limited to the existing single-provider state shape; it is not a mapper for another provider or a recovery mechanism for missing data.

## Evidence and limits

- `persistConfig.test.ts` verifies that Collectibles persists and restores through the standard controller file.
- Controller and operation-state tests verify metadata filtering, bounded retention, account/environment isolation and wallet reset.
- `CollectiblesController.test.ts` also restores a neutrally named previous provider, checks persistence round trips and refuses ambiguous journals; recovery still observes saved memos without a new signature or submission.
- Provider and Controller integration tests restore a saved projection and resume by memo without signing or submitting again. They also verify that a wallet reset invalidates in-flight work.
- Existing integration tests cover delayed payment webhooks, lost responses, the opening window, submitted buybacks, interrupted reveals, unlock recovery and account/environment isolation. Errors persist as codes only, including when restoring legacy projections.

These deterministic tests begin recovery with a saved projection. They do not prove that the latest controller update survives termination during the debounce interval or native I/O. Native crash/launch validation remains a release check; no real purchase or sale is required for these tests. Contract assumptions about provider deadlines, refunds and negative status answers above must remain linked to the provider's reviewed API contract; a mocked response is not evidence of a remote guarantee.
