# Reusable Social Feed

Plan for making the Social V1 feed a drop-in component that other surfaces (Perps market details, Token details, trader profiles) can render for a single token, perp market or trader, without fetching or shaping any data themselves.

Work lands in the PR stages below. Tick items off as they merge.

## Goals

- A host page renders a filtered feed with one line and no data plumbing:

  ```tsx
  <SocialFeed source={{ kind: 'perp', symbol: market.symbol }} location="perps_market_details" />
  <SocialFeed source={{ kind: 'token', assetId }} location="token_details" />
  <SocialFeed source={{ kind: 'trader', addressOrId: profileId }} location="trader_profile" />
  ```

- One data layer for every feed variant, instead of one hand-written infinite query per surface.
- Social V1 (Trending / Following / My profile) keeps working and keeps its dev affordances.

## Decisions

| Topic                                                       | Decision                                                                                                                                                                         |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component input                                             | A single `source` prop typed as a discriminated union (see below), not `type` + `address`.                                                                                       |
| Mocked enrichment (`*` values, verified badge, copy counts) | Hidden on host pages: those fields render only when a real value exists (null/undefined check). Social V1 keeps showing the mocked values so devs can see what is still missing. |
| Perp markets listed on several HIP-3 DEXs                   | Fetch the related markets too (`xyz:NVDA` also shows `cash:NVDA`, …).                                                                                                            |
| Empty feed on a host page                                   | Show a "No trades yet" message.                                                                                                                                                  |
| Posts from the composer                                     | Only prepended to Trending. Filtered feeds show server data only.                                                                                                                |
| Analytics                                                   | `<SocialFeed>` takes a `location` prop that is attached to every feed event.                                                                                                     |
| Host page layout                                            | Preview (a few posts plus "See all"). Host pages already own a scroll container; the full infinite list lives on a dedicated screen.                                             |
| Native assets (ETH, SOL) on Token details                   | The global feed filtered to the asset's chain (`/feed?scope=leaderboard&chains=<CAIP-2>`), read from the CAIP-19 asset id.                                                       |
| Perp sources built from feed rows                           | Keyed on `tokenSymbol` (the raw market id), because global-feed perp rows can have an empty `tokenAddress`.                                                                      |

## API facts the design relies on

All three routes return the same `FeedResponse` / `FeedItem` shape, so one mapper serves every source.

| Source          | Route                                                                                                | Auth                                       |
| --------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| All traders     | `GET /v1/feed?scope=leaderboard\|following&chains=…`                                                 | Required                                   |
| One token       | `GET /v1/tokens/:chain/:contractAddress/feed`                                                        | Public (JWT still sent for `userReaction`) |
| One perp market | Same token route with `chain = hyperliquid`, `contractAddress = <market symbol>` (`BTC`, `xyz:NVDA`) | Public                                     |
| One trader      | `GET /v1/traders/:addressOrId/feed`                                                                  | Public                                     |

Identifier matching on the token route is exact-string, and a mismatch returns an empty page rather than an error:

- EVM contract: must be lowercase. A checksummed address returns 0 items.
- Solana mint: must keep its exact case. A lower-cased mint returns 0 items.
- Perp symbol: exact case (`BTC` works, `btc` returns 0 items).
- Trader route: case-insensitive, and accepts either the wallet address or the profile id.
- Token route chains are limited to `TokenFeedChain`: `base`, `bsc`, `ethereum`, `hyperliquid`, `robinhood`, `solana`.

Items carry their whole fill history, so pages are heavy (BTC: ~18 KB at `limit=3`, ~129 KB at `limit=30`). Previews must request a small page.

There is no "all DEXs" perp query: `xyz:NVDA` and `cash:NVDA` are separate feeds, and a bare `NVDA` returns nothing.

## Target API

