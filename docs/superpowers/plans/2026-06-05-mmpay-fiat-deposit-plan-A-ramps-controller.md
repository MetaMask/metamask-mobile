# MM Pay Fiat Deposit — Plan A: RampsController best-provider/best-quote (core)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two additive, pure-query methods to `@metamask/ramps-controller` —
`getBestProviderForAsset(assetId)` and `getBestQuote(...)` — that centralize provider +
best-quote selection using the controller's own state.

**Architecture:** New methods on `RampsController` (core repo
`/Users/amitabh/Dev/consensys/core/packages/ramps-controller`). They read shared DATA
(`providers.data`, `orders`, `userRegion`) only, never mutate SELECTION state
(`.selected` / `providerAutoSelected`), and require an explicit `assetId`. Registered as
messenger actions via the existing `MESSENGER_EXPOSED_METHODS` mechanism. Purely additive —
no existing method/state/behavior changes.

**Tech Stack:** TypeScript, `@metamask/base-controller` messenger, Jest.

**Spec:** `docs/superpowers/specs/2026-06-05-mmpay-fiat-deposit-amount-limits-design.md` (Part 0, State-management guardrail, Backward-compatibility).

**Repo for this plan:** `/Users/amitabh/Dev/consensys/core` (publishes a preview build consumed by mobile Plan B).

---

## File Structure

- Create: `packages/ramps-controller/src/utils/selectBestProvider.ts` — pure cascade helper (token-support filter → most-recent completed order → Transak → most-reliable supporting → null).
- Create: `packages/ramps-controller/src/utils/selectBestProvider.test.ts`
- Modify: `packages/ramps-controller/src/RampsController.ts` — add `getBestProviderForAsset` + `getBestQuote` methods; add both names to `MESSENGER_EXPOSED_METHODS`.
- Modify: `packages/ramps-controller/src/RampsController-method-action-types.ts` — add action types for the two new methods.
- Modify: `packages/ramps-controller/src/RampsController.test.ts` — controller-level tests (delegation, purity, messenger actions).
- Modify: `packages/ramps-controller/CHANGELOG.md` — changelog entry (required for core packages).

---

### Task 1: Pure `selectBestProvider` cascade helper

**Files:**
- Create: `packages/ramps-controller/src/utils/selectBestProvider.ts`
- Test: `packages/ramps-controller/src/utils/selectBestProvider.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { selectBestProvider } from './selectBestProvider';
import { RampsOrderStatus } from '../types'; // adjust import to actual location

const provider = (id: string, crypto: string[], reliabilityOrder: number) => ({
  id,
  name: id,
  supportedCryptoCurrencies: Object.fromEntries(crypto.map((c) => [c.toLowerCase(), true])),
}) as any;

const ASSET = 'eip155:59144/erc20:0xUSDC';

describe('selectBestProvider', () => {
  it('returns null when no provider supports the asset', () => {
    expect(selectBestProvider({ providers: [provider('moonpay', [], 0)], orders: [], assetId: ASSET })).toBeNull();
  });

  it('prefers the most-recent completed order provider when it supports the asset', () => {
    const providers = [provider('transak', [ASSET], 0), provider('moonpay', [ASSET], 1)];
    const orders = [
      { provider: { id: 'moonpay' }, status: RampsOrderStatus.Completed, createdAt: 200 },
      { provider: { id: 'transak' }, status: RampsOrderStatus.Completed, createdAt: 100 },
    ] as any;
    expect(selectBestProvider({ providers, orders, assetId: ASSET })?.id).toBe('moonpay');
  });

  it('falls back to Transak when no order and Transak supports the asset', () => {
    const providers = [provider('moonpay', [ASSET], 0), provider('transak-native', [ASSET], 1)];
    expect(selectBestProvider({ providers, orders: [], assetId: ASSET })?.id).toBe('transak-native');
  });

  it('falls back to the most-reliable supporting provider (first in list) when no order and no Transak', () => {
    const providers = [provider('moonpay', [ASSET], 0), provider('banxa', [ASSET], 1)];
    expect(selectBestProvider({ providers, orders: [], assetId: ASSET })?.id).toBe('moonpay');
  });

  it('ignores completed-order provider that does not support the asset', () => {
    const providers = [provider('moonpay', [ASSET], 0)];
    const orders = [{ provider: { id: 'transak' }, status: RampsOrderStatus.Completed, createdAt: 100 }] as any;
    expect(selectBestProvider({ providers, orders, assetId: ASSET })?.id).toBe('moonpay');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/amitabh/Dev/consensys/core && yarn workspace @metamask/ramps-controller test src/utils/selectBestProvider.test.ts`
