# Perps loading session

The loading session measures one visible Perps loading generation. It does not
replace app startup, controller preload, connection, or Homepage section traces.
Those traces keep their existing owners.

## Boundary

A screen integration starts the session when a visible Perps surface begins
loading. It finishes the same session when the surface resolves to content,
empty, or error and all required fresh data has arrived.

The foundation does not mount a screen or start a session by itself. Homepage
and other screen integrations are separate changes.
It does own shared connection replacement and stream subscription isolation,
including restoring mounted market-detail channels after the controller
connection changes. Screen readiness and presentation remain outside this PR.

## Identity

Each session stores three keys:

- `marketKey`: provider, Perps network, and HIP-3 configuration
- `accountKey`: selected account address
- `userKey`: market key plus account key

Market and price deliveries must match `marketKey`. Positions, orders, and
account deliveries must match `userKey`. Socket callbacks capture this
identity when they subscribe, so a late callback from an old account or network
cannot complete the current session.

## Generations

- `account_generation` advances when a session starts for a different account.
- `context_generation` advances for every new loading session.
- `connection_generation` advances when the connection is replaced.

Fresh socket milestones must use the active connection generation. When a
newer connection takes ownership, previously recorded live milestones are
cleared and must arrive again from that connection.
Account-owned streams establish the connection generation. A global price tick
cannot establish it before positions, orders, or account data arrives.

Generation values are trace data for individual-run correlation. Dashboards
must not group by them.

## Sources and milestones

Bounded sources:

- markets: `memory_cache`, `terminal_global_snapshot_v2`, or `provider`
- account snapshot: `memory_cache` or `provider_snapshot`
- live data: `fresh_socket`

Bootstrap-relative measurements:

- `markets_ready_ms`
- `account_cache_ready_ms`
- `positions_live_ms`
- `orders_live_ms`
- `account_live_ms`
- `prices_live_ms`

The account cache milestone requires positions, orders, and account data from
the same cache source. Cold start, account switch, network switch, and reconnect
cannot finish from cached account data. They wait for fresh positions, orders,
and account deliveries.

## Lifecycle

The bounded lifecycle values are:

- `cold_no_cache`
- `navigate_return`
- `background_short`
- `background_reconnect`
- `account_switch`
- `network_switch`

A short background sample waits for foreground connection validation. If the
connection must reconnect, the session changes to `background_reconnect` and
waits for fresh live milestones.

The wallet-root initial mount and its retry keep the current cold or warm
lifecycle. Only an actual wallet-root foreground resume may upgrade a session
to `background_reconnect`.

Cancelled and timed-out sessions retain their real outcome. A screen
integration must cancel on context change, background, focus loss, or unmount
instead of allowing an old generation to finish.

## Correlation

`perps_session_id` is attached to controller preload and first-data traces for
drill-down. `Perps Loading Session` owns only bootstrap-relative offsets and
bounded outcome data. Sentry dashboards compare the independent traces by
release, platform, lifecycle, content variant, and source. They do not join
unrelated traces by timestamp.
