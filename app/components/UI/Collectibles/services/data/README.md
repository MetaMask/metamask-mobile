# Pack Partner data services

Follows ADR 0020 and PredictNext's read-service / workflow separation.

- `PackPartnerDataService` extends `BaseDataService`. Hooks use
  `@metamask/react-data-query` query keys routed through `ReactQueryService`.
  `packPartnerQueries.ts` defines keys and invalidation families, including the
  environment and wallet where relevant. Cache freshness, coalescing and bounded
  read retries belong to the service, not the controller.
- Catalogue reads are transient (zero stale/GC time); offline UI must not offer
  stale packs. Owned cards load completely in pages of 500 and refresh completely.
  This intentionally trades refresh cost for one consistent collection snapshot.
  The last complete successful snapshot is saved through `StorageService` and can
  be restored offline after restart. Failed/partial refreshes do not replace it.
  The sum of insured values is denominated in USD; currency display is UI scope.
- Buyback quotes have their own cache. Signing always rechecks a fresh offer
  against the accepted base-unit amount. There is no duplicate controller cache.
- `usePackPartnerOpenings` polls `PackPartnerDataService` while visible, online
  and foregrounded. It owns a bounded presentation queue, independent of server
  cache. Defaults: 20 displayed/queued cards, a 1000 ms poll interval and a
  1000 ms insertion interval; every view can override them. Pause stops only
  insertions while the reader scrolls. See [openings specification](recent-openings.md).
- Wallet reset clears disk snapshots and caches; pending writes cannot restore
  old wallet data. Engine awaits cleanup before destroying service messengers.

## Commands are not cached reads

`CollectiblesController` delegates commands to `PackPartnerProvider`, which uses
its own instance of the same validated API client. Generated payments expire;
creating or submitting transactions must not inherit read-cache or automatic retry
policies. An uncertain broadcast is reconciled by its memo, not replaced with a
new payment. Opening uses bounded, explicit same-memo polling. Buyback creation
uses a fresh offer and validates the expected refund. Recovery observes existing
operations. Terminal outcomes invalidate affected owned-card and quote families.

The client owns transport and response validation. The provider owns transaction
orchestration and reconciliation; the DataService owns display reads. This is the
same distinction as PredictNext's order workflow, with Pack Partner-specific
expiry, submission uncertainty and buyback acceptance constraints.

See [recovery and persistence](recovery-persistence.md) for the journal contract.
Social and Collectibles API read services are intentionally absent from this PR.
