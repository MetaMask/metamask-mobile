# Gacha

Gacha owns the screens, tabs, navigation and homepage entry point.

`controllers/GachaController.ts` owns the feature state and its Engine integration. It creates `providers/collector-crypt/CollectorCryptProvider.ts`, which owns purchases, recovery, card synchronization and buybacks. The provider reads and updates its dedicated `collectorCrypt` state through callbacks; it does not own a second persistent store.

`services/` contains technical clients shared by the feature, including the MetaMask Solana NFT API. Collector Crypt filtering and card conversion stay inside the provider.

Future providers belong alongside `collector-crypt/`. Their operation and recovery logic stays provider-specific; Gacha carries their persistent state and coordinates access without introducing a generic provider framework.

The version-gated remote flag `gachaEnabled` controls feature visibility and defaults to disabled. For local development builds, `MM_GACHA_ENABLED="true"` in `.js.env` forces Gacha on without changing other feature flags. Release builds ignore this override.
