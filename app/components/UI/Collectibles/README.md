# Collectibles

Start with the [source index and ADR status](../../../../docs/collectibles/README.md), [module ownership](../../../../docs/collectibles/architecture.md) and [PackPartner business rules](../../../../docs/collectibles/pack-partner-business-rules.md). Replit remains the reference for presentation and authored animations. This README covers the implementation's screens and local operation; contract status lives in [data sources](../../../../docs/collectibles/data-sources.md).

## Naming convention

The feature is **Collectibles**, always plural. Use `Collectibles` for class,
component and type prefixes (`CollectiblesController`, `CollectiblesApiDataService`),
`collectibles` for functions, paths, query keys and feature-owned identifiers,
and `COLLECTIBLES` for constants, routes and environment-variable prefixes
(`MM_COLLECTIBLES_*`). The remote feature flag is `collectiblesEnabled`.
Apply this convention to controllers, services, clients, hooks, tests, translations
and documentation. Do not introduce singular feature aliases.

Existing platform NFT terminology and external package, provider or design-source
contracts retain their original names; a module rename must not alter those APIs.
This is a coordinated rename of an unreleased module, not a second controller or
compatibility layer.

## PR stack

Extract the POC into stacked, scoped PRs. The current branch order is:

```text
main
└── 0xEdouardEth/collectibles-1-module-init
    └── 0xEdouardEth/collectibles-2-pack-partner-provider
        └── 0xEdouardEth/collectibles-rest
```

Each numbered branch targets its predecessor, with one commit for its own scope.
The numbers identify the extraction order, not GitHub PR numbers; do not renumber
existing branches. `collectibles-rest` always sits on the latest extracted branch.
Its own commit contains only the remaining work, although its checkout includes
the inherited implementation.

For the next extraction, create `collectibles-3-<scope>` above branch 2, then
rebuild `collectibles-rest` above branch 3. Preserve the final application tree and
verify each diff against its immediate parent. Never replay the whole original
POC commit above an extracted PR or leave `collectibles-rest` directly on the init
branch. When a lower branch changes or merges into `main`, restack its descendants
so their PR diffs do not repeat already extracted or merged changes.

## Module boundary

Code outside `app/components/UI/Collectibles/` imports only the module's public
API, [`index.ts`](index.ts). It exports exactly what callers are supported in
depending on; everything else is private. When a caller needs something new,
add a named export to that file rather than reaching inside.

Two rules follow from it:

- **`index.ts` is a boundary, never a file name.** A module carries its own
  name (`routes.tsx`, `selectors/featureFlags.ts`): a lone file does not
  become `index.ts` just because it sits in its own directory, because that
  makes it unsearchable by name. `index.ts` is reserved for the module entry
  point above and for component directories, where the
  [component scaffold](../../../../.agents/skills/mms-component-scaffold/SKILL.md)
  requires one. Never use `export *` in either: Metro does not tree-shake
  barrels, so importing one symbol evaluates the whole file at startup.
- **Composition wiring is listed, not re-exported.** Engine init, its
  messenger, `Engine.types` and the navigation param list have to reach inside
  the module. They are named in the fence's composition allowlist, so the
  dependency stays visible instead of being hidden behind an export that
  product code could then use by accident.

## Data and operations

- `PackPartnerDataService` owns catalogue, pack inventory, owned NFTs and buyback reads. `usePackPartnerOpenings` polls public snapshots through the same read service. `PackPartnerProvider` is the sole purchase provider; it executes purchase, opening, sale and recovery commands. `CollectiblesController` persists their operation journal.
- `CollectiblesApiDataService` reads indexed history, statistics and Pokédex through `CollectiblesApiClient`.
- `CollectiblesSocialApiDataService` reads profiles, feed and leaderboard and sends social commands through `CollectiblesSocialApiClient`.

Reads follow ADR 0020 and PredictNext: hooks use `@metamask/react-data-query` and messenger descriptors; background DataServices own TanStack freshness, shared requests and invalidation. API clients own transport. PackPartner execution does not depend on either of the other services succeeding.

