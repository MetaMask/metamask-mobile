# Live-data subscriptions

Live Updates follow the user's eyes: an Event holds live-data subscriptions only while it is on screen. When it scrolls out, the screen hides, or the app backgrounds, the subscriptions are released; when it comes back they are reacquired.

This document describes the layers that implement that, the granularity each surface uses, and how the per-connection cap degrades.

## Layers

```
Screen  ──watchEvents(eventIds)──▶  PredictLiveDataService  ──subscribe(topic, ids)──▶  PredictLiveDataClient  ──frames──▶  gateway
        ◀── gameLiveUpdated / quoteUpdated ──┘                                          (WebSocket)
```

### Surfaces (`hooks/useEventsWithLiveData.ts`)

`useEventsWithLiveData(venueId, events, { visibleEventIds, isVisible, marketScope })` is the only way product UI touches live data. It

- watches exactly the Events in `visibleEventIds` (defaulting to every Event in `events`) while `isVisible` is true, sending only the diff to the service as the visible set changes, and releasing whatever it still holds on unmount;
- passes `marketScope` with every watch, so the service knows which Markets the surface prices: `all` (the default) for every Market, `card` (Home, Feed, Search) for the ones a list card shows, or `{ type: 'visible', marketIds }` (Event Screen) for an explicit list. The ids travel inside the scope, so an empty list means no Markets, never every Market. When the scope changes (including a new `visible` list), the hook watches under the new scope before it unwatches the old one, so the Event never drops to zero watchers and the service sends only the Market diff upstream;
- listens for `gameLiveUpdated` and `quoteUpdated` for every Event in `events` (narrowed to card Markets under `card` scope), so a frame for a card that is rendered but just outside the viewport still lands when it scrolls back;
- after a quiet period, applies every frame of the current JS turn at once (so a synchronous `watchEvents` replay shows in full) and batches later frames into at most one state update per `LIVE_UPDATE_THROTTLE_MS` (250 ms), so a busy stream does not re-render the surface once per socket message;
- returns the same Events with Game fields and Outcome prices patched, reusing the previous Event object when a tick did not touch it.

List surfaces never see Market ids: which Markets an Event needs for `card` is the service's business. The Event Screen is the exception, because only it knows which sections, period chips and lines are showing; it names those Markets and the service resolves them against the Event.

### Event-keyed manager (`services/PredictLiveDataService.ts`, `services/internal/LiveEventSubscriptions.ts`)

`PredictLiveDataService:watchEvents` / `unwatchEvents` are ref-counted per Event id and market scope. The first watcher of an Event

1. resolves the Event through `PredictMarketDataService:getEvent` (the cached REST read, so a card that was just rendered from a Feed does not hit the network again within `MARKET_DATA_EVENT_STALE_TIME`);
2. subscribes the Markets its scope needs on the `market` topic, in the Event's own `markets` order: every `markets[].id` for `all`, `getEventCardLiveMarketIds` (winner lines of a Game card, the first three Markets of a standard card) for `card`, or the listed ids that are Markets of the Event for `visible` (unknown ids are dropped, duplicates collapse, the list's own order is ignored);
3. when [live-game gating](#live-game-gating) applies, subscribes the Event id on the `game` topic.

A `visible` watcher that joins an already-resolved Event and names a Market the resolved snapshot does not list (a REST refresh added it since the first watch) makes the manager read the Event again through the same cached `getEvent` and adopt its Markets, without releasing the Event. Ids the fresh read still does not list belong to another Event: they stay dropped, and they do not trigger another read while a watcher keeps naming them.

Further watchers only widen the Market set: `all` covers everything, otherwise the Event holds the union of what its `card` and `visible` watchers ask for. `visible` ids are ref-counted per id, so a re-scope (watch the new list, then unwatch the old one) subscribes the ids that appeared and releases the ids that left, and an unchanged list subscribes nothing. When the Event Screen pops, its Markets are released while a card's Markets stay. The last watcher releases everything. A watch released before its resolution settles subscribes nothing. A retryable resolution failure (network, rate limit, venue unavailable) is retried with backoff for as long as the Event stays watched: surfaces only send the id diff, so a card that stays on screen never calls `watch` again, and an Event Screen would otherwise stay dark until the user leaves. Events that fail in one burst take slots 200ms apart so a Feed page does not retry as one stampede; the delay doubles up to 30 seconds and then keeps going rather than giving up. Any other failure is retried on the next `watch`. A watcher that joins an already-resolved Event is replayed the last known values for the Markets its scope prices and for the Game, because the Venue only snapshots on first subscribe.

Because Home and Feed watch the same Event id, and because the client additionally ref-counts per Market id, an Event visible on both surfaces holds exactly one upstream subscription per Market, and a Game detail read that appends sibling Markets shares them with the sibling Event.

### Transport (`adapters/remote/PredictLiveDataClient.ts`)

The client ref-counts per id and topic, opens the socket lazily on the first watch, lingers `PREDICT_LIVE_DATA_DISCONNECT_LINGER_MS` after the last release before closing, suspends on `AppState` `background` and resubscribes the full watched set on `active`, and applies the `welcome` limits described below.

## Visibility adapters

| Surface      | Granularity                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event Screen | The one Event, watched from mount to unmount with `marketScope: { type: 'visible', marketIds }`: the chart's Markets (both winner lines of a Game, the top Markets of a multi-Market Event, or the single history Market), plus what `EventMarketList` renders in the active tab — open sections only, the selected period chip only, every row of a choice card, the selected line of a line picker, Position cards on the Positions tab. Opening or closing a section, changing chip, line or tab re-scopes by the diff. When the active tab prices more than `EVENT_LIST_LIVE_MARKET_BUDGET` (247: the 250 default minus the chart's three) Markets, the list reports only its viewable rows (`onViewableItemsChanged`, 10% threshold) and 10 rows either side, cut at the budget, so a scroll re-scopes too. Backgrounding is handled by the transport. |
| Feed Screen  | Per card, `marketScope: 'card'`. `FlatList` `onViewableItemsChanged` (10% visibility threshold) names the visible cards; until the list reports anything the first page stands in. A report that names nothing (fling, bounce, delayed callback from a previous tab) is ignored so the last measured set stays watched.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Home         | Per section, `marketScope: 'card'`. Each `FeedPreviewSection` reports its frame and the `ScrollView` its height; a section is visible while any part of it overlaps `[scrollY, scrollY + viewportHeight]`. Every Event of a visible section is watched. Unmeasured sections and an unmeasured viewport count as visible.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Search       | Every result card (≤20), `marketScope: 'card'`. No viewability tracking: the result set is already the backend `limit`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

