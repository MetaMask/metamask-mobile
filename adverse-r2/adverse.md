# Adversarial Code Review

**Verdict:** SHIP-WITH-CAVEATS (3/3 ship, 0/3 block)  
**Findings:** 0 critical · 4 warning · 10 info (14 total across 3 reviewers)

## Reviewer verdicts

| Reviewer | Verdict | Summary |
|---|---|---|
| auditor | conditional | Core logic verified sound (URL builder mirrors controller, pill state machine stable, live API endpoints checked, all 72 tests pass); one real defect: the error-logging effect re-fires on every render. |
| adversary | approve | No exploitable issues in my lane: URL inputs are type-constrained or percent-encoded, no auth/secret/log-exposure surface, bounded request fan-out; two latent hardening notes only. |
| pragmatist | conditional | Round-1 fixes landed well, but the error log drops root causes, the URL builder forks core's helper, and tokens-section visibility left the tab causing divider artifacts. |

## Consensus findings (reported by one, validated by another)

### 🟡 **[WARNING]** Error log discards the real failure and re-fires on unrelated changes — `app/components/Views/TrendingView/feeds/tokens/useCryptoPillFeed.ts:207`

_Reported by: pragmatist_

The combine callback (lines 146-160) maps each query to {data, isLoading, isError} and drops query.error, so the logging effect at 202-213 can only log new Error(erroredKeys.join(', ')) — a synthetic error whose message is a pill-key list and whose stack points at the effect itself. The actual root cause (HTTP status, network message, 'response was not an array') never reaches the log, so during a token-API incident oncall learns which pills failed but not why. Worse, the effect deps include tokenPillResults, whose identity changes whenever any pill's query state changes (TanStack only stabilizes it via replaceEqualDeep when deep-equal), so while one pill stays errored every unrelated state change — prefetch resolutions, pull-to-refresh transitions — re-logs the same keys. Note the Logger mock at useCryptoPillFeed.test.tsx:33 is set up but never asserted, so deleting this effect entirely would not fail a single test.

**Fix:** Carry the error through: add error to CryptoPillFeedResult populated from query.error in the combine, and log that per pill (message + underlying error). Dedupe with a ref of already-logged keys so a persisting failure logs once per instance, and add the missing test asserting Logger.error fires (ideally with the real error) when a pill query rejects.

> ✅ **auditor validates:** Verified: the combine maps only data/isLoading/isError, so query.error never reaches the effect and the log can only carry the synthetic key-list Error whose stack points at the effect. On the re-fire mechanism I checked the installed @tanstack/react-query 5.103.2 source: QueriesObserver#combineResult wraps the inlined combine's output in replaceEqualDeep, so tokenPillResults keeps identity while deep-equal and changes whenever any pill's data/isLoading/isError actually changes — which still re-logs the same errored keys on each sibling resolution during prefetch and on every data change through pull-to-refresh. The Logger mock is indeed never asserted, so deleting the effect would fail no test.
> ✅ **adversary validates:** Confirmed: the combine maps each query to {data, isLoading, isError} and drops query.error, so the log structurally cannot carry the root cause, and the re-fire mechanism is real (in fact understated — with an inlined combine it is every render, not just on unrelated state changes). Their supporting claim also checks out: the Logger mock in useCryptoPillFeed.test.tsx is never asserted, so the effect has zero test protection.

### 🟡 **[WARNING]** Pill-error Logger fires on every render — `app/components/Views/TrendingView/feeds/tokens/useCryptoPillFeed.ts:202`

_Reported by: auditor_

The error-logging useEffect depends on tokenPillResults, but `combine` is inlined in the useQueries options (line 146), and TanStack v5 recomputes an inline combine on every render (its own docs: 'An inlined combine function... runs on every render'), giving tokenPillResults a fresh object identity each render. The effect therefore runs after every render, and while ANY pill query is errored it re-emits Logger.error(new Error(...), 'ExploreCryptoPillFeed: pill query failed') — on every pill tap, pull-to-refresh, or sibling-feed-driven re-render. This fires in normal use: a single failed pill query (e.g. the eip155:4663 trending request) produces unbounded duplicate synthetic errors in production logs. The UI results themselves stay correct; the damage is repeated error reporting.

**Fix:** Keep a ref of previously logged errored keys and only log keys that newly transitioned to isError (optionally also hoist `combine` to module scope so it only recomputes when query results actually change).