PackPartner has two paths to the same validated client in `services/clients/PackPartnerApiClient.ts`: the DataService for cached display reads, and the Provider for uncached purchase/sale workflows. [The data-service boundary](services/data/README.md#workflow) explains the concrete generation, submission, opening and buyback policies. The Provider keeps operation state through the Controller; it does not maintain another server-data cache.

The two unavailable backend clients are temporarily supplied by `MockCollectiblesApiClient.ts` and `MockCollectiblesSocialApiClient.ts`, injected in Engine initialization. They return fixed responses; screens and hooks have no alternate mode or provenance flag. History need not change after a purchase while these clients are installed. These are proposed consumer contracts, not deployed backend integrations; see [contract status and replacement requirements](../../../../docs/collectibles/data-sources.md#contract-status).

Application types in `types/index.ts` are direct aliases of the PackPartner models. There is one shape and no identity mapper or speculative provider abstraction. Provider code uses `PackPartner`-prefixed types; UI code imports the `Collectibles` aliases. If another execution provider is introduced, its adapter will initially produce this existing shape. Reconsider shared models only when a real difference requires it.

## Collection loading and valuation

The collection balance is calculated in Mobile: sum the available current `insuredValue` values, in USD, across all owned cards. Search and filters do not change this total.

Ma collection shows the last complete ownership snapshot immediately after restart, online or offline; online it revalidates in the background without replacing existing cards with skeletons. First loads use MetaMask skeletons, including the total. Cache ownership, account/network isolation, reset ordering and storage limits are defined in the [DataService policy](services/data/README.md#owned-collection-offline-snapshot). Pack lists are transient, reload from the provider, and are hidden offline. Reusable `PackCard` / `PackList` components own consistent horizontal tiles and loading/empty states. Private packs appear only when their exact code is explicitly approved in `PACK_PARTNER_PRIVATE_PACK_CODES` for the selected network **and** the live catalogue/status still reports them open; the empty default exposes no private machine.

The cards API is paginated using `step=500` and opaque `nextCursor` values until an explicit `null`. Each load/refresh follows all pages automatically before publishing the complete collection. There is no user-driven pagination or scroll-triggered fetching; scrolling only virtualizes rendering. This deliberately favors complete valuation and a stable offline snapshot over incremental display. A later-page failure preserves the previous complete collection. Cursor-cycle/non-progress guards replace the previous arbitrary page cap.

The integration owner's private Solana holder census, dated 2026-11-12, supports this choice. After excluding identified inventory, internal and custody wallets, **17,694 wallets held 83,452 cards**. These are addresses, not unique users.

Mean: **4.72 cards**. **85.9%** of wallets held at most 4 cards.

Percentiles use nearest rank. P99 means at least 99% of these wallets hold no more than the listed number of cards.

| Percentile     | Cards held |
| -------------- | ---------: |
| P50 (median)   |          1 |
| P90            |          6 |
| P95            |         14 |
| P99            |         66 |
| P99.9          |        342 |
| P100 (maximum) |      1,267 |

| Collection size       | Wallets | Share of card-holding wallets |
| --------------------- | ------: | ----------------------------: |
| More than 50 cards    |     220 |                         1.24% |
| More than 100 cards   |      98 |                         0.55% |
| More than 500 cards   |       9 |                        0.051% |
| More than 1,000 cards |       1 |                        0.006% |

API pagination counts all returned objects, including non-card collectibles. Across 20,643 retained wallets with collectibles, **99.93% fit in one 500-object response**. Only 14 need more than one call; 4 need more than two.

Pack-opening history cannot establish current holdings. Secondary purchases, transfers in or out, and buybacks change ownership; insured values can also change. Maintaining this balance in our backend would require tracking those changes. Full inventory refreshes and local summation avoid a separate backend ownership/balance projection and incremental collection bookkeeping in Mobile. This is a pragmatic choice for the observed collection sizes.

A separate eight-wallet measurement (410–539 objects) averaged 1.33 seconds for all HTTP responses, with a 1.93-second maximum, excluding images and native rendering. These are dated observations, not a latency guarantee. The source CSV and benchmark remain with the private ADR discussion. Reassess if collection sizes or the endpoint contract change.

**Ma collection** converts the total and each card's `insuredValue` from USD into the MetaMask-selected display currency, using the shared fiat normalizer and formatter. The homepage Collectibles balance slice uses the same complete owned collection and USD total, converted once; it contributes to the homepage total without counting USDC again. Its [shared cache and refresh contract](services/data/README.md#owned-collection-value-on-the-wallet-homepage) also covers offline snapshots and updates after opening or selling. Animated totals receive the same converted values, currency and locale. Missing values or conversion rates display an em dash rather than a dollar amount mislabeled as another currency. Pack prices, wallet-home previews, card-detail/result screens and USDC settlement base units remain unchanged. Category assignment, ordering and icons are outside this change.

## Environment and access

`PackPartner` is the temporary, neutral name of the execution partner, not another API or adapter. Use `PackPartner`, `packPartner`, `PACK_PARTNER` and `pack-partner` consistently in the Mobile/Snap contract. A later public rename must update both sides, filenames, tests and documentation together; it does not change endpoint paths or NFT standard values.

Set build-time values in the ignored `.js.env`, then restart Metro:

```dotenv
MM_COLLECTIBLES_ENABLED=true
MM_COLLECTIBLES_ENVIRONMENT=devnet
MM_PACK_PARTNER_DEVNET_API_URL=
MM_PACK_PARTNER_DEVNET_CARDS_API_URL=
MM_PACK_PARTNER_DEVNET_WEBSITE_URL=
PACK_PARTNER_DEVNET_API_KEY=
MM_PACK_PARTNER_MAINNET_API_URL=
MM_PACK_PARTNER_MAINNET_CARDS_API_URL=
MM_PACK_PARTNER_MAINNET_WEBSITE_URL=
PACK_PARTNER_MAINNET_API_KEY=
```

`providers/pack-partner/constants/environment.ts` selects the configured API/website base URLs, Solana scope, USDC mint and the matching optional API key together. Supply the real URLs only in local ignored configuration; tracked files deliberately have no partner host defaults. The API and cards API base URLs are configured separately; a base path such as `/api` is allowed. Refer to the privately supplied partner configuration for their values. Only HTTPS URLs without credentials, query parameters or fragments are accepted. Missing or invalid API URLs leave Engine startup available but the corresponding reads/commands fail with `CONFIGURATION_ERROR` before HTTP; no other environment is used as a fallback. The website URL is optional independently, and no marketplace link is offered when it is absent. Development defaults to devnet; explicit invalid environments fail rather than falling back to mainnet. Keys are optional and never shared across environments. Stored provider state is isolated per environment; legacy unlabelled state is treated as mainnet. Wallet reset clears all environment archives.

USDC balances use `AssetsController` on mainnet. Only devnet calls the existing MetaMask Assets API client through [`readDevnetUsdcBalance`](providers/pack-partner/services/devnetBalance.ts), reusing `useUsdcBalance`'s query and refresh. The mint is `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`, the USDC-Dev identified by the partner's test-funds reference (source shared privately), with six decimals. Live checks on 2026-11-12 found that Accounts API v6 returns devnet balances but labels their `assetId` with a mainnet prefix, while `/v2/supportedNetworks` omits devnet and prevents `AssetsController` from routing the read. The helper verifies the requested devnet account and exact mint, accepts either asset prefix locally, and converts the decimal amount to base units without `Number`. It never writes those assets into the shared controller state. Failed or unprocessed reads remain errors, not zero balances. This narrow devnet workaround uses no balance method in the Snap or CollectiblesController; mainnet retains the standard controller path. Revisit it when the Accounts API advertises devnet and returns its correct asset identifiers.

The version-gated remote flag `collectiblesEnabled` controls visibility. A valid remote value wins. When missing/invalid, development can fall back to `MM_COLLECTIBLES_ENABLED`; release builds cannot. The existing `OVERRIDE_REMOTE_FEATURE_FLAGS` option also applies.

The wallet's general navigation flags remain owned by the wallet. Collectibles does not add a second tab bar or require a glass-menu flag.

## Screens

Collectibles follows the reviewed Replit home-entry design (`91a2d0c9`): the home carousel is followed by three shortcuts, Packs, Collection and Market. Each shortcut pushes a native stack entry. There is no Collectibles bottom navigation. Back pops the actual previous screen: direct wallet-to-pack/card entries return to the wallet, including after first-visit onboarding, while a subsection opened from Collectibles returns to its hub. A devnet-only header button opens development tools. Wallet pack previews open detail; the separate Open action opens purchase review.

- **Popular:** Replit pack wheel, public Just Opened, Greatest Hits, friends and rankings. Each section reads its owning data service.
- **Packs:** virtualized two-column catalogue, search, category, price filtering and sorting; a full tile opens its detail.
- **Pack detail:** real odds and cursor-paginated inventory, Just Opened, batched insights and social previews, related packs and purchase review. Pull-to-refresh reloads both the inventory and the public opening snapshot.
- **Collection:** real holdings and total insured value, search/filter/sort and buyback availability. Sales history and Pokédex use Collectibles API. No historical chart or invented profit/loss.
- **Market:** Replit's two-scene marketplace teaser, with an explicit action opening PackPartner's marketplace in the MetaMask browser. The animated sale is an illustration and does not sell an owned card.
- **Explore:** history with cursor pagination, nine Pokédex generations, four leaderboard metrics, feed, comments, profiles and merged profile Pokédex.
- **Card/result:** interactive front/back scans, card information, reviewed sale, sold state, replay and sharing. Shipping/redemption remains a provider Marketplace link.

Card titles prefer metadata Set and fall back to the API name when absent. Live provider codes, prices, probabilities and purchase data are not replaced by presentation assets or mock statistics.

Greatest Hits currently means the highest insured values in the current public pack pools. It does **not** claim to be the largest pulls over seven days: that historical ranking requires indexed data. Each refresh reads bounded pool snapshots with concurrency three and retains twenty unique cards.

Public openings use the DataService's REST snapshots, with a bounded queue in `usePackPartnerOpenings`. The first snapshot is immediate; later wins are inserted one at a time. Default list/queue size is 20 and default poll/insert intervals are 1000 ms; each view can override those options. Scrolling away from the start pauses insertions but keeps polling; returning resumes without a burst. Focus, section visibility, app foreground and network availability control polling. These discovery rows are not historical pagination screens. See the [recent openings specification](services/data/recent-openings.md).

## Purchase and payment

The review sheet has one Buy button, a quantity capped by `MAX_MULTIPACK_COUNT = 5` and an independent Turbo switch. It authorizes the exact displayed total. The review is bound to the selected account at the time it opens; changing account closes it on every entry surface. A new account must start a new review rather than inherit the previous account’s intent. The alternate-token selector is disabled until MetaMask Pay supports this Solana USDC destination. An insufficient USDC balance disables buying; selecting a different token or automatically funding and buying is unavailable in this flow. The former QuickBuy hook, sheets and background callbacks are removed, including their unused extensions to the shared QuickBuy module. Collectibles does not modify QuickBuy; alternate-token funding is deferred until MetaMask Pay supports Solana. The old balance/add-funds header is removed. The Dev faucet opens in the MetaMask browser and never initiates a purchase.

Following the reviewed partner API contract (source shared privately), one pack uses `/generatePack`; a multipack uses `/generateYoloPacks`. The provider retains `yoloId` as `batchId`, ordered `batchMemos`, individual memos, payment status and results. A single-pack batch uses its memo as its ID. Opening results retain `batchId` while their operation journal entry exists. Durable historical batch linkage belongs to Collectibles API; dismissing an operation removes its local result.

Each transaction is independently validated/signed by the internal Snap and submitted through `/submitTransaction`; the documented API has no bulk submission endpoint. Four payment workers run concurrently. Four separate opening lanes open paid/submitted packs without holding the next payment behind a webhook or reveal. Submissions that are still pending are reconciled by the existing opening/status flow. A rejected signature stops new signing work; payments already started still settle. All started work is awaited before reporting a partial failure. Concurrent completion/recovery shares the same payment and opening promises.

The unsigned-transaction freshness limit still applies; it is not a guarantee against blockhash expiry. We do not rewrite PackPartner's signed transaction or automatically charge for a replacement. Before broadcasting, the workflow records the submission attempt in controller state. The standard Engine persistence subscription saves that state asynchronously. Recovery uses saved memos rather than signing a replacement; signed and unsigned transaction bytes are never persisted. Native process termination suspends work until recovery runs after unlock. The exact behavior and limits belong to [recovery and persistence](services/data/recovery-persistence.md).

Reveals start after processing, and never trigger an opening or Turbo sale. Closing a reveal preserves unfinished presentation progress (`revealed`, `revealCompleted`). Closing the final summary dismisses completed operations. Turbo sale completion is shown only with a Common result and a verified payout amount, including status recovery. `TURBO_MODE_BUYBACK` alone is insufficient, because re-opened non-Common Turbo packs also return that code.

Results use virtualized rows, keep sold cards as the operations' results, show statistics, and offer a reviewed buy-again sheet. Manual sales require confirmation of the selected mint/amount pairs. They are separate transactions, not an atomic bulk sale: a failure stops later sales while completed cards remain sold. Sharing opens a review composer. The sharing hook sends a command to the Social API DataService after explicit confirmation. While publication is pending, both the close button and the native modal back action are blocked so the same in-flight review cannot be reopened as a new draft. A retry keeps its original draft ID. The comment editor is disabled while sending to avoid erasing text entered after the submitted comment.

## Artwork and animation source

`constants/packArtwork.ts` contains one explicit map from `provider:pack-code` to display name and bundled illustration, for example `pack_partner:pokemon_50` → `Pokémon Charged Pack`. All screens and search use that same map. Names and illustrations do not depend on the live price or on a catalogue snapshot. Unknown packs keep their API name and use the current Core illustration as a fallback. The map only decorates packs returned by the provider; it does not add saleable products or override their price, odds or availability.

`assets/named-packs` contains exact Replit WebP exports. Pack images preserve the complete artwork, including transparent margins, using containment in a stable frame. There is no generated crop table or automatic pixel-boundary correction; designers can replace these files when new artwork is ready. `NativePackFoil` and the motion renderer follow the same containment rule. The reviewed Replit 12-second continuous pack float and orientation-driven foil lighting are reused; artwork sampling for lighting never crops or reshapes the image.

`components/CollectiblesDiscovery/PackGalaxy.tsx` owns the transparent hero halo copied from Replit's `PackGalaxy` subtle variant: center 50%/36%, radii 65%/48%, 16% opacity and a fade to transparency at 85%. The existing artwork registry stores the dominant hue sampled with Replit's 48px palette algorithm; unknown packs use the theme accent. No runtime sampling, video, blur or WebView is needed. The halo stays inside the scrolling hero, with no solid rectangle or page-fixed overlay. Category grouping and numbered price badges remain small helpers in `utils/packClassification.ts`; they do not select names or artwork.

Onboarding uses the bundled Replit MP4s and posters. Card detail and reveal use `CollectiblesMotion`: an isolated WebView containing bundled copies of Replit's React, Framer Motion, JavaScript and CSS. The previous native card/reveal animations are removed. The presentation bridge accepts public artwork/card metadata, translated copy, theme/motion flags, measured artwork coordinates and already-confirmed insured totals for NumberFlow. It emits validated readiness/reveal/completion, per-card landing and pack-pose notifications; it has no wallet access and cannot execute transactions. There are no remote scripts, frames or API requests in the scene; only card image loading is allowed.

Replit remains the source of truth for animation changes. The repository contains `collectiblesMotion.generated.ts`, including its bundled license notices. The recent reveal/card-effect import has been reverted: there is no CanvasKit payload or Skia dependency in Mobile. The previous reviewed reveal remains in place until the separate reveal Replit is supplied. The latest pack float CSS is retained independently. One-time extraction and generation tools are local-only and are not required to build or run Mobile. Future animation updates must be reimported from the appropriate reviewed source; do not invent a second animation timeline in the native component.

Home and pack detail share a native gesture adapter so list items do not each allocate a WebView. A horizontal pan blocks the owning list's native scroll gesture until release or cancellation. A vertical intent fails the horizontal recognizer before activation and allows page scrolling. Gesture ownership stays native rather than toggling the parent's `scrollEnabled` after JavaScript detects a drag. `ReplitPackWheel.motion.ts` keeps the original Replit geometry, spring and velocity projection with parity tests. The continuous 12-second floating orbit stays in the copied CSS scene. Sheets retain platform behavior. Shared tiles use design-system surfaces, compact grading tags and labels below the artwork. Purchase review follows the amount-first Replit layout while retaining the five-pack cap and unavailable cross-token payment state.

## Capability and media policy

Follow the shared [device-capability UX matrix](../../../util/deviceCapability/README.md); hardware and transport remain separate inputs. The upstream rules were checked at `origin/main` commit `82149847e1ad74c3ebe731581ae8f89cb550d3bb`: [AGENTS.md, line 124](https://github.com/MetaMask/metamask-mobile/blob/82149847e1ad74c3ebe731581ae8f89cb550d3bb/AGENTS.md#L124) and [device-capability.mdc](https://github.com/MetaMask/metamask-mobile/blob/82149847e1ad74c3ebe731581ae8f89cb550d3bb/.cursor/rules/device-capability.mdc).

- **MetaMask rule — unknown uses the product default.** A `null` network tier keeps the default presentation budget, including on LOW hardware. `useCollectiblesPresentation` therefore applies the reduced budget only for `hardware === 'LOW' && network !== null`, matching [PredictNext's EventMarketList](https://github.com/MetaMask/metamask-mobile/blob/82149847e1ad74c3ebe731581ae8f89cb550d3bb/app/components/UI/PredictNext/views/PredictEvent/internal/EventMarketList.tsx#L296). Unknown is neither LOW nor known offline (`NONE`); it must not disable content while classification resolves.
- **Collectibles product decision — keep the whole Popular carousel.** Every pack supplied to the carousel remains reachable at every tier. A tier change alone must not trim that list or reset the selected pack. Rendering windows, prefetch and decorative work are separate budgets; reducing them does not reduce the product catalogue.
- **Collectibles product decision — onboarding is bundled video.** Playback is independent of hardware/network tiers and the generic `animate` flag: this local authored content needs no download. Route focus and AppState control pausing; Reduce Motion and playback errors retain the poster fallback. This does not exempt remote reads or other animated scenes from their own capability policy.

These are policy and behavior corrections, not measured performance gains. Follow [mms-performance](../../../../.agents/skills/mms-performance/SKILL.md): measure the target interaction, change it, then repeat the measurement before claiming an improvement. Native WebView rendering, video playback and gestures still require device validation beyond Jest.

Regression entrypoints: [useCollectiblesPresentation.test.ts](hooks/useCollectiblesPresentation.test.ts) for unknown tiers and defaults, [OverviewTab.view.test.tsx](views/CollectiblesHome/OverviewTab.view.test.tsx) for the complete pack list and selection across network changes, and [CollectiblesOnboardingVideo.test.tsx](views/CollectiblesOnboarding/CollectiblesOnboardingVideo.test.tsx) for offline/LOW playback, lifecycle and poster fallback. These tests verify behavior, not native performance.

## Persistence and prototype limits

The controller persists the operation references and receipts needed for recovery, not server ownership or offer caches. Metadata filtering feeds the standard `EngineService` subscription, which debounces writes for 200 ms and saves through `ControllerStorage` to native storage. An abrupt crash can lose the latest unflushed update; recovery only uses references present in saved state and never signs or submits again. A lost HTTP response or an HTTP 4xx alone does not prove that a submission never happened. The [recovery and persistence contract](services/data/recovery-persistence.md) is authoritative for retention, restoration, reset and these limits.

Signing uses the local Solana Snap dependency in `../internal-snaps` on the `0xEdouardEth/pack-partner-guarded-signing` branch. Its package README owns the signing contract and guard invariants. Mobile confirms the intent and supplies the selected account, explicit network scope, exact USDC base units and, for buyback, asset ID/standard. The Snap verifies the provider presignature, transaction and simulated effects, then returns signed bytes without submitting them. Mobile distinguishes an absent client method (`SNAP_UNSUPPORTED`) from an unsupported NFT/network or another guard rejection (`SIGNING_REJECTED`), and never falls back to another signer. This dependency still needs Solana-team review and a published portable release before production. The two unavailable backend clients are temporary static implementations of proposed contracts; their presence does not establish a deployed integration.

For compressed cards, Mobile preserves PackPartner's explicit `cnft-core` standard from `/openPack.nft.nft_standard` or `/cards.nftStandard`, together with the asset ID. The buyback forwards that same ID, the fresh refund in USDC base units and the selected environment's Solana scope to the Snap. Ambiguous labels such as `cnft`, `compressed` or `CompressedCoreAsset` remain `unknown`; neither the UI nor provider guesses an on-chain format. A Snap rejection removes the unsigned pending sale and never calls `/submitTransaction`.

The companion Snap's `cnft-core` implementation is limited to the ordinary, two-signature Bubblegum V2 `TransferV2` buyback, matching the partner's reviewed supported-standard mapping (source shared privately). Mainnet and devnet use the same signer/validators with network-specific payment authorities, USDC mint and NFT profiles selected inside the Snap. That format is configured on both networks. Devnet has no Core, pNFT or classic NFT profile yet; those buybacks fail closed until their own cluster-specific fixtures and anchors are reviewed. Asset derivation, user ownership/authority, the provider presignature and transaction proof validation remain in the Snap; Mobile adds no DAS client or alternate signer.

Mobile integration tests mock Snap execution and prove the intent reaches it unchanged and rejection stops submission. Snap regressions additionally replay the recorded ordinary [devnet cNFT buyback](https://explorer.solana.com/tx/GWqYLJgJxmhK9jb1zKm9wSKp4sSLv25UK5u1QxxVfy33CmFjSfzmoeWzvXdf66igfMMAjNzWkno5bUdhTewk1wG?cluster=devnet), alongside synthetic adversarial cases. Historical transaction replay establishes compatibility with that observed format; it does not mean a live purchase or sale was performed during validation, and it does not replace Solana-team review.

## Validation

Use Yarn and select the existing suite for the boundary being changed. Representative focused entrypoints:

```sh
yarn jest app/components/UI/Collectibles/constants/packArtwork.test.ts --runInBand --coverage=false --watchman=false
yarn jest -c jest.config.view.js app/components/UI/Collectibles/views/CollectiblesPack/CollectiblesPublicCard.view.test.tsx --runInBand --coverage=false --watchman=false
yarn jest -c jest.config.integration.js app/components/UI/Collectibles/controllers/CollectiblesController.integration.test.ts --runInBand --coverage=false --watchman=false
yarn jest -c jest.config.integration.js app/components/UI/Collectibles/services/data/ --runInBand --coverage=false --watchman=false
yarn lint:tsc
```

Use `tests/component-view/renderers/collectibles.tsx` for screens and `tests/integration/harnesses/collectibles-discovery/` for the data-service/messenger boundary. [Core business rules](../../../../docs/collectibles/pack-partner-business-rules.md) maps other behaviors to their suites; the repository [testing index](../../../../tests/AGENTS.md) owns test conventions. Broaden to the feature suites when affected boundaries justify it, rather than copying historical pass counts into a new review.

Core integration tests mock network, signing and broadcasting. No real purchase or sale is necessary. View tests cover selection, disabled payment, navigation and subscription cleanup. Motion tests cover the bridge and source contract, not native GPU output. Native storage termination, WebView rendering, videos and gestures need separately reported device evidence when their guarantees are being assessed.

The Dev header button is available only when `MM_COLLECTIBLES_ENVIRONMENT=devnet` (including the development default), and is hidden on mainnet. It keeps Reset onboarding and provides the selected account's Solana address to copy and a button to open the USDC-Dev faucet from the partner's test-funds reference (source shared privately) inside MetaMask's in-app browser. Opening the site does not request tokens or sign a transaction. Fake reveal previews have been removed; replaying an actual collected card remains available. A real-account simulator must not be used to sign, buy, sell or swap without the account owner's explicit agreement.

### Design refresh verification

The reference is the rendered source, especially `TradeCollectiblesTop`, `HomePackSpinner`, `PopularPackCard`, `CollectionCard`, `PackQuickBuySheet`, `InteractiveCardSlab` and the reveal scene. Older Replit design notes may still describe the removed bottom menu. Intentional product differences remain: metadata Set titles with API-name fallback, stable tile geometry, no Collection PnL/chart, real provider availability and amounts, and a maximum of five packs.

Test layer placement: existing component-view journeys cover shortcut navigation, direct wallet entry/back, onboarding continuation, filters, loading and preserved carousel selection. Pure wheel math and narrow component contracts remain unit tests. These checks do not establish pixel parity or native WebView/GPU behavior; device validation is still required for that boundary.
