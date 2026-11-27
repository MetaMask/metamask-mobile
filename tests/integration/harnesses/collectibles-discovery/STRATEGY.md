# Collectibles discovery integration strategy

Use the [flow matrix](collectibles-discovery-use-cases.md) for Collectibles API and Social read and command scenarios. Place executable tests next to the feature service.

[The Social harness](social-data-services.ts) constructs the service, its client, messenger and UI query bridge. Track subscriptions with `track()` and call `destroy()` after each test. The [lifecycle suite](../../../../app/components/UI/Collectibles/services/data/CollectiblesLifecycle.integration.test.ts) checks startup. Add query isolation, batching and mutation invalidation cases as their endpoints land. Substitute network responses at the client boundary.
