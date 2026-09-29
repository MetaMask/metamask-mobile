# Gacha

Gacha owns the screens, tabs, navigation and homepage entry point.

`controllers/GachaController.ts` owns the feature state and its Engine integration. It creates `providers/collector-crypt/CollectorCryptProvider.ts`, which owns the Collector Crypt integration. Provider business logic and shared technical services follow in a separate change.

Future providers belong alongside `collector-crypt/`. Their operation and recovery logic stays provider-specific; Gacha carries their persistent state and coordinates access without introducing a generic provider framework.

The version-gated remote flag `gachaEnabled` controls feature visibility. It defaults to disabled and has no environment-variable fallback.
