# Homepage Section Performance

Homepage section performance currently emits two instrumentation versions.

## V1

V1 is intentionally frozen for historical comparison.

- Trace names:
  - `Homepage Section Time To Content`
  - `Homepage Section Data Fetch`
- Operation: `homepage.section.performance`
- Primary filter: `section_id`

Do not compare V1 and V2 in the same trend line. V1 measures section mount to hook-level readiness, and some sections historically used broader readiness signals than visible content.

## V2

V2 is scoped to one Homepage measurement session after app open or wallet unlock.

- Trace names:
  - `Homepage Section Time To Content V2`
  - `Homepage Section Data Ready V2`
- Operation: `homepage.section.performance.v2`
- Required filters:
  - `instrumentation_version:2`
  - `section_id`
  - `success:true` for user-facing latency dashboards

V2 starts spans at the claimed app-open/unlock session boundary and only emits when the next Homepage focus claims that pending session. Later navigation to Homepage, pull-to-refresh, and section remounts do not emit V2 unless a new app foreground/open or unlock armed a session.

## V2 Tags

Use these dimensions when building dashboards:

- `section_id`
- `section_mode`
- `section_variant`
- `session_trigger`
- `homepage_perf_session_id`
- `app_session_id`
- `content_state`
- `cache_state`
- `item_count`
- `reason`

`content_state:error` spans intentionally include `reason:error`. Hidden sections that resolve to an empty terminal state use `reason:hidden_empty`.

## Rollout Checks

Validate on Android release builds because development mode materially changes JavaScript timing:

- Cold open while unlocked.
- Background to foreground while unlocked.
- Foreground while locked, then unlock.
- Wallet tab and Browser tab navigation after initial load.
- Details screen and back navigation.
- Pull-to-refresh.
- Power-user wallet with many tokens, NFTs, DeFi positions, Perps positions, and Predict positions.

MetaMask production tracing sampling is low, so expect V2 coverage dashboards to need enough release traffic before interpreting p95 section latency.
