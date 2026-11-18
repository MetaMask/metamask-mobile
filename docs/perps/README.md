# Perps in MetaMask Mobile

Mobile is the reference client for Perps. The shared logic (controller, providers, math, formatting, events, traces, venues) lives in Core and is documented there: [perps-controller docs](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/README.md). These docs cover only the Mobile layer.

| Doc                                                        | What it covers                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| [connection-architecture.md](./connection-architecture.md) | Who connects and disconnects, stream manager and channels, app state |
| [caching-architecture.md](./caching-architecture.md)       | UI caches, clearing, cold start                                      |
| [screens.md](./screens.md)                                 | Screens, routes, entry and exit paths                                |
| [deeplinks.md](./deeplinks.md)                             | Supported deeplink URLs                                              |
| [tpsl.md](./tpsl.md)                                       | Mobile's TP/SL decision flag and hooks                               |
| [instrumentation.md](./instrumentation.md)                 | Mobile's own analytics and Sentry usage on top of the Core contracts |
| [feature-flags.md](./feature-flags.md)                     | Flags only Mobile reads                                              |
| [ab-testing.md](./ab-testing.md)                           | Perps A/B tests                                                      |
| [lighter-api-keys.md](./lighter-api-keys.md)               | Lighter key derivation and storage in Mobile                         |
| [performance/](./performance/architecture.md)              | Load-time measurement, loading session, runbook, Sentry mapping      |
| [tooling/](./tooling/)                                     | WebSocket monitoring, UI observations for agents                     |

Other clients: Extension and Terminal keep their own `docs/perps/`, linked from the Core index.

A change to a pattern described here updates the doc in the same PR.