> ✅ **adversary validates:** I verified the mechanism in the diff: `combine` is inlined in the useQueries options, and TanStack v5 recomputes an inlined combine on every render, so `tokenPillResults` gets fresh identity each render and the effect at ~202 re-runs whenever the host renders while any pill is errored. From my lane this is worse than noisy logs: a persistent token-API failure (which an on-path or upstream actor can cause) converts every render — each of the 6 prefetch resolutions, every pill tap, every refresh trigger — into a freshly captured synthetic Error event, i.e. unbounded telemetry emission that can crowd out real signal.
> ✅ **pragmatist validates:** The defect is real and matches what I found independently: while any pill stays errored, sibling state changes re-emit the same synthetic Logger.error, and the underlying cause never reaches the log. One mechanism correction: TanStack v5.103's QueriesObserver#combineResult wraps the combined value in replaceEqualDeep, so an inline combine re-runs each render but the returned reference is preserved when deep-equal — the effect does NOT re-fire on a pure re-render or pill tap. It re-fires whenever any sibling pill's entry deep-changes (the prefetch-resolution cascade, refresh transitions, watchlist data updates), which still yields repeated synthetic errors in production logs.

### 🟡 **[WARNING]** Tokens section visibility moved into the child, breaking the tab's divider contract — `app/components/Views/TrendingView/tabs/CryptoTab.tsx:154`

_Reported by: pragmatist_

ExploreSectionList's own docstring says 'The tab owns section order and visibility; sections render content only', and every other section still honors it (showCryptoPerps/showPredictions gate with isLoading || data.length > 0 in the tab). The tokens section is now pushed unconditionally and CryptoTokensPillBlock returns null (line 142) when every pill is errored or below minItems. When that fires — a token-API outage with the watchlist flag off, which is the current default rollout state — ExploreSectionList still renders the empty explore-section-tokens Box and the divider before the next section, so the user sees a skeleton flash and then a floating SectionDivider above the first visible content. The pre-change code gated with showTokens and omitted the section entirely, so this is a regression in exactly the incident path the hiding logic was built for.

**Fix:** Have useCryptoPillFeed expose a visibility signal (e.g. hasVisiblePill — it already computes everything needed) and gate the tokens push in the tab the same way perps and predictions are gated; keep the child's null return as a defensive fallback rather than the mechanism.

> ✅ **auditor validates:** Verified in ExploreSectionList source: dividers render for index > 0 purely from the sections array, the explore-section-tokens wrapper Box always renders, and the docstring does say 'The tab owns section order and visibility; sections render content only' — every other section still honors it. When all pills resolve empty or errored the block returns null, leaving a zero-height section plus a floating divider above the first visible section where the old showTokens gate omitted the item entirely; the new CryptoTab test itself asserts the wrapper survives null content (mocked block returns null, explore-section-tokens still on screen).
> ✅ **adversary validates:** The diff itself proves the regression: CryptoTab.test mocks CryptoTokensPillBlock to return null and still asserts `explore-section-tokens` is on the screen, so the section wrapper persists when the block renders nothing — the old showTokens gate omitted the section entirely. Real regression in exactly the token-API-outage path; I'd note the user-visible impact is cosmetic-to-moderate even though the contract break is genuine.

### 🟡 **[WARNING]** URL builder forks core's getTrendingTokensURL verbatim — `app/components/Views/TrendingView/feeds/tokens/cryptoPillApi.ts:42`

_Reported by: pragmatist_

buildCryptoPillTokensUrl copies the algorithm from @metamask/assets-controllers' token-service line-for-line — encodeURIComponent(...).join(',') chainIds, URLSearchParams for the remaining params, excludeLabels special-cased to keep commas literal, identical final template concatenation — from the very package this file imports TrendingAsset from. Two implementations now own one API contract: when the contract changes (encoding convention, required param), core's getTrendingTokens gets patched and the Homepage trending feed inherits the fix on the next package bump, while the Explore pills keep the stale fork — same endpoints, divergent requests, and no test or comment ties the copy to its source so drift is undetectable in review.

**Fix:** Extend core's getTrendingTokens with an endpoint/path option (TrendingTokensQueryParams already has a pass-through index signature designed for exactly this) and delete the local builder; short of a core PR, at minimum name the upstream implementation in the docstring and diff against it when the API contract changes.

> ✅ **auditor validates:** The structure is lifted from core and the single-owner concern is real, but 'verbatim' is off in a way that strengthens the finding: core's getTrendingTokensURL special-cases a param named `n` (its comment: 'The API expects: n=stable_coin,blue_chip (not %2C)') and would serialize excludeLabels through URLSearchParams, so the fork already emits different bytes than core for the same options today. Two implementations owning one API contract with a present-day divergence is exactly the drift risk described — see my added finding on the comma encoding.

