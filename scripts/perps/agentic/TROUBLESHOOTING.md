# Agentic Benchmark Troubleshooting

Hard-won fixes from running the Detox vs. agentic benchmark.

> Previously documented here and now fixed upstream:
> - `yarn expo start --clear` stale-babel-cache regression — `start-metro.sh` pre-clears `$TMPDIR/metro-cache` + `haste-map-*` (#28896).
> - Three-modal onboarding dismiss (`OptinMetrics`, `MultichainAccountsIntro`, `PredictGTM`) — handled in-app by `__AGENTIC__.setupWallet(fixture)` via `AgenticService`.

## Metro / build

### Dual-port Metro breaks Expo Dev Client deep links

The app's Expo Dev Client reads `WATCHER_PORT` from `.js.env` (via `dotenv` in `tests/helpers.js`) and may cache the server URL. Running two Metros on different ports — one for Detox, one for agentic — causes the app to load from the wrong port, or load the dev bundle in an e2e run.

Fix: use one port for both phases; switch env by killing and restarting Metro.

```bash
kill $(lsof -iTCP:8062 -sTCP:LISTEN -t)
METAMASK_ENVIRONMENT=e2e IS_TEST=true yarn expo start --port 8062 &   # phase 1

kill $(lsof -iTCP:8062 -sTCP:LISTEN -t)
METAMASK_ENVIRONMENT=dev yarn expo start --port 8062 &                # phase 2
```

## App state

### Wallet locks after Metro restart

When Metro restarts the app reloads and the wallet re-locks. Unlock via CDP before running recipes:

```bash
node scripts/perps/agentic/cdp-bridge.js unlock <password>
```

The benchmark script reads the password from `.agent/wallet-fixture.json`.

### Perps provider not authenticated after app restart

`perps.ready_to_trade` fails with `isAuthenticated: false` or `no active provider`. Init sequence matters:

```bash
$CDP eval-async 'Engine.context.PerpsController.init().then(function(){return Engine.context.PerpsController.toggleTestnet(true)}).then(function(){return JSON.stringify({ok:true})})'
```

Rules:

- `init()` creates the provider — call first
- `toggleTestnet(true)` switches to testnet and reconnects internally
- **Do not** call `reconnect()` after `toggleTestnet()` — it resets the testnet flag

Verify:

```bash
$CDP check-pre-conditions '["perps.ready_to_trade","perps.sufficient_balance"]'
# expect "ok": true
```

## PerpsController API gotchas

### Limit order price param is `price`, not `limitPrice`

`OrderParams.price` covers limit orders. Passing `limitPrice` throws `ORDER_LIMIT_PRICE_REQUIRED`.

```js
PerpsController.placeOrder({
  symbol: 'ETH',
  isBuy: true,
  orderType: 'limit',
  price: '2357',      // NOT limitPrice
  size: '0.001',
  usdAmount: '10',
});
```

### `getMarkets()` has no prices

Returns `{ symbol, szDecimals, maxLeverage }` — metadata only. Live prices come from `getMarketDataWithPrices()`.

### Price format needs stripping

`getMarketDataWithPrices()` returns formatted strings like `"$2,357.4"`; `placeOrder()` expects a plain number string.

```js
var clean = market.price.replace(/[$,]/g, '');   // "2357.4"
```

## Full setup after a clean build

```bash
yarn a:setup:ios                    # dev build + wallet setup (handles onboarding via AgenticService)
yarn test:e2e:ios:debug:build       # Detox build

CDP="IOS_SIMULATOR=mm-2 WATCHER_PORT=8062 node scripts/perps/agentic/cdp-bridge.js"
$CDP eval-async 'Engine.context.PerpsController.init().then(function(){return Engine.context.PerpsController.toggleTestnet(true)}).then(function(){return JSON.stringify({ok:true})})'
$CDP check-pre-conditions '["perps.ready_to_trade","perps.sufficient_balance"]'

bash scripts/perps/agentic/run-timing-benchmark.sh
```
