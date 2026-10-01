# Gacha

Gacha owns the screens, tabs, navigation and homepage entry point.

`controllers/GachaController.ts` owns the feature state and its Engine integration. It creates `providers/collector-crypt/CollectorCryptProvider.ts`, which owns purchases, recovery, card synchronization and buybacks. The provider reads and updates its dedicated `collectorCrypt` state through callbacks; it does not own a second persistent store.

`services/` contains technical clients shared by the feature, including the MetaMask Solana NFT API. Collector Crypt filtering and card conversion stay inside the provider.

Future providers belong alongside `collector-crypt/`. Their operation and recovery logic stays provider-specific; Gacha carries their persistent state and coordinates access without introducing a generic provider framework.

The version-gated remote flag `gachaEnabled` controls feature visibility and defaults to disabled. For local development builds, `MM_GACHA_ENABLED="true"` in `.js.env` forces Gacha on without changing other feature flags. Release builds ignore this override.

## Pack artwork

Mobile stores only the finished WebP exports in [assets/pack-artwork](./assets/pack-artwork), all at the same level: `<slug>.webp` for full resolution and `<slug>-list.webp` for the 384 × 768 list thumbnail. The catalogue covers 30 Collector Crypt packs and the provider-independent Origin default. Purchase confirmation and reveal use the full-size images; the two-column pack list uses thumbnails.

Source illustrations, templates, prompts, generation history, recipes, preview catalogues and TypeScript tools live in the sibling repository `../gacha-pack-artwork` (relative to the Mobile repository root). Its README and AGENTS.md describe generation and export. Export the finished WebPs from that repository; do not restore authoring files or dependencies here.

[controllers/GachaPackCatalog.ts](./controllers/GachaPackCatalog.ts) owns the shared visual identities, display names and provider-code associations. An equivalent Pokémon 50 offer from another provider maps to the existing `pokemon-50-spark` identity and reuses the same images. This is presentation configuration, not persisted controller state, and providers have no knowledge of the chosen artwork. Unknown providers or codes show Origin while preserving the API name. The printed pouch color follows the artwork catalogue's price band; reveal lighting follows the actual card's rarity through `PackReveal.constants.ts`. Sharing artwork never replaces live prices, availability, odds or purchase payloads.

## Pack reveal

`components/PackReveal` is a provider-independent presentation: a full-resolution pouch floats above an ambient background, a horizontal gesture cuts its seal, then the top strip detaches and the card emerges. Reanimated and Gesture Handler animate on the UI thread; the same pack image is clipped into two regions, with no additional artwork or animation library. The result's actual rarity chooses the light, particles and haptic profile. Missing rarity uses the neutral common profile. Haptics use the shared MetaMask toolkit and respect its user preference and kill switch.

The hint sits above the pouch. A travelling diffuse light indicates the seam; a persistent luminous cut and its tip follow the finger. Cutting has 32 progress steps, with rigid impacts at least 35 ms apart while advancing. The 6.8-second opening builds tension, separates the seal and brightens the existing background with the rarity color. The main light and sparks stay behind the pouch and card; a brief translucent flare at the seam adds a brighter initial impact in front. Both lights have transparent edges, with no opaque screen overlay. The pouch drops briskly and continuously as the card gradually emerges, overlapping its fade with the light's recession. Card information and actions appear once it settles. All motion shares the same UI-thread progress value, without per-frame React updates. Reduced motion skips the light and choreography.

`PackReveal.constants.ts` holds the timings and rarity profiles: Common/Uncommon/Rare/Epic use 18/24/32/40 sparks and 8/12/18/26 crackle pulses. Epic clusters use 60–110 ms spacing. Pulse offsets are in milliseconds so lengthening the visual suspense does not stretch the tactile rhythm. Pulse delivery follows the UI animation rather than independent timers; stale, backgrounded or missed beats are skipped, never replayed as a backlog. Native impact feedback is best effort: it approximates crackling through the existing toolkit, without a custom Core Haptics envelope or a new native dependency. Validate the sensation and synchronization on physical devices when tuning these profiles.

`views/GachaReveal` keeps transaction progress and recovery separate from this presentation. The interactive cut is offered after the provider returns an opened operation and the card image or fallback is ready. Original card images preload behind the pack; an eight-second image timeout keeps a slow image server from blocking an already purchased card. The animation pauses in the background, supports reduced motion and has an accessible Reveal card alternative. Footer space and card metadata space are reserved before revealing to avoid layout jumps. The final actions sell and buy the same pack, or keep the card and buy the same pack. Closing returns to Packs. No transaction is triggered by the cutting gesture or animation callback.

### Local demo

Set `MM_GACHA_REVEAL_DEMO="true"` in the ignored `.js.env`, then restart Metro to apply the build-time environment variable. Development builds show **Demo Pack** at 0 USDC in All and Pokemon. It reuses the Pokémon 25 artwork and catalogue data but bypasses purchase confirmation and every purchase/sale method. Release builds ignore the flag, including direct attempts to open the demo route.

The preview reads the first card already stored for the selected account. It changes only a local copy's rarity; the collection, balance and operations are never modified. Choose Common, Uncommon, Rare or Epic to restart the animation with that profile. Both demo footer buttons replay it, including the simulated sell action. Closing returns to Packs. If the account has no cached card, the preview explains how to select one instead of purchasing anything. Remove the environment flag to hide the demo after visual validation.
