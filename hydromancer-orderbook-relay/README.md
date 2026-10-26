# Order-book relay (Hydromancer + QuickNode)

Small Node process that holds vendor API keys and shares one 20-level order book per active market with the app. The keys never go in the mobile bundle.

This is the local proof-of-concept for the [Perps HyperLiquid order-book depth investigation](https://consensyssoftware.atlassian.net/wiki/spaces/TL1/pages/402038587393/Perps+HyperLiquid+order-book+depth+investigation): Hydromancer first, QuickNode as the gRPC comparison.

## Vendors

| Vendor        | Upstream                                     | Auth                                                          |
| ------------- | -------------------------------------------- | ------------------------------------------------------------- |
| `hydromancer` | `wss://api.hydromancer.xyz/ws` JSON `l2Book` | `HYDROMANCER_API_KEY`                                         |
| `quicknode`   | QuickNode `StreamL2Book` gRPC                | `QUICKNODE_GRPC_ENDPOINT` + `QUICKNODE_API_TOKEN` (`x-token`) |

Configure at least one vendor. The Pro order-book settings sheet (dev builds) can switch the ladder between Hyperliquid, Hydromancer, and QuickNode.

## API keys

1. Copy the example env file:

```bash
cp .env.example .env
```

2. Open `hydromancer-orderbook-relay/.env` and set the vendor credentials you have.

That file is gitignored. Do not put the keys in the mobile app's `.js.env`.

QuickNode endpoint form:

```text
your-endpoint.hype-mainnet.quiknode.pro:10000
```

## Run

From this directory, with Node 22 or newer:

```bash
yarn install
node --env-file=.env src/index.js
```

Or:

```bash
yarn start
```

The relay listens on `ws://localhost:8787`. `GET /health` returns which vendors are configured and which markets are active.

## Client messages

Subscribe (defaults to Hydromancer when `vendor` is omitted):

```json
{ "type": "subscribe", "vendor": "quicknode", "coin": "BTC", "nSigFigs": 2 }
```

Each snapshot:

```json
{
  "type": "l2Book",
  "vendor": "quicknode",
  "coin": "BTC",
  "orderBook": {},
  "vendorTime": 0,
  "relayTime": 0
}
```

`orderBook` matches the app's `OrderBookData` shape, with 20 levels per side. A Hydromancer sequence gap sends `{ "type": "reset", "vendor": "hydromancer", "coin": "BTC" }` and the next snapshot replaces the book. QuickNode sends a full replacement snapshot every block, so gaps only cost one missed frame.
