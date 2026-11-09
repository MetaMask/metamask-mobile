# V1 Predict deep links (PRED-1411)

`handlePredictUrl` (`app/core/DeeplinkManager/handlers/intent/`) is a thin parser. It hands the part of a `/predict` URL after the action to the PredictNext entry point, which parses it into a Predict intent (`parsePredictLink`), resolves the intent against the Active Venue (`resolvePredictLinkFromStore`), and returns the app navigation. The resolution goes through `resolvePredictIntent`, the same one entry actions use (PRED-1379). The handler adds no routing of its own.

## Link vocabulary

| Link                                                           | Polymarket active (legacy)                                                      | Kalshi active (next)                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `?market=<id>`, `?marketId=<id>`                               | Legacy market details, as before                                                | Market unavailable                                           |
| `/predict`, `?tab=`, `?q=`/`?query=`                           | Legacy market list, as before                                                   | PredictNext Home                                             |
| `?feed=<generic id>&tab=&filter=` (`popular-today` → Trending) | Legacy generic feed while `predictHomeRedesign` is on, else the list, as before | PredictNext Home                                             |
| `?venue=polymarket&market=<id>` (or `&event=<id>`)             | Legacy market details                                                           | Market unavailable                                           |
| `?venue=polymarket` + list params                              | As the unmarked list link                                                       | Market unavailable                                           |
| `?venue=kalshi&event=<ticker>`                                 | Market unavailable                                                              | PredictNext Event                                            |
| `?venue=kalshi&feed=<Feed Screen>&tab=<tab>`                   | Market unavailable                                                              | PredictNext Feed Screen (unknown screen: Market unavailable) |
| `?venue=kalshi`                                                | Market unavailable                                                              | PredictNext Home                                             |
| `?venue=kalshi&market=<ticker>`                                | Market unavailable                                                              | Market unavailable (no market-to-Event lookup)               |
| `?venue=<anything else>`                                       | Market unavailable                                                              | Market unavailable                                           |

"Market unavailable" is the legacy `PredictModals → PredictMarketUnavailable` sheet. It opens over whatever was on screen and closes back to it.

## Rules

- **An unmarked entity link is Polymarket-origin.** A V1 `market` or `marketId` is a Polymarket market whichever Venue is active, even when it looks like a Kalshi ticker. The Venue is never guessed from an identifier.
- **The marker never overrides the Active Venue.** `venue=` only states which Venue the link's identifiers belong to. A link marked for a Venue that is not the Active Venue gets the bounded not-found. It does not switch the Venue, change the Venue Selection Preference, or look the identifier up under the other Venue. (The closed ADR [decisions#288](https://github.com/MetaMask/decisions/pull/288) proposed letting `venue=` override the Active Venue. That was not adopted.)
- **No fallback on a mismatch.** A mismatch, an unknown Venue or an unknown Feed Screen never opens another Event, a feed, Home or another Venue's screen.
- **No indefinite loading.** While the Active Venue resolves at cold start, the link waits for it for at most `PREDICT_LINK_VENUE_WAIT_MS` (5 s; the Venue controller latches a default within 3 s). Then an unmarked list link takes the legacy market list, which the root router hands to the Active Venue's stack, as feeds do. It never opens a legacy generic feed screen at that point, because the PredictNext stack has none. Every other link that is still unresolved at that point gets the not-found. An Event that is not found or fails to load shows the Event screen's error state, never a spinner.
- **A V1 list link is Venue-neutral.** Its `feed`/`tab`/`filter`/`q` values name Polymarket categories, so on a PredictNext Venue it opens Home, the only list surface that Venue has.

## Attribution

Every intent carries the link's entry point: `origin` (`deeplink` by default) with `_<utm_source>` appended when the link has a different `utm_source`, e.g. `deeplink_twitter`, `carousel_braze`. It is the value the handler produced before intents, so dashboards keep their series. On the legacy branch it reaches the market details, market list and generic feed screens as `entryPoint`, which the legacy Predict events report as `entry_point`. `DEEP_LINK_USED` keeps reporting every `utm_*` parameter, unchanged.

The PredictNext Event, Feed and Home routes take no entry point yet, so a Kalshi landing carries it in its intent but drops it at the route. Venue-aware attribution on PredictNext screens and link events belongs to the analytics owners, PRED-1267 (PRED-1268 `attribution_source`, PRED-1272 navigation events), and to PRED-1294's "Analytics & Attribution" scope. This change adds no analytics foundation of its own.

## V1 limitation and PRED-1294 (for product sequencing)

V1 links name a Venue's own identifiers, so a link only opens its entity while that Venue is active. A Polymarket campaign link (`?market=23246`) shown to a US user whose Active Venue is Kalshi lands on "Market unavailable". It does not open the Kalshi equivalent, and it does not open Kalshi Home. There is no cross-Venue reference to resolve it with. While Polymarket is active, every existing link behaves exactly as before.

PRED-1294 (Kalshi Deep Linking) states two launch goals that conflict under this V1 behaviour:

1. **No break:** "Existing `market` and `marketId` links continue to resolve. There are ~68.7K Predict deep link opens per 30 days and live campaigns in market; none of them can break." It also says a link must never land on "a screen belonging to a venue the user cannot use".
2. **Fallback ladder:** "Where an exact counterpart does not exist for a user's venue ... resolution degrades to the most specific relevant surface available": market or event, then sport or category, then feed, then Predict home, recorded in analytics and explained in the UI.

PRED-1411 forbids that fallback for V1: a mismatch gets a bounded not-found, with no fallback to another event, feed, Home or Venue. So, until PRED-1294 ships Venue-agnostic references, a live Polymarket market link opened by a Kalshi-active user does not "continue to resolve" (goal 1) and does not "degrade" (goal 2). It stops at "Market unavailable", which is defined and bounded but not what either goal promises. Product needs to decide whether that is acceptable for the Kalshi launch cohort, or whether PRED-1294's reference and ladder work must land before Kalshi is rolled out to users who receive Polymarket campaigns. This document records the conflict. It does not resolve it or change PRED-1294's scope.

Cold and warm OS link dispatch is verified under PRED-1164 and PRED-1294.
