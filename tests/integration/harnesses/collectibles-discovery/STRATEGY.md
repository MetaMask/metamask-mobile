# Collectibles API and Social data-service integration

The tests exercise real `BaseDataService` instances, the messenger and the UI query bridge. The only replaced boundaries are `CollectiblesApiClient` and `CollectiblesSocialApiClient`. Their default responses come from the two standalone static mock clients; tests override individual responses or failures at that boundary when exercising a transition.

`buildCollectiblesSocialApiDataHarness` supplies one injected client, the real `CollectiblesSocialApiDataService`, its messenger and `createUIQueryClient`. It owns observer and cache cleanup. Account/environment isolation belongs to query keys, not to a registry of mock datasets. No wallet, network or signing calls occur.

Tests verify batching and coalescing, cursor forwarding, wallet-reset cancellation and mutation invalidation. They do not verify simulated backend calculations, attribution rules, cursor generation, indexing or stateful mock mutations. Social command tests verify that new server responses reach active UI queries, unrelated scopes and query families stay cached, and post-commit refresh errors do not encourage repeating a write.

PackPartner reads and purchase/recovery workflows remain covered by their separate harness and suites.