```ts
export type SocialFeedSource =
  | { kind: 'all'; audience: 'all' | 'following' }
  | { kind: 'token'; assetId: CaipAssetType }
  | { kind: 'perp'; symbol: string }
  | { kind: 'trader'; addressOrId: string; commentedOnly?: boolean };
```

- `token` takes a CAIP-19 asset id because Token details already has one, and it carries chain, address and the Solana form in one value. A native asset (`slip44`) resolves to the global feed filtered to its chain; unsupported chains have no feed.
- `perp` is separate from `token` for caller ergonomics (the Perps page has a symbol, not a chain); internally it becomes a token-route request on `hyperliquid`.
- The union is plain JSON, so it doubles as a navigation param for the "See all" screen.

Layers, top to bottom:

1. `<SocialFeed source location maxItems />` — the drop-in. No scroll container; self-gates on the feature flag; shows skeleton, error/retry, "No trades yet", then posts and "See all".
2. `SocialFeedScreen` — route that takes `{ source, location }` and renders the full infinite list with pull-to-refresh.
3. `SocialFeedPostList` / `SocialFeedPostShell` — presentational cards.
4. `useSocialFeed(source, options)` — data hook: posts plus pagination state.
5. `toSocialFeedRequest(source)` / `socialFeedQueries` — identifier normalisation, query keys, fetchers.

## PR stages

### PR 1 — Shared data layer

No UI change. Lands in `app/components/Views/SocialLeaderboard/SocialFeed/`; PR 2 moves the folder to `app/components/UI/SocialFeed/` together with the mappers it depends on.

- [x] `SocialFeedSource` type and `toSocialFeedRequest(source)` with the identifier rules above (CAIP-19 parsing, EVM lowercase, Solana/perp exact, native asset → chain-filtered global feed, unsupported chain → `null`).
- [x] `socialFeedQueries`: one query-key rule (`[messengerAction, { ...requestOptions, limit }]`) and one typed fetcher per messenger action.
- [x] `useSocialFeed(source | null, { enabled, pageSize })` returning `{ posts, rows, isLoading, isFetchingNextPage, hasNextPage, loadMore, error, refresh, dataUpdatedAt }`, with the unlock gate, no focus/reconnect refetch, refresh-to-first-page and Sentry telemetry in one place.
- [x] `socialFeedSourceFromAsset({ chain, tokenAddress, tokenSymbol })` so any feed row or hot-token chip can build its own source (perps key on `tokenSymbol`).
- [x] Rebuild `useSocialV1TokenFeed` and `useMyProfilePosts` on `useSocialFeed` (public signatures unchanged); remove the per-surface query helpers they replaced.
- [x] `patchFeedCommentEngagementInCache` patches every feed cache (global, token, trader). It used to skip token-feed caches, so a reaction made in a token-filtered view went stale.
- [x] Global feed key includes the page size so it stays shared between V0, V1 and `useSocialFeed`.
- Trending / Following stay on `useTraderFeed` until PR 4 rewrites that page.

### PR 2 — Move the feed into a shared module

Mostly file moves; no behaviour change. The move is its own commit so it can be reviewed separately from the new components.

- [x] Create `app/components/UI/SocialFeed/` with a public `index.ts`. Perps and Token details live under `app/components/UI/`, and ADR 0020 keeps routes from reaching into each other's internals. The module imports nothing from `app/components/Views/`.
- [x] Move the data layer, `mapFeedItem`, `toSocialV1FeedItem`, `wrapLiveFeedPosts` (renamed to `toSocialFeedPosts`; it is the production mapper, not a mock), reactions, the card components, the moderation sheet, `PositionTokenAvatar`, and their test fixtures.
- [x] Move the shared social helpers the cards need (`formatters`, `chainMapping`, `perp`, `tradeAction`, `tradeTimestamp`, `klipyGifComment`) to `UI/SocialFeed/utils/`. They stay under `components/` rather than `app/util/` because `formatters` and `PositionTokenAvatar` depend on Perps and Bridge UI code.
- [x] Move symbols the feed needed from route files into the module: `TraderFeedRow` and the mapped `FeedItem` types (`types.ts`), `FEED_PAGE_LIMIT` and `toFeedScope` (`data/`), and the trader-cohort constants (`utils/traderStats.ts`). Social V1 page-only types stay in `SocialV1View/feed/types.ts`.
- [x] Move `TraderAvatar` out of `Views/Homepage`. Fourteen route-isolation suppressions that only covered these imports are gone.
- [x] Extract `SocialFeedSkeleton`, `SocialFeedError` and a new `SocialFeedEmpty` ("No trades yet") from `EmptyShellTabPage`.
- [x] Make `SocialEntryOptionsProvider` nest-safe (reuse an outer provider if one exists) so every feed gets working Hide / Block / Report.

