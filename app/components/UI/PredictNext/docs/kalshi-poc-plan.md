# Kalshi Integration POC — Plan

> Status: planning. Goal: prove the five Predict flows (onboarding/KYC, deposit,
> withdraw, trade, and the no-claim/settlement path) end-to-end against the
> Kalshi **demo** environment, while validating that the PredictNext architecture
> can accommodate a second venue. Throwaway quality: minimal UI, no tests.

## 1. Decision Log (resolved)

| # | Decision | Resolution |
|---|----------|-----------|
| 1 | Secret/signing topology | **Remote adapter.** Minimal Node/Express stub backend holds the demo **ISV admin api_key**, mints + stores **per-user PEMs** server-side, performs all RSA-PSS signing, exposes canonical `/predict/v1/kalshi/*` endpoints. Mobile uses a `MetaMaskPredictApiAdapter`-style remote `VenueAdapter`. Secrets never on device. Production-grade backend is future work. |
| 2 | Environment / "e2e" | **Kalshi demo** (`https://demo-api.kalshi.co`), full 5 flows. Payments gate requested via direct Kalshi channel (long pole). Withdraw shown as "initiated" (`transfer_id`); no settlement confirmation needed. |
| 3 | Onboarding surface | **Full canonical Account Setup step renderer**, both **Path A (new-user KYC)** and **Path B (existing-user linking)**. Per-user PEM stored server-side only. Demo KYC fast-path values used. |
| 4 | Deposit rail | **Base Sepolia testnet USDC**. `createDepositPlan` returns a canonical `wallet_transfer` plan carrying the Kalshi one-time deposit **address** + amount. POC does **not** sign/send on-device: the UI shows the address, the user transfers out-of-band (faucet/manual) and **pastes the `tx_hash`**, then `submitFundingFollowUp` runs `/deposit/indication`. Keeps the plan shape canonical; only the execution strategy is POC-simplified (no signer/funded-wallet dependency). |
| 5 | Withdraw rail | Single canonical `Withdraw` = `venue_api` `FundingPlan`. **Register-then-withdraw hidden in backend/adapter.** Default network **base**, payout to user's own MetaMask EVM address. `transfer_id` → `FundingReceipt.venueReference`. |
| 6 | Trade flow | (a) `getOrderPreview` **backend-computed** (price × size + fees), not a venue round-trip. (b) **No auto-deposit chaining** — explicit deposit first; trade path only does a balance check + "insufficient funds". (c) Simple **buy + sell** (FOK/FAK) on one demo market; sell = Cash Out. |
| 7 | Claim | **Not built.** Validate the capability-gated negative path: `supportsClaims:false`, `supportsAutomaticSettlement:true`, `createClaimPlan` → `unsupported` plan, Claim UI hidden by capability flag, resolved winnings → `settlement` `ActivityItem` (best-effort). |
| 8 | Architecture scope | **Five services** (`PredictSessionService`, `MarketDataService`, `PortfolioService`, `TradingService`, `TransactionService` + `FundingExecutor`). Skip `LiveDataService`. No-op `predictAnalytics`. **Self-contained composition root** (own `PredictController` bootstrap + local messenger graph), **not** global `Engine.context`. Reachable from a dev-menu route. |

## 2. Architecture → Kalshi mapping cheat sheet

| Canonical | Kalshi realization |
|-----------|--------------------|
| `VenueAdapter` (remote) | `KalshiAdapter` → backend `/predict/v1/kalshi/*` |
| `PredictClient` | derived session-bound view (session = remote auth context, not venue keys) |
| Account Setup | create/verify-email/profile/phone-otp/verify-phone/verification (+ mint key); link/link-verify for Path B |
| Account Readiness | derived from Kalshi signup status / KYC approved / sub-account provisioned |
| `createDepositPlan` | `wallet_transfer` (Base Sepolia USDC) + `afterSubmit: deposit_indication` |
| `submitFundingFollowUp` | posts `tx_hash` → backend → Kalshi `/deposit/indication` |
| `createWithdrawPlan` | `venue_api` (backend does `/wallet/register` if needed + `/withdraw/crypto`) |
| `createClaimPlan` | `unsupported` (`UNSUPPORTED_VENUE_CAPABILITY`) |
| `getOrderPreview` | backend-computed from market price + size + Kalshi fees |
| `submitOrder` | backend signs `POST /portfolio/orders` with per-user PEM |
| Balance / positions / activity | `GET /portfolio/balance`, `/positions`, `/orders` (per-user PEM) |
| Settlement | resolved winning position → `ActivityItem{type:'settlement'}` |

## 3. Assumptions to confirm before execution

1. **Deposit signer:** ~~app wallet/tx infra~~ → **manual tx_hash entry.** No on-device signing. The deposit view shows the Kalshi one-time address + amount; the user sends out-of-band and pastes the `tx_hash`, which feeds `submitFundingFollowUp` → `/deposit/indication`. No funded-wallet/gas dependency on the app.
2. **Market discovery endpoints:** the ISV spec only covers onboarding/payments/trading-portfolio. Event/market **discovery** (list events, markets, prices) uses Kalshi's **public v2 market-data API** (`/trade-api/v2/events`, `/markets`, `/markets/{ticker}/orderbook`, etc.). Confirm against the public Kalshi API reference; these may be unauthenticated or per-user-key signed.
3. **Backend location:** stub backend lives in a sibling folder (e.g. repo-local `scripts/kalshi-poc-backend/` or a separate dir), reachable from the simulator via a configurable base URL (`http://localhost:PORT` / LAN IP for device).
4. **Admin api_key + per-user key scopes:** mint per-user keys with `["read","write","write::transfer"]` so the same key covers trading **and** withdrawals.

