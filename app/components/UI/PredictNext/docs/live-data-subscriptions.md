# Live-data subscriptions

Live Updates follow the user's eyes: an Event holds live-data subscriptions only while it is on screen. When it scrolls out, the screen hides, or the app backgrounds, the subscriptions are released; when it comes back they are reacquired.

This document describes the layers that implement that, the granularity each surface uses, and how the per-connection cap degrades.

## Layers

```
Screen  ──watchEvents(eventIds)──▶  PredictLiveDataService  ──subscribe(topic, ids)──▶  PredictLiveDataClient  ──frames──▶  gateway
        ◀── gameLiveUpdated / quoteUpdated ──┘                                          (WebSocket)
```

### Surfaces (`hooks/useEventsWithLiveData.ts`)

`useEventsWithLiveData(venueId, events, { visibleEventIds, isVisible })` is the only way product UI touches live data. It

- watches exactly the Events in `visibleEventIds` (defaulting to every Event in `events`) while `isVisible` is true, sending only the diff to the service as the visible set changes, and releasing whatever it still holds on unmount;
- listens for `gameLiveUpdated` and `quoteUpdated` for every Event in `events`, so a frame for a card that is rendered but just outside the viewport still lands when it scrolls back;
- returns the same Events with Game fields and Outcome prices patched.

Surfaces never see Market ids. Which Markets an Event needs is the service's business.

### Event-keyed manager (`services/PredictLiveDataService.ts`, `services/internal/LiveEventSubscriptions.ts`)

`PredictLiveDataService:watchEvents` / `unwatchEvents` are ref-counted per Event id. The first watcher of an Event

1. resolves the Event through `PredictMarketDataService:getEvent` (the cached REST read, so a card that was just rendered from a Feed does not hit the network again within `MARKET_DATA_EVENT_STALE_TIME`);
2. subscribes the Event's `markets[].id` on the `market` topic, in the Event's own `markets` order;
3. when [live-game gating](#live-game-gating) applies, subscribes the Event id on the `game` topic.

The last watcher releases both. A watch released before its resolution settles subscribes nothing; a failed resolution is retried on the next watch for that Event. A watcher that joins an already-resolved Event is replayed the last known quote and Game values, because the Venue only snapshots on first subscribe.

Because Home and Feed watch the same Event id, and because the client additionally ref-counts per Market id, an Event visible on both surfaces holds exactly one upstream subscription per Market, and a Game detail read that appends sibling Markets shares them with the sibling Event.

### Transport (`adapters/remote/PredictLiveDataClient.ts`)

The client ref-counts per id and topic, opens the socket lazily on the first watch, lingers `PREDICT_LIVE_DATA_DISCONNECT_LINGER_MS` after the last release before closing, suspends on `AppState` `background` and resubscribes the full watched set on `active`, and applies the `welcome` limits described below.

## Visibility adapters

| Surface      | Granularity                                                                                                                                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event Screen | The one Event, watched from mount to unmount. Backgrounding is handled by the transport.                                                                                                                                                                                                          |
| Feed Screen  | Per card. `FlatList` `onViewableItemsChanged` (10% visibility threshold) names the visible cards; until the list reports anything the first page stands in. A report that names nothing (fling, bounce, delayed callback from a previous tab) is ignored so the last measured set stays watched.  |
| Home         | Per section. Each `FeedPreviewSection` reports its frame and the `ScrollView` its height; a section is visible while any part of it overlaps `[scrollY, scrollY + viewportHeight]`. Every Event of a visible section is watched. Unmeasured sections and an unmeasured viewport count as visible. |

Home uses section-level rather than card-level tracking deliberately: it shows a handful of two-card sections, so the saving from per-card measurement would be one or two Markets, and section frames come free from `onLayout`. The scroll offset crosses from the UI thread through `useAnimatedReaction` → `runOnJS`; the visible set only re-renders Home when it actually changes.

Feed and Home additionally gate on navigation focus (`useIsFocused`). A Feed under an Event Screen holds zero subscriptions and rewatches its visible cards when the Event Screen pops.

## Live-game gating

A visible Event also holds a `game` subscription when it has a Game and either

- the Game is live: status `in_progress`, `delayed`, or `suspended`; or
- the Game is `scheduled` and `event.startsAt` is at most `PREDICT_LIVE_GAME_WINDOW_MS` (60 minutes) in the future — including a scheduled Game whose kickoff has already passed but whose status has not caught up.

Completed, canceled, and postponed Games, scheduled Games outside the window, and Events without a Game subscribe Markets only. Gating is evaluated once per resolution; an Event that crosses into the window while continuously on screen picks up its `game` subscription the next time it is watched (the Event Screen refetch, a tab switch, or a scroll cycle).

## Cap degradation

`welcome` announces `limits.market.maxPerConnection` (default `PREDICT_LIVE_DATA_DEFAULT_MARKET_MAX_PER_CONNECTION`) and the same for `game`. When the visible set asks for more ids than the cap allows, nothing throws and nothing is dropped from the watch set; the extras wait.

Priority is first-watched-first-served:

1. Within one Event, Markets are issued in the Event's `markets` order, so for a single oversized Event the first N Markets in display order are live.
2. Across Events, the Event watched earlier keeps its slots; a newly visible Event queues behind it.
3. When a release frees slots, the waiting ids are granted in watch order (the transport's `Map` insertion order), so the outcome depends only on the sequence of watch/unwatch calls, never on frame timing.

The transport logs when it truncates or refuses a subscribe so the condition is observable in diagnostics.

## Testing

- `services/internal/LiveEventSubscriptions.test.ts` — ref counting, resolution races, gating, replay.
- `services/PredictLiveDataService.test.ts` — messenger actions, per-Venue guard, value caching and replay.
- `services/PredictLiveDataService.integration.test.ts` — the acceptance journeys over the shared `tests/integration/harnesses/predict-next.ts` harness with a fake gateway socket: Feed scroll in/out, one upstream subscription for Home + Feed, zero subscriptions after Event Screen unmount, deterministic cap degradation, background/foreground.
- `views/PredictHome/internal/useVisibleSections.test.ts` and the `*.view.test.tsx` files — the per-surface visibility adapters.