### PR 3 — Surface context: mocked fields and analytics location

- [ ] `SocialFeedSurfaceProvider` with `{ location, showMockedFields }`, mounted by `<SocialFeed>` and by the Social V1 pages.
- [ ] `showMockedFields: false` → `toSocialV1FeedItem` leaves mark price and auto-close `undefined`; the shell drops the verified badge, `*` marker and copy count; `PositionCardStats` drops rows whose value is missing instead of rendering an em dash.
- [ ] `showMockedFields: true` on Social V1 (current behaviour).
- [ ] `location` added as a property on feed events (reactions, options menu, copy trade, "See all", feed viewed). Values: `social_trending`, `social_following`, `my_profile`, `trader_profile`, `token_details`, `perps_market_details`, `social_feed_screen`.

### PR 4 — `<SocialFeed>` drop-in and "See all" screen

- [ ] `<SocialFeed source location maxItems title />` (preview; requests `pageSize = maxItems`).
- [ ] `SocialFeedScreen` route with `{ source, location }` params; FlashList + `onEndReached` + pull-to-refresh.
- [ ] Rewrite `EmptyShellTabPage` as a composition on `useSocialFeed`: the selected hot-token chip becomes a `source`, and `HotTokensCarousel` becomes selection-only (drops `onTokenFeedChange` and the page's manual state syncing).
- [ ] Perp chips use the server feed through the `perp` source, instead of filtering loaded posts on the client. Chips need the row's `tokenSymbol` passed through to `socialFeedSourceFromAsset`.
- [ ] Move `useSocialV1Feed` onto `useSocialFeed({ kind: 'all' })`; composed posts stay a Trending-only layer.

### PR 5 — Related perp markets

- [ ] Resolve the related symbols for a perp market (`xyz:NVDA` → `xyz:NVDA`, `cash:NVDA`, …).
- [ ] Composite infinite query: page param is a cursor per member feed; each page fetches the members that still have a cursor, merges and sorts by timestamp.
- [ ] Open decision — where the DEX list comes from. Options, in order of preference:
  1. A social-api change that accepts a base symbol and returns every DEX (one request per page; ask the social-api team).
  2. Hyperliquid `perpDexs`, narrowed to the DEXs that list the asset, cached.
  3. A hardcoded list.

  `PerpsController:getAvailableDexs` is filtered by feature flags, so it does not include DEXs we do not trade on (e.g. `cash`).

### PR 6 — Host integrations

- [ ] Perps market details: `<SocialFeed source={{ kind: 'perp', symbol }} location="perps_market_details" />`, behind the social and perps feature flags.
- [ ] Token details: `<SocialFeed source={{ kind: 'token', assetId }} location="token_details" />`, behind the social feature flag. Native assets show their chain's feed; unsupported chains show nothing. The section title for a native asset should read as the chain's activity, since posts are not specific to ETH or SOL.
- [ ] Trader profile: `<SocialFeed source={{ kind: 'trader', addressOrId }} location="trader_profile" />`.
- [ ] Component view tests on each host covering loading, empty, error and populated states.

## Open questions

- Related perp markets: where the HIP-3 DEX list comes from (see PR 5).
