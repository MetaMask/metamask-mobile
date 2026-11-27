# Pack Partner integration strategy

Use [the flow matrix](pack-partner-use-cases.md) to choose the test layer. Add executable scenarios under `app/components/UI/Collectibles` as each workflow lands.

- [Workflow harness](pack-partner.ts). `buildPackPartnerIntegrationHarness` constructs the controller, provider, read service, Engine messengers, StorageService and UI query bridge. Two HTTP clients share a fetch mock. The Snap request handler, checkpoint writer, signature status and blockhash validity are test boundaries. Supply `state` to model a restart or `respond` to exercise a transport failure. Await pending work and call `cleanup()` after each test.
- [Storage harness](storage.ts). `buildPackPartnerStorageHarness` supplies the real StorageService with an in-memory adapter. `buildPackPartnerPersistenceHarness` adds the read service, a fetch mock and a UI query client. Reuse the adapter across instances for restart tests. Call `service.clearCache()` to model wallet reset and `cleanup()` for ordinary teardown.
- [Lifecycle tests](../../../../app/components/UI/Collectibles/services/data/CollectiblesLifecycle.integration.test.ts) cover startup, reset and namespace isolation. Engine unit tests own ordering against the other wallet controllers.
- Purchases and sales belong in feature integration tests when their actions are implemented. Hold or reject the checkpoint promise to verify that submission waits for disk. The Snap owns transaction validation and signature correctness.