Expected: FAIL (`selectBestProvider` not defined).

- [ ] **Step 3: Implement `selectBestProvider`**

```ts
import type { Provider, RampsOrder } from '../types'; // adjust to actual exports
import { RampsOrderStatus } from '../types';

function supportsAsset(provider: Provider, assetId: string): boolean {
  const map = (provider as { supportedCryptoCurrencies?: Record<string, boolean> })
    .supportedCryptoCurrencies;
  if (!map) return false;
  return map[assetId] === true || map[assetId.toLowerCase()] === true;
}

/**
 * Pure cascade: most-recent completed-order provider -> Transak (native) ->
 * most-reliable supporting provider (providers are backend reliability-sorted) -> null.
 * Filtered to providers that support `assetId`. Reads no controller state.
 */
export function selectBestProvider({
  providers,
  orders,
  assetId,
}: {
  providers: Provider[];
  orders: RampsOrder[];
  assetId: string;
}): Provider | null {
  const supporting = providers.filter((p) => supportsAsset(p, assetId));
  if (supporting.length === 0) return null;

  // 1. Most-recent completed order's provider, if it supports the asset.
  const completed = orders
    .filter((o) => o.status === RampsOrderStatus.Completed && o.provider?.id)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  for (const order of completed) {
    const match = supporting.find((p) => p.id === order.provider?.id);
    if (match) return match;
  }

  // 2. Transak (native) default.
  const transak = supporting.find(
    (p) =>
      p.id?.toLowerCase().includes('transak') ||
      p.name?.toLowerCase().includes('transak'),
  );
  if (transak) return transak;

  // 3. Most-reliable supporting provider = first (list is backend reliability-sorted).
  return supporting[0];
}
```

