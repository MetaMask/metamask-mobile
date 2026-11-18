# Pack Partner data services

Follows ADR 0020 and PredictNext's read-service / workflow separation.

- `PackPartnerDataService` extends `BaseDataService`. Read consumers use
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
- Recent-opening snapshots are uncached reads. Polling and the presentation queue arrive with the hooks in step 2.4.
- Wallet reset clears disk snapshots and caches; pending writes cannot restore
  old wallet data. Engine awaits cleanup before destroying service messengers.

## Commands are not cached reads

This service exposes server reads only. Financial commands must use the validated
client directly: generated payments expire, submission failures can be ambiguous,
and read-cache retry policies must never replay a payment. The provider/controller
workflow and its recovery journal arrive in step 2.3. The controller at this step
still has only its initialization state; collection snapshots belong solely to
`StorageService`, scoped by wallet and environment.

Social and Collectibles API services are outside this stack.
