# Pack Partner read-service integration tests

### Collection storage — [`storage.ts`](storage.ts)

- **Real:** Engine data-service messenger factory, `StorageService`, `PackPartnerDataService`, the validated HTTP client and the UI query bridge.
- **I/O substitutes:** `InMemoryStorageAdapter` for disk and a fetch mock for HTTP. Reusing the adapter across harness instances models a process restart without adding another cache implementation.
- **Factories:** `buildPackPartnerStorageHarness(storage?)` supplies the real storage messenger for service unit/integration tests; `buildPackPartnerPersistenceHarness(storage?)` adds the real HTTP client, read service and UI proxy.
- **Returns:** storage harness `{ messenger, storage, storageService }`; persistence harness additionally `{ service, ui, fetchMock, cleanup }`. Cleanup destroys process state without deleting the persisted snapshot. Tests call `service.clearCache()` explicitly to model a wallet reset.
- **Coverage:** `PackPartnerCollectionPersistence.integration.test.ts` verifies offline restart, snapshot publication before a held online refresh, empty success replacing older ownership, failed cursor pagination preserving the previous snapshot, wallet/network isolation, malformed storage, collection-only persistence and reset ordering against an in-flight storage write. These are deterministic service/storage tests, not proof of native filesystem behavior.
