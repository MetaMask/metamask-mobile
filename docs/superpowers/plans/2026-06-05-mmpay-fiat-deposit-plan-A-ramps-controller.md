# MM Pay Fiat Deposit — Plan A: RampsController best-provider accessor (core)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose ONE public, read-only accessor on `@metamask/ramps-controller` —
`getBestProviderForAsset({ assetId })` — that returns the best `Provider` object for an
asset, **reusing the controller's existing provider-resolution cascade** (so mobile can
read that provider's static buy limits).

**Architecture:** Core `main` already implements the full cascade privately:
`#resolveProviderIdsForQuote` (selected → preferred-from-orders → native/Transak → first
supporting) + `#getSupportingProvidersForRegion` (region+asset filter) + the public
`getQuotes` (already provider-scoped via `preferredProviderIds` / `restrictToKnownOrNativeProviders`).
This plan does NOT add a new cascade. It (1) extracts the single-best-provider pick into a
shared private helper so the existing quote path and the new accessor share one
implementation, and (2) adds the public accessor + messenger action. Purely additive;
existing behavior preserved (verified by existing tests).

**Tech Stack:** TypeScript, `@metamask/base-controller` messenger, Jest.

**Spec:** `docs/superpowers/specs/2026-06-05-mmpay-fiat-deposit-amount-limits-design.md` (Part 0).

**Repo for this plan:** `/Users/amitabh/Dev/consensys/core`, branch `feat/ramps-best-provider-quote` (already created off `origin/main`). Own PR; published as a preview build consumed by mobile Plan B.

**What this plan does NOT do (already exists on main — do not duplicate):**
- A provider-selection cascade — `#resolveProviderIdsForQuote` (RampsController.ts:1996).
- Order-history preference — `#getPreferredProviderIdsFromOrders` (2067).
- Region+asset support filtering — `#getSupportingProvidersForRegion` (1902).
- Provider-scoped quoting — `getQuotes` already resolves + scopes (1808). **No `getBestQuote` is added.**

**Region note:** the accessor resolves region from `this.state.userRegion` (RampsController),
which is GeolocationController-derived. No other region source.

---

## File Structure

- Modify: `packages/ramps-controller/src/RampsController.ts` — extract `#resolveBestSupportingProvider`; add public `getBestProviderForAsset`; add its name to `MESSENGER_EXPOSED_METHODS`.
- Modify: `packages/ramps-controller/src/RampsController-method-action-types.ts` — add the action type.
- Modify: `packages/ramps-controller/src/RampsController.test.ts` — tests for the refactor (behavior unchanged) + the new accessor.
- Modify: `packages/ramps-controller/CHANGELOG.md` — Added entry.
- Modify: `packages/ramps-controller/src/index.ts` — export any new public type if introduced (the method is on the class; export new param/return types if added).

---

### Task 1: Extract `#resolveBestSupportingProvider` (pure refactor, behavior-preserving)

**Files:**
- Modify: `packages/ramps-controller/src/RampsController.ts` (`#resolveProviderIdsForQuote`, ~1996-2055)
- Test: `packages/ramps-controller/src/RampsController.test.ts` (existing `#resolveProviderIdsForQuote`/`getQuotes` tests must still pass)

- [ ] **Step 1: Run the existing tests first to capture green baseline**

Run: `cd /Users/amitabh/Dev/consensys/core && yarn workspace @metamask/ramps-controller run jest --no-coverage src/RampsController.test.ts`
Expected: PASS (record the count). This is the regression guard for the refactor.

- [ ] **Step 2: Extract the single-best pick into a private helper**

Add a private method that returns the chosen supporting `Provider` (or `null`) — the
selected → preferred → native → first-supporting steps, WITHOUT the list-level fallbacks:

```ts
/**
 * Picks the single best provider from a region's supporting set:
 * selected (if supporting) -> preferred (orders/explicit) -> native -> first supporting.
 * Returns null when `supporting` is empty. Pure; no state mutation.
 */
#resolveBestSupportingProvider({
  supporting,
  preferredProviderIds,
}: {
  supporting: Provider[];
  preferredProviderIds?: string[];
}): Provider | null {
  if (supporting.length === 0) return null;

  const { selected } = this.state.providers;
  if (selected && supporting.some((p) => p.id === selected.id)) {
    return supporting.find((p) => p.id === selected.id) ?? null;
  }

  const preferred = preferredProviderIds ?? this.#getPreferredProviderIdsFromOrders();
  for (const preferredId of preferred) {
    const match = supporting.find((p) => p.id === preferredId);
    if (match) return match;
  }

  const native = supporting.find((p) => p.type === 'native');
  if (native) return native;

  return supporting[0];
}
```

Then rewrite `#resolveProviderIdsForQuote` to delegate, preserving its EXACT list-level
behavior (fallback-to-all when unrestricted & nothing supports; `[]` when
`restrictToKnownOrNative` & nothing chosen):

