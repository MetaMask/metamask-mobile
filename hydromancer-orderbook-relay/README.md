# Hydromancer order-book relay

Small Node process that holds the Hydromancer API key and shares one `l2Book` subscription per active market with the app. The key never goes in the mobile bundle.

## API key

1. Copy the example env file:

```bash
cp .env.example .env
```

2. Open `hydromancer-orderbook-relay/.env` and set `HYDROMANCER_API_KEY` to the key you received.

That file is gitignored. Do not put the key in the mobile app's `.js.env`.

## Run

From this directory, with Node 22 or newer:

```bash
node --env-file=.env src/index.js
```

Or:

```bash
yarn start
```

The relay listens on `ws://localhost:8787`. `GET /health` returns whether the vendor socket is up and which markets are active.

## Client messages

Subscribe:

```json
{ "type": "subscribe", "coin": "BTC" }
```

Each snapshot:

```json
{
  "type": "l2Book",
  "coin": "BTC",
  "orderBook": {},
  "vendorTime": 0,
  "relayTime": 0
}
```

`orderBook` matches the app's `OrderBookData` shape, with 20 levels per side. A sequence gap sends `{ "type": "reset", "coin": "BTC" }` and the next snapshot replaces the book.
