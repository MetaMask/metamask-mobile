# Pack Partner read-service use cases

| Flow                                    | Primary layer | Observable outcome                                                                             |
| --------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| Catalogue, inventory and openings reads | Integration   | Validated HTTP payloads become query results; concurrent reads coalesce.                       |
| Owned collection pagination             | Integration   | All pages load as one complete collection; failed pages do not publish a partial snapshot.     |
| Snapshot, restart and offline read      | Integration   | Standard StorageService restores the last complete collection, isolated by wallet and network. |
| Reset during a write                    | Integration   | Earlier writes drain before deletion; old wallet data cannot reappear.                         |
| Read retries and cancellation           | Integration   | Only read policy retries; cancellation does not publish stale results.                         |

Tests use the real client, data service, query bridge and storage messenger with
HTTP and disk I/O mocked. No product screen or device transaction is involved.