> Adjust `Provider` / `RampsOrder` / `RampsOrderStatus` imports to their real locations
> (`RampsService.ts` / the package's types barrel). Confirm `supportedCryptoCurrencies` and
> `provider.id`/`name` field names against `RampsService.ts` Provider type.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn workspace @metamask/ramps-controller test src/utils/selectBestProvider.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ramps-controller/src/utils/selectBestProvider.ts packages/ramps-controller/src/utils/selectBestProvider.test.ts
git commit -m "feat(ramps-controller): add pure selectBestProvider cascade helper"
```

---

### Task 2: `RampsController.getBestProviderForAsset` + messenger action

**Files:**
- Modify: `packages/ramps-controller/src/RampsController.ts`
- Modify: `packages/ramps-controller/src/RampsController-method-action-types.ts`
- Test: `packages/ramps-controller/src/RampsController.test.ts`

- [ ] **Step 1: Write failing tests** (in `RampsController.test.ts`)

```ts
it('getBestProviderForAsset returns the cascade result and does not mutate selection', () => {
  // Arrange: controller with region-scoped providers.data + a completed order in state,
  // and a pre-set providers.selected to assert purity.
  const controller = makeController({
    providers: { data: [/* transak + others supporting ASSET */], selected: PRESET_SELECTED },
    orders: [/* completed order */],
    userRegion: REGION,
  });

  const result = controller.getBestProviderForAsset(ASSET);

  expect(result?.id).toBe(EXPECTED_ID);
  // Purity: selection state untouched
  expect(controller.state.providers.selected).toBe(PRESET_SELECTED);
  expect(controller.state.providerAutoSelected).toBe(false);
});

it('getBestProviderForAsset is callable via messenger action', () => {
  const result = messenger.call('RampsController:getBestProviderForAsset', ASSET);
  expect(result).toBeDefined();
});
```

- [ ] **Step 2: Run to verify fail**

Run: `yarn workspace @metamask/ramps-controller test src/RampsController.test.ts -t getBestProviderForAsset`
Expected: FAIL (method/action not defined).

- [ ] **Step 3: Implement the method + register it**

In `RampsController.ts`, add the method (reads state, delegates to the pure helper):

```ts
import { selectBestProvider } from './utils/selectBestProvider';

/**
 * Best provider for an asset, computed from controller state (read-only).
 * Does NOT mutate selection state. Requires explicit assetId.
 */
getBestProviderForAsset(assetId: string): Provider | null {
  return selectBestProvider({
    providers: this.state.providers.data ?? [],
    orders: this.state.orders ?? [],
    assetId,
  });
}
```

Add `'getBestProviderForAsset'` to the `MESSENGER_EXPOSED_METHODS` array (the list near
line 648-670). Add the action type in `RampsController-method-action-types.ts` following
the existing `getProviders`/`getQuotes` pattern:

```ts
export type RampsControllerGetBestProviderForAssetAction = {
  type: `RampsController:getBestProviderForAsset`;
  handler: RampsController['getBestProviderForAsset'];
};
```
and include it in the exported actions union.

- [ ] **Step 4: Run to verify pass**

Run: `yarn workspace @metamask/ramps-controller test src/RampsController.test.ts -t getBestProviderForAsset`
Expected: PASS.

- [ ] **Step 5: Typecheck + commit**

```bash
yarn workspace @metamask/ramps-controller build:types || yarn workspace @metamask/ramps-controller tsc --noEmit
git add packages/ramps-controller/src/RampsController.ts packages/ramps-controller/src/RampsController-method-action-types.ts packages/ramps-controller/src/RampsController.test.ts
git commit -m "feat(ramps-controller): add getBestProviderForAsset messenger method"
```

---

### Task 3: `RampsController.getBestQuote` + messenger action

**Files:**
- Modify: `packages/ramps-controller/src/RampsController.ts`
- Modify: `packages/ramps-controller/src/RampsController-method-action-types.ts`
- Test: `packages/ramps-controller/src/RampsController.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
it('getBestQuote returns the best provider quote from the response', async () => {
  // RampsService:getQuotes mocked to return success quotes for multiple providers.
  const res = await controller.getBestQuote({ assetId: ASSET, amount: 50, paymentMethods: ['debit_credit_card'], walletAddress: WALLET });
  expect(res.quote?.provider).toBe(EXPECTED_PROVIDER_ID); // matches getBestProviderForAsset
});

it('getBestQuote returns the structured error when no success quote', async () => {
  // getQuotes mocked to return { success: [], error: [{ provider, error: 'Minimum is $20', code }] }
  const res = await controller.getBestQuote({ assetId: ASSET, amount: 1, paymentMethods: ['debit_credit_card'], walletAddress: WALLET });
  expect(res.quote).toBeUndefined();
  expect(res.error?.code).toBe('LIMIT_EXCEEDED');
  expect(res.error?.message).toContain('Minimum');
});

it('getBestQuote does not read tokens.selected (requires explicit assetId)', async () => {
  // Set tokens.selected to a DIFFERENT asset; assert getQuotes is called with the explicit assetId.
});
```

- [ ] **Step 2: Run to verify fail**

Run: `yarn workspace @metamask/ramps-controller test src/RampsController.test.ts -t getBestQuote`
Expected: FAIL.

- [ ] **Step 3: Implement `getBestQuote`**

```ts
type GetBestQuoteResult = {
  quote?: Quote;
  error?: { code: 'LIMIT_EXCEEDED' | 'QUOTE_FAILED'; message?: string };
};

/**
 * Best ramps quote for the request (or its structured error), provider chosen via the
 * same cascade as getBestProviderForAsset. Requires explicit assetId; never reads
 * tokens.selected. Does not mutate selection state.
 */
async getBestQuote(options: {
  assetId: string;
  amount: number;
  paymentMethods: string[];
  walletAddress: string;
}): Promise<GetBestQuoteResult> {
  const best = this.getBestProviderForAsset(options.assetId);

  const response = await this.getQuotes({
    assetId: options.assetId,            // explicit — never tokens.selected
    amount: options.amount,
    paymentMethods: options.paymentMethods,
    walletAddress: options.walletAddress,
    ...(best ? { providers: [best.id] } : {}), // NOTE: option is `providers: string[]`
  });

  const quote = response.success?.find(
    (q) => !best || normalizeProviderCode(q.provider) === normalizeProviderCode(best.id),
  ) ?? response.success?.[0];
  if (quote) return { quote };

  // Classify the error (reuse Shane's LIMIT_EXCEEDED vs QUOTE_FAILED approach, PR #31079).
  const first = response.error?.[0];
  const message = typeof first?.error === 'string' ? first.error : undefined;
  const isLimit = !!message && /\b(minimum|maximum|limit)\b/i.test(message) && !/\b(rate|request)\b/i.test(message);
  return { error: { code: isLimit ? 'LIMIT_EXCEEDED' : 'QUOTE_FAILED', message } };
}
```

> `getQuotes` accepts `providers?: string[]` (RampsController.ts:1613-1625) — pass
> `providers: [best.id]`, NOT `provider`. Use the exported **`normalizeProviderCode`**
> helper (RampsController.ts:615, re-exported from `src/index.ts`) to reconcile
> `/providers/...` ids and staging suffixes on both `q.provider` and `best.id`. Do not
> reference `normalizeProviderId` or `QuoteRankingService` — those don't exist in this
> package. The `LIMIT_EXCEEDED`/`QUOTE_FAILED` classifier is **open-coded** here (the regex
> below); PR #31079's version lives in mobile and isn't importable.

Register `'getBestQuote'` in `MESSENGER_EXPOSED_METHODS` and add its action type.

- [ ] **Step 4: Run to verify pass**

Run: `yarn workspace @metamask/ramps-controller test src/RampsController.test.ts -t getBestQuote`
Expected: PASS.

- [ ] **Step 5: Typecheck + changelog + commit**

```bash
# add a CHANGELOG.md entry under the package's Unreleased section
git add packages/ramps-controller/src/RampsController.ts packages/ramps-controller/src/RampsController-method-action-types.ts packages/ramps-controller/src/RampsController.test.ts packages/ramps-controller/CHANGELOG.md
git commit -m "feat(ramps-controller): add getBestQuote messenger method"
```

---

### Task 4: Full package check + publish preview build

- [ ] **Step 1: Run the package's full test + lint + types**

Run: `cd /Users/amitabh/Dev/consensys/core && yarn workspace @metamask/ramps-controller test && yarn workspace @metamask/ramps-controller lint`
Expected: PASS.

- [ ] **Step 2: Open the core PR (or add to the existing fiat PR #8987 if that's the agreed home) and trigger a preview build**

Comment `@metamaskbot publish-preview` on the core PR; capture the published
`@metamask-previews/ramps-controller@<version>-preview-<sha>`. Plan B consumes it.

> Verification of behavior end-to-end happens in mobile (Plan B) + the build the user
> triggers on `test-money-account`.

---

## Notes
- All four method/state touch-points are **additive**; no existing method signature,
  messenger action, or state shape changes (Backward-compatibility section of the spec).
- Mobile `determinePreferredProvider` is NOT touched; this core cascade is its own
  implementation (temporary duplication until UB2 migrates).