### 🔵 **[INFO]** API response cast to TrendingAsset[] without per-item validation — `app/components/Views/TrendingView/feeds/tokens/cryptoPillApi.ts:72`

_Reported by: adversary_

fetchCryptoPillTokens only checks Array.isArray and then casts, so element shapes are untrusted. Elements flow into getCaipChainIdFromAssetId(item.assetId) (which splits the assetId) and TokenRowItem rendering; a malformed element from a compromised or misbehaving token API (e.g. missing or non-string assetId) throws during render and takes down the whole Explore tab, and attacker-chosen token names/images can be promoted under trusted pill labels like 'Robinhood'. This mirrors the trust already placed in the pre-existing trending feed, so it is not a regression introduced by this diff, which is why it is info rather than warning.

**Fix:** Add a minimal shape guard in fetchCryptoPillTokens (typeof item.assetId === 'string' && typeof item.symbol === 'string', filtering or throwing otherwise) so a malformed response degrades to an empty/hidden pill instead of a render crash.

> ✅ **auditor validates:** I verified the crash mechanism: TrendingTokenRowItem computes getCaipChainIdFromAssetId(token.assetId) — i.e. assetId.split('/') — inside a render-time useMemo, so a malformed element with a missing or non-string assetId throws while rendering the row, not merely on tap. The pre-existing trending feed places identical trust in the same API (core's getTrendingTokens also casts after only an Array.isArray check), so info rather than warning is correctly calibrated — not a regression.
> ✅ **pragmatist validates:** Verified the crash path is real and does occur during render, not just on tap: TrendingTokenRowItem calls token.assetId.split('/') at render time, and filterLowQualityTokens only checks symbol/name/volume, so an element with a valid symbol but missing assetId survives into the list and throws. A two-field shape guard that degrades to a hidden pill is cheap; info is the right severity given the pre-existing trending feed carries the same trust.

### 🔵 **[INFO]** Empty tokens section leaves stray divider — `app/components/Views/TrendingView/tabs/CryptoTab.tsx:154`

_Reported by: auditor_

The tokens section is now pushed unconditionally; when every pill resolves empty or errored, CryptoTokensPillBlock returns null (line 141), but ExploreSectionList still renders the empty `explore-section-tokens` Box and, because the tokens item occupies index 0, a SectionDivider above the next visible section. The old code omitted the section entirely via the showTokens gate, so on an offline first load (all five queries error, flag off) the Crypto tab now shows a divider line with no content above it whenever another section (e.g. predictions) is visible. Cosmetic only; the block's own 'renders nothing' test checks the block testID, not the section wrapper.

**Fix:** Have CryptoTokensPillBlock lift its empty state (or have CryptoTab gate the push on a returned visibility flag) so the section item is omitted entirely when no pill is visible.

> ✅ **adversary validates:** Same root cause, and the part I can verify from the diff (empty section Box still rendered at index 0 when the block returns null) is proven by the unconditional-push test. The divider detail rests on their shared reading of ExploreSectionList, which is consistent with the section-order tests, so I endorse it.
> ✅ **pragmatist validates:** Verified: ExploreSectionList renders a SectionDivider for every index > 0 unconditionally, whether or not the preceding section produced content, and the tokens item is now always pushed at index 0. This corroborates my round-1 warning-severity finding — it fires precisely in the total token-API failure path (watchlist flag off, the current default rollout state) where the old showTokens gate omitted the section entirely.

### 🔵 **[INFO]** excludeLabels interpolated into URL unencoded — `app/components/Views/TrendingView/feeds/tokens/cryptoPillApi.ts:55`

_Reported by: adversary_

buildCryptoPillTokensUrl joins excludeLabels values into the query string with no per-value encoding, unlike chainIds which are passed through encodeURIComponent. Every current caller passes hardcoded constants ('stable_coin', 'blue_chip') from cryptoPillConfig.ts, so there is no attack today, but the function is exported and its doc comment pins the literal-comma behavior, so a future caller passing dynamic labels (e.g. labels derived from API or user data) would interpolate them into the request URL unencoded.

**Fix:** Use excludeLabels.map((label) => encodeURIComponent(label)).join(','). Underscores are not in encodeURIComponent's escape set, so the produced URLs for the current constants are byte-identical and the pinned tests keep passing.

> ✅ **auditor validates:** Confirmed in cryptoPillApi.ts: chainIds values are individually encodeURIComponent'd (line 51) while excludeLabels values are interpolated raw (line 55), an asymmetry on an exported function whose doc pins the unencoded behavior. Every current value is a hardcoded underscore constant so there is no live impact, and the proposed per-value encoding is byte-identical for those constants, so the fix is test-safe.
> ✅ **pragmatist validates:** The asymmetry inside one exported builder — chainIds get per-value encodeURIComponent, excludeLabels get none — is exactly the kind of internal detail the next caller must know to use the function safely, and the doc comment pins the unencoded behavior. The fix is free: underscore is outside encodeURIComponent's escape set, so encoding 'stable_coin'/'blue_chip' is byte-identical and all pinned tests keep passing.

### 🔵 **[INFO]** See-all destination mismatches active pill — `app/components/Views/TrendingView/feeds/tokens/CryptoTokensPillBlock.tsx:173`

_Reported by: auditor_

onViewAll always navigates to Routes.WALLET.TRENDING_TOKENS_FULL_VIEW regardless of the active pill, while SectionHeader reports section_name from the active pill (e.g. 'tokens_watchlist', verified by the new test). With the watchlist pill active (the default when the flag is on), 'View all' opens the trending tokens list and the see-all analytics event is attributed to the watchlist section; the watchlist pill itself caps at CardList's default max of 3, so there is no path from the pill to the full watchlist. Destination and reported section disagree — needs a product decision (per-pill destination, or hide view-all when the watchlist pill is active).

> ✅ **pragmatist validates:** Verified in the code: onViewAll always navigates to Routes.WALLET.TRENDING_TOKENS_FULL_VIEW while SectionHeader reports the active pill's sectionName, and CardList's DEFAULT_MAX_ITEMS is 3, so with the watchlist pill active (the default when the flag is on) there is no path to a full watchlist from the pill. The see-all analytics event then attributes a trending-list navigation to the watchlist section — a real product/analytics mismatch, correctly filed as info pending a product decision.

### 🔵 **[INFO]** Shared helper lives under one route, forcing a new lint suppression — `app/components/Views/Homepage/Sections/Watchlist/utils/toWatchlistDisplayTokens.ts:1`

_Reported by: pragmatist_

This new helper has two consumers (Homepage watchlist section and the Explore feed) but lives under Homepage/Sections/Watchlist/utils, so useCryptoPillFeed.ts:19 must import it across routes behind an import-x/no-restricted-paths suppression — while the very same file imports watchlist hooks from the route-neutral UI/Assets/watchlist/* with no suppression. The ADR-0020 suppression pattern is endemic in this repo so this matches local practice, but the established shared home (UI/Assets/watchlist/utils, next to addBalanceToTokens and getTokens) was available at zero cost and would have avoided growing the route-isolation backlog with brand-new code; the eventual ADR-0020 cleanup will have to move it anyway.

**Fix:** Move toWatchlistDisplayTokens to app/components/UI/Assets/watchlist/utils and drop the eslint-disable on the Explore-side import.

> ✅ **auditor validates:** Facts check out from the diff and imports: useCryptoPillFeed pulls the helper from the Homepage route behind a fresh import-x/no-restricted-paths suppression, while the same files import watchlist hooks and TOKEN_API_BASE_URL from the route-neutral UI/Assets/watchlist/* with no suppression — the established shared home was available at zero cost. Minor and squarely the author's reuse calibration; worth moving before the ADR-0020 backlog grows with brand-new code.

### 🔵 **[INFO]** tokenDetailsSource constant across all pills — `app/components/Views/TrendingView/feeds/tokens/CryptoTokensPillBlock.tsx:122`

_Reported by: auditor_

TokenRowItem receives TokenDetailsSource.ExploreCryptoTrending for every pill, including the watchlist pill, even though the codebase distinguishes watchlist surfaces (TokenDetailsSource.WatchlistHomepage, ExploreWatchlistFilter) and the interaction analytics correctly vary section_name per pill. Token-details attribution for taps on watchlist/gainers/losers rows all reports 'explore_crypto_trending', so the two analytics dimensions disagree about the same tap.

**Fix:** Derive tokenDetailsSource from the active pill definition (adding an Explore watchlist-pill source value if the taxonomy needs one).

> ✅ **pragmatist validates:** Verified: renderTokenItem hardcodes TokenDetailsSource.ExploreCryptoTrending for all six pills, while the codebase distinguishes WatchlistHomepage and ExploreWatchlistFilter for watchlist surfaces and the interaction analytics correctly vary section_name per pill. Two analytics dimensions reporting different surfaces for the same tap is a real (small) attribution inconsistency.

## Single-reviewer findings (one perspective only)

### 🔵 **[INFO]** excludeLabels commas literal here, %2C-encoded on the pre-existing trending paths — `app/components/Views/TrendingView/feeds/tokens/cryptoPillApi.ts:55`

_Reported by: auditor_

The builder joins excludeLabels with literal commas and its doc comment asserts 'the API expects comma-separated values, not percent-encoded ones', but the only in-repo support for that expectation is core's comment about a different parameter (`n`) in getTrendingTokensURL — core has no excludeLabels special case, so both pre-existing call sites sending this filter (useTrendingRequest.ts:253 and usePostTradeTrendingTokens.ts:35, via core's getTrendingTokens) serialize it through URLSearchParams as `excludeLabels=stable_coin%2Cblue_chip` (verified by execution: URLSearchParams percent-encodes commas). The Explore trending pill hits the same /v3/tokens/trending endpoint as the Homepage feed but now sends the same logical filter with different bytes. If the API honors only one form, one of the two surfaces has a silently no-op filter — for the pills the visible symptom would be stablecoins/blue chips surfacing in Top gainers; the new literal-comma choice plausibly matches what the API wants (it mirrors core's `n` handling), but nothing in the repo substantiates the comment's claim for excludeLabels, and the pinned tests assert the builder's output rather than the API contract.

**Fix:** Confirm the API's accepted form for excludeLabels once (live endpoint or API team), then move the special case into core's getTrendingTokensURL so both surfaces emit identical bytes.

### 🔵 **[INFO]** New tab test enshrines the unconditional tokens section push — `app/components/Views/TrendingView/tabs/CryptoTab.test.tsx:272`

_Reported by: pragmatist_

The test titled 'renders the tokens pill block unconditionally' asserts explore-section-tokens is on screen regardless of feed state, pinning as an apparent product contract the exact behavior flagged as the divider regression (the section wrapper and divider render even when CryptoTokensPillBlock returns null on total failure). Whoever implements the tab-side visibility gating that both the auditor and I proposed must rewrite this test, and its title invites the next reader to conclude the unconditional push was deliberate rather than an accident of moving visibility into the child.

**Fix:** Rewrite the test to assert the section appears when the pill block reports visible content and is omitted from the section list when it doesn't — or, if the unconditional push is accepted for now, rename the test and add a comment saying it pins current behavior, not intended behavior, linked to the follow-up.

### 🔵 **[INFO]** Prefetch gate bypasses staging when the watchlist pill is active — `app/components/Views/TrendingView/feeds/tokens/useCryptoPillFeed.ts:190`

_Reported by: auditor_

`activeLoaded` short-circuits to true whenever the watchlist pill is active (`activePillKey === CRYPTO_WATCHLIST_PILL.key || ...`) without consulting `watchlistResult.isLoading`. Since watchlist is the default active pill whenever the flag is on, the prefetch effect (lines 195-200) flips `prefetchStarted` on its first pass and all six pill queries (line 142's `enabled`) fire simultaneously on mount — the hook's own doc ('the remaining pills are prefetched in the background once the active pill has finished loading') and the test 'fetches only the active pill while it is loading' describe a staging that in practice only occurs when the flag is off and trending is active. No test covers a watchlist-active mount, so nothing pins which behavior is intended. UI data is unaffected; the deviation is request fan-out timing on every cold Explore open in the flag-on rollout state.

**Fix:** Either include the watchlist's own loading state in the gate (watchlistResult.isLoading) so prefetch waits like every other pill, or amend the doc comment and add a watchlist-active test that pins immediate prefetch as the intended behavior.

### 🔵 **[INFO]** Prefetch gate is a no-op in the flag-on configuration it exists for — `app/components/Views/TrendingView/feeds/tokens/useCryptoPillFeed.ts:189`

_Reported by: pragmatist_

activeLoaded short-circuits to true whenever activePillKey is the watchlist pill, regardless of the watchlist query's own isLoading. Since CryptoTokensPillBlock initializes activePillKey from pills[0] and getCryptoPillOrder puts the watchlist first when the flag is enabled, the effect at lines 194-200 flips prefetchStarted on its first run at mount and all six queries fire concurrently. The documented contract — 'the active pill fetches immediately; the remaining pills are prefetched once the active pill has finished loading' — therefore never holds in the flag-on rollout state this feature targets; the ~15 lines of gate machinery (state, activeLoaded computation, effect, enabled wiring) only prioritize anything in the flag-off state. Someone debugging slow first paint on a flaky network will find the prioritization silently absent while the code reads as load-bearing.

**Fix:** Either drop the watchlist short-circuit so the gate consults the active result uniformly (watchlist counts as loaded once data is defined, not loading, or errored), or — if firing everything at mount is the intended flag-on behavior — delete the gate and the docstring claim so the code stops describing a mechanism that doesn't run.
