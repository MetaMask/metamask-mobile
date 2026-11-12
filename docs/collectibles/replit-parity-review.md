# Collectibles demo parity review

The reference is the local `Gacha-North-Star/artifacts/figma-design/src` checkout. Replit owns presentation and animation design. Mobile owns navigation, accessibility, provider data, signing and recovery. This document records the mapping and deliberate boundaries; it is not a claim of pixel-perfect device validation.

## Current reference: `91a2d0c9`

The current refresh removes the Collectibles bottom navigation. Three home shortcuts open Packs, Collection and Market as stack destinations. Back returns to the actual caller, including direct wallet entries continued through onboarding. Earlier device evidence below is historical and does not validate this refresh.

## Screen and interaction mapping

| Reference                                       | Mobile implementation                                                   | Behavior checked                                                                                                                                                                         |
| ----------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HomeDiscoveryPackCard`, onboarding destination | Wallet `CollectiblesSection`, `CollectiblesOnboardingContext`           | Tile opens detail; Open opens review. Both destinations survive first-visit onboarding.                                                                                                  |
| Home navigation shortcuts                       | `CollectiblesShortcuts`                                                 | Three design-system buttons push destinations; no Collectibles bottom bar or synthetic home on Back.                                                                                     |
| `HomePackSpinner`, `PackGalaxy`, `PackArtwork`  | `PopularPackCarousel`, `ReplitPackWheel`, `CollectiblesMotion`          | Source foil and 12-second float, stable horizontal gesture adapter, transparent artwork-colored halo inside the scrolling hero; inactive scenes pause.                                   |
| Popular discovery sections                      | `OverviewTab`                                                           | Public openings, pool greatest hits, optional friend activity and leaderboard. Catalog data stays live; optional indexed data uses the injected backend client.                          |
| `PacksCategoryGrid`, collection filters         | `PacksTab`, `CollectiblesSearch`                                        | Virtualized grids, shared category grouping, search/filter/sort, tile detail action and separate Open action.                                                                            |
| `PackDetailHero`, `PackInventory`               | `CollectiblesPack`, `CollectiblesPackHero`                              | Swipe within the pack family, inline price-band metrics, public openings, inventory pagination, social context and fixed Open action. No former balance/plus header.                     |
| `PackQuickBuySheet`                             | `PackPurchaseSheet`                                                     | Amount-first layout, quantity presets, maximum five, independent Auto-sell Commons and Skip reveals, exact total, one Buy action.                                                        |
| `PackOpeningReveal`, `InteractiveCardSlab`      | Bundled original presentation plus native reveal views                  | All packs settle/open before presentation starts. Reveal is presentation only. Per-card result, Skip, next result and final haul retain the operation state.                             |
| `PackBatchSummary`, `CardSellSheet`             | `CollectiblesBatchResults`, `BuybackConfirmation`                       | Virtualized two-column haul, no selection by default, reviewed buy-again and reviewed manual buyback, confirmed sold receipts retained.                                                  |
| `CollectionCard`, `CollectionTab`               | `CardTile`, `CardsTab`                                                  | Set-only title with API-name fallback, art-only rarity surface, compact grading badge, real holdings, category filter sheet, buyback filter and local-currency total/value.              |
| `CardDetailPage`, card actions                  | `CollectiblesCard`, `CollectiblesPublicCard`                            | Interactive front/back, inline metadata, separate external share and Social composer for owned cards, overflow actions, replay and reviewed buyback. Public discovery cards cannot sell. |
| `OpenHistory`, `GachaPokedex`                   | `CollectiblesHistory`, `CollectiblesPokedex`                            | Cursor-paginated indexed history, sales filter, discovered species, generation silhouettes and first/last pull information.                                                              |
| Collector profiles, favorite packs, leaderboard | `CollectiblesProfile`, `ProfileCollectibles`, `CollectiblesLeaderboard` | Full indexed profile aggregates, opening history including sold cards, favorite packs, linked-wallet stats and metric selection. These are not claimed to be current onchain holdings.   |
| `CardComingSoon`, marketplace scenes            | `MarketTab`, copied motion scenes                                       | Original illustrated slideshow, with an explicit partner-browser action. The illustration does not sell any card.                                                                        |
| Original onboarding videos                      | `CollectiblesOnboardingScreen`                                          | Bundled source video/poster assets and preserved entry intent.                                                                                                                           |

## Data and business boundaries

- PackPartner, Collectibles API and Social are three distinct data services. PackPartner owns live provider data, including wallet cards; the two unavailable backends use injected deterministic demo clients.
- Shared query descriptors use the app's messenger query proxy. UI hooks do not define HTTP query functions. Holdings are DataService reads; controller state retains only operation references and receipts for recovery.
- Purchases and sales do not enter query caches or automatic retry policies. Recovery and synchronization use an explicit controller command. A read query never starts payment recovery.
- Recent openings retain twenty events per pack, deduplicate REST and live events, and unsubscribe on blur, background, offline and obscuring screens. They are public openings, not just the current wallet's cards.
- The purchase screen disables alternate-token selection until MetaMask Pay supports the required Solana destination. Insufficient USDC disables Buy. It does not silently substitute Quick Buy.
- Native platform menus, sheets, type and accessibility behavior use the MetaMask design system. Animation implementations are copied and hash-verified; native adapters own gestures that must coexist with lists.

## Deliberate differences and remaining dependencies

- The active home source is `TradeCollectiblesTop`, which selects the `subtle` halo variant. Mobile reproduces this as native SVG with transparent edges attached to the scrolling hero. The separate legacy `GachaPage` galaxy video is not the reference for this home.
- No portfolio chart is displayed, as requested. No fake balances, invented profit/loss, API prices or rarity values are substituted for live provider data.
- Greatest Hits currently ranks the current provider pools. Historical seven-day greatest pulls need an approved indexed endpoint and are not represented by that label.
- Marketplace and redemption open PackPartner in the MetaMask browser. Transfer remains disabled until a supported, reviewed Core transfer workflow exists. Compact sold list tiles use an accessible static native treatment rather than a WebView per badge.
- Social and Collectibles API are demo contracts, not deployed backend integrations. Real Social publishing and production proxy/auth remain separate production work. Operation recovery uses standard controller persistence with the limits in the [recovery document](../../app/components/UI/Collectibles/services/data/recovery-persistence.md).
- Dev tools appear only on devnet; the faucet opens inside MetaMask. No faucet request, signing, purchase, sale or posting is necessary for the validation described here.
- Collectibles has no bottom navigation and does not depend on the wallet glass-menu flag. Its home shortcuts use design-system buttons; native stack navigation preserves the origin.
- Leaderboard metrics follow the approved Core/Social brief: volume, Epics, packs and Pokédex. Replit's badges metric is deferred with the V2 badge feature. Global search filters already available catalog, owned-card and discovery data without a request for every character or a fan-out across all pack inventories.

## Validation evidence

Focused view tests cover entry intents on iOS and Android, read-only purchase review, public inventory, watch cleanup and navigation. Service integration tests use the real messenger and query proxy with mocked transports. The isolated browser motion test verifies copied card flip, reveal, foil, Market scenes, pause and reduced-motion behavior without a wallet or remote code requests. The current halo is native SVG, not the former browser galaxy.

### Current refresh checks

The reveal/card-effect update from this reference has been reverted at the user's request: its replacement will come from a separate Replit. The previous reviewed reveal is retained, with no CanvasKit WASM payload or Skia dependency. Only the independently updated pack float CSS remains from the latest animation import.

The follow-up fixes shortcut buttons to stack their icons above their labels, copies the source shortcut glyphs missing from the installed native design system, and uses the source's category-free hero titles for known pack artwork. Unmapped API pack names remain intact. Home and detail use native gesture arbitration to keep horizontal dragging from also moving the vertical list. Component-view tests exercise pack selection, a failed vertical intent, tap suppression after dragging and navigation; they cannot prove native scroll arbitration on an iPhone.

Current follow-up checks: the Home, Overview, Pack and Reveal component-view suites pass (170 tests); Overview was rerun after binding the gesture to FlashList's inner ScrollView (30 tests, included in that total). The wheel, hero-route and geometry unit suites pass (9 tests). The restored bundled motion passes the isolated browser smoke, including card reverse, reveal completion once, background pause and reduced motion, without network requests. Source comparison confirms that the bundled document matches the previous revision except for the approved pack float CSS. No CanvasKit payload remains.

ESLint reports no errors on the touched TypeScript files. The full TypeScript check still reports five unrelated diagnostics in ActivityList's `mapV5ApiTransaction` import and Social's `Position.profileId` uses; none is in Collectibles. The physical iPhone screenshot identified the shortcut layout mismatch, but it locked again before the final gesture check. Native visual/gesture acceptance remains pending; these automated results are not a pixel-perfect certification.

## Test layer placement

Screen selection, drag-release tap suppression, vertical-recognizer failure and route behavior are covered by the existing component-view tests. Narrow unit tests inspect native gesture relationships and retained animation nodes, which are below that screen-level boundary. The isolated browser smoke covers the bundled presentation with inert fixture data. Neither Jest nor a browser simulates iOS's competing native scroll recognizers; final horizontal/vertical arbitration needs an unlocked device check. No financial transaction is part of validation.

## Second audit against the current reference

The second review re-read the source at Replit commit `7edffd68473ef0ed44663e6d21da667b07fed1f8`, the business-rule matrix and the Core/Collectibles API/Social brief, instead of treating the first checklist as proof of completeness.

Confirmed omissions and regressions corrected in this pass:

| Finding                                                                             | Correction                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wallet previews had only price order, without seven-day activity or Social context. | Use the existing batched insights/context services; retain the standalone Core fallback when optional layers are disabled.                                                                                        |
| The Trade Quick Actions menu had no Collectibles entry.                             | Add the feature-gated entry, close the tray first, and retain the onboarding destination.                                                                                                                         |
| Onboarding's second step had no Back action.                                        | Restore the source navigation action.                                                                                                                                                                             |
| Popular kept its public live watch active behind a card or purchase review.         | Unsubscribe while covered and re-subscribe on return; pause the decorated hero too.                                                                                                                               |
| Public discovery cards outside pack detail could not open purchase review.          | Resolve the exact known pack first, otherwise recommend the cheapest matching category. Unknown categories stay disabled. A recommendation never becomes historical provenance. Cancellation returns to the card. |
| Known pack/opening context disappeared in public details.                           | Preserve provider pool/event pack codes and opener addresses, forward indexed origin labels, and show available last-opening context. Historical receipts use neutral “Sale proceeds” wording.                    |
| Partial opening snapshots could erase known metadata.                               | Preserve known fields when the event omits them.                                                                                                                                                                  |
| Mock history could lose events tied on timestamps.                                  | Use the same comparator for sorting and cursor boundaries.                                                                                                                                                        |
| Empty Pokédex/profile screens had no next action.                                   | Add clear-filters and catalogue entry actions matching their context, without initiating a purchase.                                                                                                              |
| A one-card selection in the batch used an older sale review.                        | Reuse the current card sale sheet and retain partial-sale/reconciliation behavior.                                                                                                                                |
| Sales history displayed the opening date instead of the sale date.                  | Use the confirmed sale timestamp in list rows and receipts.                                                                                                                                                       |
| A retained owned-card receipt could outlive the selected account.                   | Isolate it by account and mint; stale account actions are disabled.                                                                                                                                               |
| Confirmed sales and collection arrivals lacked the active reference transitions.    | Copy the original coin celebration and collection flight, measure native artwork positions, restore each destination independently, and reject old completion callbacks.                                          |
| Collection value used static text instead of the reference digit transition.        | Bundle the exact NumberFlow distribution and Oswald font, preserving its 350ms delay and 1100ms transition; keep a native accessible final value and error fallback.                                              |
| Public profiles omitted Follow/Following, biography and follower count.             | Add the temporary typed Social mock contract and cache invalidation; hide Follow for self profiles or a disabled Social layer. No production Social call is made.                                                 |

The active Just opened rail also reproduces the reference entry/flip/copy transitions (360ms, 620ms and 240ms, with the original delays and curves). It runs only for a new real event at the head of the list and only once its real back image is available. Initial history, duplicates and older pages do not replay it. The snapshot stays frozen during interaction. Native lifecycle tests cover blur, background, reduced motion, late image loading and unmount. The unused Epic-confetti CSS is not instantiated by the reference component.

Source-only samples must not become fabricated live data. Replit's incrementing sales badge and derived page-view count are illustrative; Mobile displays the service snapshots without a mock-specific UI branch. Rewards/badges remain outside the approved scope. The unavailable alternative-token payment flow stays disabled. The explicit requested behavior of a per-card Skip and one Buy action takes precedence over later Replit copy changes.

Recent Openings retains twenty events per pack. No historical cursor is validated in the current PackPartner winners contract, so scrolling does not request an invented older-events page. Inventory and indexed history use their supported pagination separately.

`BatchSummaryIntro`, `BatchCollectionLanding` and `GachaTraderSuggestions` are dormant components in this Replit version: none is imported by the active app. They are not added merely because their source files exist. Active sale and collection-arrival transitions are audited separately from those unused components.

The reference onboarding links still target `example.com` and are marked pending legal review. They are not represented as approved terms or invented production destinations.

### Pack-detail and list layout follow-up

- Popular and pack-detail galaxy backgrounds now belong to the clipped, scrolling hero instead of the page viewport.
- Pack detail keeps the expanded-footer reference height when See more disappears. The entry flight waits for the first native footer measurement. Social, statistics, public-opening and inventory placeholders preserve their slots while data loads, fails or is absent.
- Popular keeps its pack order during a visit. Late statistics update the displayed metadata without moving the selected pack or rebuilding an active gesture. Catalog additions and removals still take effect.
- Shared card summaries reserve title, value and grade rows. Optional captions, pending-sale status and unavailable favorite packs no longer change neighboring tile sizes. Native FlatList grid items use half-width rows; FlashList items fill their already-sized cells.
- Collection search retains the design-system field height. Collection continues to show total value, search, filters and lists, with no PnL or portfolio chart.

These follow-up changes require device visual confirmation; component-view assertions establish hierarchy, state transitions and layout constraints, not pixel-perfect native rendering.

Focused validation for this follow-up: 114 component-view tests (Home, haul, Popular and pack detail) and 41 unit tests (shared tiles, hero interaction and flight geometry) pass. Deferred data tests cover retained slots and stable pack identity; detail tests also cover footer contraction and background containment. These are overlapping regressions of the earlier suite inventory, not additional unique project-wide coverage.

### Second-pass validation

- Navigation and wallet entry: 3 component-view suites / 90 tests pass. Persistent transfer host and card tile: 22 unit tests pass, including late and missing targets, individual landing, reduced motion, background/unmount, account changes and old callbacks.
- Purchase/sale/reveal/haul/history checks: 90 component-view tests pass. The Explore suite was subsequently expanded to 22 passing tests for Follow/Following; this overlaps the earlier 18 Explore tests and must not be added as unique coverage.
- Public-card purchase review and provenance: 8 component-view tests pass. Pack resolution and card-display helpers: 16 unit tests pass. No public card obtains sell rights from a discovery event.
- Provider/feed/pagination/registry checks: 117 unit tests pass. Additional query-proxy integration: 5 tests pass. Social follow plus existing discovery integration: 14 tests pass; profile cache updates and unchanged Collectibles scores are asserted.
- Offline motion build and browser smoke pass with 30 source files, exact NumberFlow distributions and license verification. The smoke checks real shadow-DOM digit motion, source timings, independent card landings, absent destinations, interruption, reduced motion and absence of external requests.

- Additional native amount/bridge/receipt checks: 4 suites / 33 tests pass. The Home suite passes all 44 tests after integrating the source number renderer. Rail arrival and lifecycle: 11 unit tests and all 14 Overview component-view tests pass.

- Final targeted TypeScript check: 198 changed files/integration points, zero diagnostics. Final ESLint: 196 files, zero errors and 30 warnings (29 deprecated API notices and one ignored-file notice). Prettier and `git diff --check` pass. Root dependencies, lockfiles and native iOS sources remain unchanged.
- A further native scroll check exposed content overlapping the transparent Popular title. The header now uses the existing MetaMask floating material with scroll-driven opacity; the expanded Overview suite passes 16 tests, including top, scrolled and return-to-top states.

### Second-pass native observations

After a fresh app launch, the simulator shows the new wallet preview activity counters/Social context, current foil artwork, Popular galaxy and Epic context, and public card details with a known origin pack. Opening Buy pack from a public card displays the modern review (1/2/5 presets, independent toggles, unavailable alternate funding, disabled Buy with zero devnet USDC). No purchase was confirmed.

The Collection screen also renders the original Oswald amount typography, search, category filters, buyback filter and the empty Core state. Its Sales preview reads the injected Collectibles API client.

New inspected captures: `collectibles-second-wallet.png`, `collectibles-second-popular-final.png`, `collectibles-second-public-detail.png` and `collectibles-second-collection.png` in the task's `collectibles-parity` artifact directory. The final scrolled-header capture remains unverified: XCTest stopped reading the app accessibility tree after earlier successful navigation (`kAXErrorIllegalArgument`), despite the runner opening its listener. Relaunching the app restored navigation temporarily, but the final gesture timed out again. A direct native screenshot confirms that the app still renders Popular at rest; it does not establish the corrected scrolled appearance. The header's behavior is covered by view tests, and full pixel-perfect device equivalence is still not claimed.

## Pack artwork simplification — 2026-11-10

The latest product decision supersedes the historical crop/galaxy comparisons above. Pack names and illustrations now use a single explicit provider:code map. Images retain their transparent margins in native and motion rendering; generated alpha-crop bounds and the artwork snapshot are removed. Popular and pack-detail heroes use a solid theme color with a soft native backlight instead of sampled galaxy artwork. Original Replit float/glimmer and reveal timelines remain the source of truth. Native visual parity for the replacement background needs a new device check; earlier screenshots do not validate this change.

## Architectural cleanup — 2026-11-10

The obsolete QuickBuy funding hook/sheets and unused earlier UI components have been removed, rather than retained behind inaccessible controls. API clients and DataServices expose only the methods currently consumed by screens. Historical funding test counts above do not apply to this version. The MetaMask/PredictNext DataService/Messenger/query and workflow/controller boundaries remain in place; the [architecture](./architecture.md) and [agent entrypoint](../../app/components/UI/Collectibles/AGENTS.md) describe the current implementation.