```ts
async #resolveProviderIdsForQuote({ assetId, region, preferredProviderIds, restrictToKnownOrNative }) {
  const { supporting, all } = await this.#getSupportingProvidersForRegion({ assetId, region });
  if (!restrictToKnownOrNative && supporting.length === 0) {
    return all.map((p) => p.id);
  }
  const best = this.#resolveBestSupportingProvider({ supporting, preferredProviderIds });
  if (best) return [best.id];
  return restrictToKnownOrNative ? [] : (supporting.length ? [supporting[0].id] : all.map((p) => p.id));
}
```

> Read the real method (RampsController.ts:1996-2055) and preserve its current semantics
> precisely — the `restrictToKnownOrNative` branch and the "selected provider" short-circuit
> behavior must be identical. The extraction must not change any observable behavior.

- [ ] **Step 3: Run existing tests — must still pass unchanged**

Run: `yarn workspace @metamask/ramps-controller run jest --no-coverage src/RampsController.test.ts`
Expected: PASS, same count as Step 1 (behavior-preserving refactor).

- [ ] **Step 4: Commit**

```bash
git add packages/ramps-controller/src/RampsController.ts
git commit -m "refactor(ramps-controller): extract resolveBestSupportingProvider from quote resolution"
```

---

### Task 2: Public `getBestProviderForAsset` + messenger action

**Files:**
- Modify: `packages/ramps-controller/src/RampsController.ts`
- Modify: `packages/ramps-controller/src/RampsController-method-action-types.ts`
- Modify: `packages/ramps-controller/src/index.ts` (export new param/return types if added)
- Test: `packages/ramps-controller/src/RampsController.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
it('getBestProviderForAsset returns the best supporting provider (read-only)', async () => {
  const controller = makeController({
    providers: { data: [/* native + others supporting ASSET */], selected: PRESET },
    orders: [/* completed order */],
    userRegion: { regionCode: 'us', country: { currency: 'usd' } },
  });
  const result = await controller.getBestProviderForAsset({ assetId: ASSET });
  expect(result?.id).toBe(EXPECTED_ID);
  // purity
  expect(controller.state.providers.selected).toBe(PRESET);
  expect(controller.state.providerAutoSelected).toBe(false);
});

it('getBestProviderForAsset returns null when no provider supports the asset', async () => {
  expect(await controller.getBestProviderForAsset({ assetId: UNSUPPORTED })).toBeNull();
});

it('getBestProviderForAsset is callable via messenger action', async () => {
  expect(await messenger.call('RampsController:getBestProviderForAsset', { assetId: ASSET })).toBeDefined();
});
```

- [ ] **Step 2: Run to verify fail** — `yarn workspace @metamask/ramps-controller run jest --no-coverage src/RampsController.test.ts -t getBestProviderForAsset` → FAIL.

- [ ] **Step 3: Implement the public accessor**

```ts
/**
 * Returns the best provider for an asset in the user's region (read-only), using the
 * same cascade as quote resolution. For consumers that need the provider's static data
 * (e.g. buy limits) without fetching a quote. Does not mutate selection state.
 *
 * @param options - The options.
 * @param options.assetId - CAIP-19 asset type identifier.
 * @param options.region - Optional region override; defaults to the current user region.
 * @returns The best supporting Provider, or null if none supports the asset / no region.
 */
async getBestProviderForAsset({
  assetId,
  region,
}: {
  assetId: string;
  region?: string;
}): Promise<Provider | null> {
  const regionCode = region ?? this.state.userRegion?.regionCode;
  if (!regionCode) return null;
  const { supporting } = await this.#getSupportingProvidersForRegion({ assetId, region: regionCode });
  return this.#resolveBestSupportingProvider({ supporting });
}
```

Add `'getBestProviderForAsset'` to `MESSENGER_EXPOSED_METHODS`; add the action type in
`RampsController-method-action-types.ts` (mirror `getProviders`/`getQuotes`).

> Confirm the `userRegion` field that holds the region code (`regionCode` vs `country`...).
> Read `this.state.userRegion` shape in the controller's state types.

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Typecheck + changelog + commit**

```bash
# CHANGELOG.md: Added — "RampsController.getBestProviderForAsset(...) + RampsController:getBestProviderForAsset action"
git add packages/ramps-controller/src/RampsController.ts packages/ramps-controller/src/RampsController-method-action-types.ts packages/ramps-controller/src/index.ts packages/ramps-controller/src/RampsController.test.ts packages/ramps-controller/CHANGELOG.md
git commit -m "feat(ramps-controller): add getBestProviderForAsset messenger accessor"
```

---

### Task 3: Full package check + publish preview build

- [ ] **Step 1:** `yarn workspace @metamask/ramps-controller run jest --no-coverage` (full package) + `yarn lint` (touched files) + `yarn validate:changelog` → all PASS.
- [ ] **Step 2:** Open the core PR, comment `@metamaskbot publish-preview`, capture `@metamask-previews/ramps-controller@<version>-preview-<sha>` for Plan B.

---

## Notes
- Additive + a behavior-preserving internal refactor; no existing method signature, action,
  or state shape changes; the refactor is guarded by the existing test suite.
- No `getBestQuote`, no new cascade — `getQuotes` already resolves + scopes to the best
  provider; mobile/TPC quote via `getQuotes` (with `restrictToKnownOrNativeProviders` for
  headless gating). The new accessor exists solely so consumers can read the chosen
  provider's static data (limits) without a quote.
