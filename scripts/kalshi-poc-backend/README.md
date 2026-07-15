# kalshi-poc-backend

Throwaway stub backend for the Kalshi Predict POC. Holds the ISV admin `api_key`,
mints + stores per-user PEMs server-side, performs all RSA-PSS signing, exposes
canonical `/predict/v1/kalshi/*` endpoints. Mobile uses a remote `VenueAdapter`
that proxies through here. Secrets never on device.

See `app/components/UI/PredictNext/docs/kalshi-poc-plan.md`.

## Run

```bash
cp .env.example .env   # fill in KALSHI_ADMIN_API_KEY_ID + KALSHI_ADMIN_PEM_PATH
yarn install           # or: npm install
node --experimental-strip-types src/server.ts
```

The server listens on `http://localhost:8080` by default (configurable via `PORT`).

## Layout

```
src/
├── server.ts            # express bootstrap
├── config.ts            # env loading, defaults
├── kalshi/
│   ├── signing.ts       # RSA-PSS-SHA256, pre_sign = ts_ms + METHOD + PATH
│   ├── client.ts        # signed Kalshi HTTP client + error normalization
│   └── errors.ts        # canonical PredictError envelope + Kalshi error parsing
├── store/
│   └── users.ts         # in-memory user + per-user PEM store
├── routes/
│   ├── setup.ts         # /account/setup/{start,step,status,link,link/verify}
│   ├── readiness.ts     # /account/readiness
│   ├── events.ts        # /events, /events/:id, /markets/:id/prices
│   ├── portfolio.ts     # /portfolio/{balance,positions,activity}
│   ├── orders.ts        # /orders/{preview,submit,cancel}
│   └── funding.ts       # /funding/{deposit,withdraw}/{prepare,submit}
└── util/
    └── decimal.ts       # cents <-> decimal string conversions
```

## Endpoint surface

All endpoints are under `/predict/v1/kalshi`. The body shape mirrors the
canonical `VenueAdapter` contract documented in
`app/components/UI/PredictNext/docs/adapters.md` so the mobile remote adapter is
mostly a pass-through.

## Throwaway quality

This backend is intentionally minimal: in-memory stores, no auth between mobile
and backend, no tests, no retry/backoff. It exists to validate the 5 Predict
flows on the Kalshi demo environment.