Home uses section-level rather than card-level tracking deliberately: it shows a handful of two-card sections, so the saving from per-card measurement would be one or two Markets, and section frames come free from `onLayout`. The scroll offset crosses from the UI thread through `useAnimatedReaction` → `scheduleOnRN`; the visible set only re-renders Home when it actually changes.

Feed, Home, and Search additionally gate on navigation focus (`useIsFocused`). A list under an Event Screen holds zero subscriptions and rewatches its visible cards when the Event Screen pops.

## Live-game gating

A visible Event also holds a `game` subscription when it has a Game and either

- the Game is live: status `in_progress`, `delayed`, or `suspended`; or
- the Game is `scheduled` and `event.startsAt` is at most `PREDICT_LIVE_GAME_WINDOW_MS` (60 minutes) in the future — including a scheduled Game whose kickoff has already passed but whose status has not caught up.

Completed, canceled, and postponed Games, scheduled Games outside the window, and Events without a Game subscribe Markets only.

Gating is evaluated at resolution, with one exception. A scheduled Game still outside the window arms a timer for the moment it enters (`startsAt - PREDICT_LIVE_GAME_WINDOW_MS`), so an Event that stays on screen as kickoff approaches upgrades itself to a `game` watcher with no re-watch. The timer is released with the Event and never outlives its last watcher; a kickoff further out than `setTimeout` can hold (~24.8 days) is left to the next watch instead.

Other transitions are not tracked live: a Game that goes from `scheduled` to `in_progress` more than `PREDICT_LIVE_GAME_WINDOW_MS` before its listed `startsAt` picks up its `game` subscription the next time the Event is watched (a tab switch or a scroll cycle). Note that an Event Screen refetch does _not_ re-watch — `useLiveEventWatches` diffs Event ids, which a refetch leaves unchanged.

## Cap degradation

`welcome` announces `limits.market.maxPerConnection` (default `PREDICT_LIVE_DATA_DEFAULT_MARKET_MAX_PER_CONNECTION`, 250 Markets) and the same for `game` (default 50). When the visible set asks for more ids than the cap allows, nothing throws and nothing is dropped from the watch set; the extras wait.

Waiting is not a substitute for bounding. Ids past the cap only get a slot when an earlier id is released, so a surface that keeps every row it could render in its watch set leaves the rows past the cap stale for as long as it is open, however far the user scrolls. A caller that can name more Markets than the cap must bound what it asks for by what is on screen: report viewable rows with a bounded buffer (`onViewableItemsChanged` with a `viewabilityConfig`, as the Feed and the Event Screen do) or page the rows it renders, and leave room for anything else it prices (the Event Screen's chart). Releasing the rows that scrolled away is what frees the slots for the rows that scrolled in.

Priority is first-watched-first-served:

1. Within one Event, Markets are issued in the Event's `markets` order, so for a single oversized Event the first N Markets in display order are live.
2. Across Events, the Event watched earlier keeps its slots; a newly visible Event queues behind it.
3. When a release frees slots, the waiting ids are granted in watch order (the transport's `Map` insertion order), so the outcome depends only on the sequence of watch/unwatch calls, never on frame timing.

The transport logs when it truncates or refuses a subscribe so the condition is observable in diagnostics.

## Testing

- `services/internal/LiveEventSubscriptions.test.ts` — ref counting, resolution races, gating, the game-window timer, replay, market-scope widening and narrowing, `visible` scope resolution and re-scope diffs, and the membership re-read when a `visible` watcher names a Market the snapshot lacks.
- `services/internal/LiveEventSubscriptions.retry.test.ts` — retryable-resolution backoff.
- `services/PredictLiveDataService.test.ts` — messenger actions, per-Venue guard, value caching and replay.
- `services/PredictLiveDataService.integration.test.ts` — the acceptance journeys over the shared `tests/integration/harnesses/predict-next.ts` harness with a fake gateway socket: Feed scroll in/out, one upstream subscription for Home + Feed, zero subscriptions after Event Screen unmount, deterministic cap degradation, a Market added by a REST refresh reaching the socket while the Event stays watched, background/foreground.
- `views/PredictHome/internal/useVisibleSections.test.ts` and the `*.view.test.tsx` files — the per-surface visibility adapters. `PredictEventScreen.view.test.tsx` ("live market scope") covers the Event Screen's visible set for a Game past the cap and its re-scopes on section, chip, line and tab changes; "live market scope past the connection cap" runs the real service and client over a fake socket and scrolls a 260-Market Event to Market 255, checking that it reaches the socket and the rows scrolled past leave it.