## 4. Phased Task List (one task ≈ one execution run)

Backend first (de-risks the Kalshi API before any mobile work), then the mobile
adapter/session seam, then services, then minimal UI, then an e2e pass.

### Phase B — Stub backend (`/predict/v1/kalshi/*`)

- **B0 — Scaffold + signing core.** Express app, config (admin PEM via env, demo base URL, in-memory user/key stores), RSA-PSS-SHA256 signing helper (pre_sign = `ts_ms + METHOD + PATH`), signed Kalshi HTTP client, error-envelope normalization (nested + the 3 flat shapes). Smoke test: a signed admin call succeeds.
- **B1 — Onboarding (Path A).** Canonical `POST /account/setup/start`, `/account/setup/step`, `GET /account/setup/status` orchestrating create → verify-email → profile → phone-otp → verify-phone → verification, then mint per-user key on approval and store the PEM. Uses demo KYC fast-path values.
- **B2 — Onboarding (Path B) + readiness.** Detect `account_exists` (flat 409 on create / 200 on verify-phone) → `link` + `link/verify`. `GET /account/readiness` derived from signup/KYC state. Distinguish the two 409 variants per spec.
- **B3 — Market data (reads).** `GET /events`, `/events/:id`, `/markets/:id/prices` proxying Kalshi public v2 market endpoints; map cents/contracts → canonical decimal strings.
- **B4 — Portfolio (reads).** `GET /portfolio/balance|positions|activity` signed with per-user PEM; map to canonical shapes; resolved positions → `settlement` activity.
- **B5 — Orders.** `POST /orders/preview` (computed), `/orders/submit`, `/orders/cancel` → Kalshi `/portfolio/orders`; translate canonical decimal ↔ Kalshi cents/contracts; never send a `subaccount` field.
- **B6 — Funding.** `POST /funding/deposit/prepare` (`/deposit/crypto-addresses`, base network) + `/funding/submit` (`/deposit/indication`). `POST /funding/withdraw/prepare` (idempotent `/wallet/register` + `/wallet/payout-methods` reuse) + withdraw (`/withdraw/crypto`).

### Phase M — Mobile adapter + session seam (`PredictNext/`)

- **M0 — Types + contract scaffolding.** `types/`, `adapters/types.ts` (`VenueAdapter` + derived `PredictClient` + `FundingPlan` etc. — reuse the doc contract), `KalshiCapabilities`, `PredictError`/`PredictErrorCode`, venue config, backend API client, dev-menu route/entry.
- **M1 — `KalshiAdapter` reads + transforms.** Implement read methods (events/markets/prices/positions/balance/activity/readiness) against the backend; transform to canonical entities.
- **M2 — `KalshiAdapter` writes + plans.** `getOrderPreview`, `submitOrder`, `createDepositPlan` (wallet_transfer + indication follow-up), `createWithdrawPlan` (venue_api), `createClaimPlan` (unsupported), `submitFundingFollowUp`, `createSession`.
- **M3 — `PredictSessionService` (BaseController).** `getClient`, session cache, readiness slice + `AccountReadinessPolicy`, **Account Setup workflow** (`startAccountSetup`/`submitAccountSetupStep`/`resumeAccountSetup`) bridging to backend setup endpoints.
- **M4 — Composition root + primitives.** POC `PredictController` (initialize/destroy), local messenger graph, `FundingExecutor` (deposit: surface address + accept manual `tx_hash` → `submitFundingFollowUp`; withdraw: `venue_api` passthrough), no-op `predictAnalytics`.

### Phase S — Services

- **S1 — Read services.** `MarketDataService` + `PortfolioService` (BaseDataService) minimal: events/prices; balance/positions/activity; read-model writer interfaces.
- **S2 — Write services.** `TradingService` (order state machine IDLE→PREVIEWING→PLACING_ORDER→SUCCESS/ERROR, balance check, read-model writer calls) + `TransactionService` (deposit/withdraw via `FundingExecutor`).

### Phase U — Minimal UI (dev-menu reachable)

- **U1 — Account Setup view.** Canonical step renderer (email_otp/phone_otp/profile_form/status_wait/complete + link path).
- **U2 — Deposit view.** Amount → plan (shows Kalshi one-time address) → user sends out-of-band → paste `tx_hash` → indication follow-up → balance reflects prefund.
- **U3 — Withdraw view.** Amount → venue_api withdraw → show `transfer_id`.
- **U4 — Markets + Trade view.** List events, pick one market, preview + buy, then sell (Cash Out). Claim hidden by capability flag.
- **U5 — Portfolio view.** Balance, positions, activity (incl. any `settlement`).

### Phase V — Validation

- **V1 — e2e pass.** Walk all five flows on demo; record results, gaps, and architecture findings (what fit, what strained) back into this doc / an ADR.

## 5. Critical path / sequencing notes

- **Payments gate** (Kalshi support) is the long pole — request now; B6/U2/U3 are blocked on it.
- Backend B0→B2 unblocks onboarding (U1) independent of payments.
- Deposit (U2) needs Base Sepolia testnet USDC available out-of-band to send to the one-time address (manual tx_hash entry; no app-side signing).
- Build order respects dependencies: B0–B2 → M0–M3 → U1 (onboarding) can demo before payments lands; B3–B5/M1–M2/S → U4 (trade) needs a funded sub-account (deposit) to fully fill.
