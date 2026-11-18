# Recent openings specification

## Decision and ownership

Recent openings are a public discovery feed, not ownership, transaction status or
an exhaustive event index. Users usually visit briefly, and a snapshot request is
needed on entry anyway. REST polling avoids a socket connection, authentication,
reconnection and an extra dependency for those short visits. There is no live
service, token endpoint or controller feed cache.

`PackPartnerApiClient` forwards `GET /getAllWinners` filters and validates responses.
`PackPartnerDataService` maps snapshots, isolates keys by environment and every
filter, coalesces concurrent reads, and uses zero stale time so each poll reaches
HTTP. TanStack Query owns request scheduling/deduplication. Only
`usePackPartnerOpenings` owns presentation buffering and insertion scheduling.
No feed or queue is persisted; the owned-collection disk cache is unrelated.

## Hook contract

```ts
usePackPartnerOpenings(
  { packType: pack.code }, // {} for every pack
  {
    enabled: visible,
    listLimit: 20,
    pollIntervalMs: 1000,
    insertIntervalMs: 1000,
  },
);
```

Every option is optional. The three numeric options must be positive integers.
`listLimit` bounds both displayed entries and pending entries, independently.
An omitted API `count` defaults to `min(listLimit, 200)`; explicit `count` wins.
A view can use different values without changing provider defaults.

Returned state: `data`, `isPending`, `isRefetching`, `isError`, `pendingCount`,
`isPaused`. Actions: `pause()`, `resume()`, `refresh()`.

Forwarded endpoint options: `packType`, ISO `timestamp`, memo-prefix `slug`,
`epic`, `count` (1–200), `cursor`, `wallet`, and `perTier` (1–25).
The API always returns newest first; it has no configurable sort parameter.
`wallet` overrides other filters/cursor (count applies), and `perTier` overrides
other filters/count/cursor unless wallet is supplied. Do not locally reapply a
pack filter over those server-selected results. Cursor is forwarded, not an
automatic historical-pagination loop. Views must change filters to change pages.

## Acceptance criteria

1. Show the first successful snapshot immediately, including an empty snapshot,
   sorted newest first and deduplicated by opening event ID (not NFT mint).
2. Poll only while enabled, foregrounded and online. Unknown connectivity is not
   offline. Reads do not overlap for the same key. Errors retain displayed data.
3. Subsequent unseen wins enter the queue; display at most one each insertion
   interval. Queue and list never exceed `listLimit`. During a burst retain the
   newest queued wins, draining those retained wins oldest first. A timestamp
   watermark and bounded seen IDs prevent replaying discarded older wins.
4. Scroll away from the start calls `pause()`: keep polling and buffering without
   changing displayed rows. Returning to the start calls `resume()`: resume the
   normal insertion cadence, with no catch-up burst.
5. Disable/leave the section or screen, background the app, or go offline: stop
   polling and insertion timers. Unmount removes the AppState listener. An already
   running read may settle in the query cache; it cannot insert into an inactive
   or differently filtered feed. Foreground/online re-enables the snapshot read.
6. Every filter participates in the query key. Changing filters replaces the feed
   and clears its insertion pause. Equivalent filter objects preserve it.
7. List/poll/insert overrides work independently. The defaults remain 20/1000/1000.
8. This is a bounded latest-wins feed: more arrivals than the response/queue can
   hold may be skipped. It does not promise complete history or indexer semantics.

## Test layer placement

- Hook unit tests exercise clocks, filter changes, lifecycle and bounds using fake
  timers and the real UI query client. Deterministic clock assertions belong here
  because component-view tests use real timers. The messenger is the external read
  boundary; the provider branch has no product feed screen.
- Client/service tests verify URL options, filter-key separation, mapping, fresh
  sequential reads and concurrent coalescing. Integration tests retain the real
  client/service/messenger chain with HTTP mocked.
- POC component-view tests assert real query observer activation on visibility,
  navigation, modal and AppState changes, with mocked Engine reads. They use no
  fake timers. Narrow list callback unit tests verify scroll pause/resume wiring;
  hook unit tests prove that those actions stop insertions but continue polling.
  No socket or real purchase is needed.
