# Kalshi POC — Run guide

Companion to [`kalshi-poc-plan.md`](./kalshi-poc-plan.md). Walks through firing
up the stub backend and the mobile PredictNext POC screen, then through each
of the five flows on Kalshi demo.

## 0. Prereqs

- Kalshi demo ISV admin **api_key_id** + **PEM** (request from Kalshi).
- Kalshi payments gate enabled for the demo user you're about to onboard
  (request from Kalshi support — this is the long pole for the deposit and
  withdraw flows; onboarding and trading work without it).
- Base Sepolia testnet USDC in some external wallet you can transfer from
  (for the deposit step).
- Node 20.18+.

## 1. Backend

```bash
cd scripts/kalshi-poc-backend
cp .env.example .env

# Paste the admin api_key_id into .env, drop the PEM into ./admin.pem (or
# inline it with KALSHI_ADMIN_PEM=).
yarn install   # or: npm install
yarn dev
```

Sanity-check signing with:

```bash
curl http://localhost:8080/health
```

The server logs each Kalshi call when `KALSHI_DEBUG=true`.

## 2. Mobile

The POC adds a single screen registered as `Routes.PREDICT_NEXT_POC`
(`'PredictNextPoc'`) inside `MainNavigator`, plus a launcher under:

> **Settings → Developer Options → PredictNext (Kalshi POC) → Open Kalshi POC**

(Developer Options is gated behind tapping the version number ~5× on
`Settings → About`.) From code you can also navigate directly:

```ts
navigation.navigate(Routes.PREDICT_NEXT_POC);
```

iOS simulator can hit `http://localhost:8080` directly. Android emulator needs
`http://10.0.2.2:8080`; a real device on the same LAN needs your machine's LAN
IP. The screen has a `backend` field at the top for live override.

The screen owns one `PredictController` and renders five tabs:

| Tab        | What it exercises                                                                 |
|------------|----------------------------------------------------------------------------------|
| Setup      | Path A new-user KYC, Path B existing-user link, demo fast-path profile           |
| Deposit    | `createDepositPlan` + manual `tx_hash` paste → `/deposit/indication`             |
| Withdraw   | `createWithdrawPlan` venue_api (register + crypto withdraw under the hood)        |
| Markets    | `fetchEvents`, `getOrderPreview`, `submitOrder` (buy + sell FOK)                  |
| Portfolio  | `fetchBalance`, `fetchPositions`, `fetchActivity` (incl. settlement)              |

The `Claim` flow is intentionally absent — Kalshi capability flag
`supportsClaims: false`. Resolved positions surface as `settlement` rows in the
activity list.

## 3. End-to-end pass

1. **Onboarding (Path A).** Open Setup tab → "Start". Email OTP `888888` →
   Verify email. The profile form is pre-filled with the demo KYC fast-path
   (`first_name="test trigger"`, `last_name="approved"`, phone
   `+18888888888`, SSN `777777777`). Submit profile → phone OTP `888888` →
   verify. Auto-runs `/verification` and `/api-keys` mint. Final step
   `complete`, readiness flips to `ready`.

2. **Onboarding (Path B).** Use an email or phone that already exists on
   Kalshi demo. The backend transitions to `link_verify`; enter the 2FA code
   from the Kalshi-side delivery channel; the backend mints the per-user PEM
   on `link/verify`.

3. **Deposit.** Deposit tab → amount → "Prepare deposit". Copy the displayed
   address. Send Base Sepolia USDC from any wallet/faucet. Paste the tx hash
   back into the form → "Submit tx hash → indication". The receipt shows
   `prefunded`; switch to Portfolio and refresh — balance reflects the
   prefund.

4. **Trade.** Markets tab → an open event → pick a market outcome → preview →
   place buy (FOK). Switch sides to "sell" → preview → place to cash out.

5. **Withdraw.** Withdraw tab → amount + destination address (defaults to the
   active MetaMask account) → submit. UI surfaces the `transfer_id`.

6. **No-claim / settlement.** Once any held position resolves on demo, the
   Portfolio tab's activity list shows a row with `type === 'settlement'`.
   No manual Claim affordance is shown — capability-gated.

## 4. What this POC validates (and what it doesn't)

**Validated:**

- The canonical `VenueAdapter` contract carries Kalshi without venue branches
  leaking above the adapter seam.
- `createDepositPlan`'s `wallet_transfer + afterSubmit` shape is the right
  vehicle for Kalshi's prefunding postback.
- `createWithdrawPlan` as a `venue_api` plan lets the backend hide the
  register-then-withdraw two-step.
- Account Setup is a single canonical workflow with two paths; the mobile
  surface stays unaware of Path A vs Path B except for label cosmetics.
- Capability gating (`supportsClaims: false`,
  `supportsAutomaticSettlement: true`) collapses Kalshi's no-claim path
  without service-layer branching.

**Not validated:**

- On-device signer wiring for the deposit transaction (POC pastes a hash
  manually instead).
- Live data subscriptions (`createSubscription` deliberately not implemented).
- Multi-active-venue selection — `PredictSessionService` is hard-coded to one
  KalshiAdapter.
- BaseController-based stateful services (`Observable` stand-in noted in
  `session/Observable.ts`).

These are intentional skips per `kalshi-poc-plan.md` §1.

## 5. As-built deviations from the plan

| Plan item | As-built |
|-----------|----------|
| `PredictSessionService (BaseController)` | Vanilla `Observable<State>` base. Same product behavior; not wired into `Engine.context`. Documented in `session/Observable.ts`. |
| Withdraw `prepare` step | Adapter calls `/funding/withdraw/submit` directly; backend executes register + withdraw inline and the returned `venue_api` plan already carries the `transfer_id`. The `prepare` endpoint exists on the backend but is unused. |
| Predict types coverage | POC types/index.ts ships a Kalshi-only subset of canonical PredictNext types. Polymarket-specific extensions and sports/series metadata are not declared. |
| `LiveDataService` | Skipped per plan decision 8. |
| Tests | None per plan ("throwaway quality"). |
