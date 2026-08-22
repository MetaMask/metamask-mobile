# Validated Patterns

One entry per failure reason from `react-compiler-marker`. Every entry here has been verified: marker failures dropped to zero and the change passed review.

---

## `React Compiler has skipped optimizing this component because one or more React ESLint rules were disabled`

The compiler skips the **entire component** if any React ESLint rule is disabled anywhere inside it. The reported line is the `eslint-disable` comment, not a defect at that line.

So the only fix is to delete the suppression. That means making the code honest, not re-suppressing elsewhere and not deleting the behavior the suppression protected.

### `exhaustive-deps` disabled to stabilize a value by content

A value is memoized on a derived content key while the factory closes over the original unstable value. The dep list lies, so it was suppressed.

Fix: derive the value *from* the key. The factory then closes over nothing else and the dep list is true.

```tsx
// Before — factory reads popularNetworks, deps list only the key
const popularChainIdsKey = (popularNetworks ?? []).join(',');
const chainIdsForBalance = useMemo<CaipChainId[]>(
  () => [...(popularNetworks ?? [])],
  // popularChainIdsKey stabilizes by content; popularNetworks is a new array ref every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [popularChainIdsKey],
);

// After — factory reads only the key
const popularChainIdsKey = (popularNetworks ?? []).join(',');
const chainIdsForBalance = useMemo<CaipChainId[]>(
  () =>
    popularChainIdsKey ? (popularChainIdsKey.split(',') as CaipChainId[]) : [],
  [popularChainIdsKey],
);
```

Do not "simplify" this to depend on the unstable value directly. The content key exists because ref churn caused a render loop; keeping identity stable across equal contents is the behavior under migration.

Flag the round-trip cast (`split` returns `string[]`) in the report — it is new surface area a reviewer should see.

Verified on `app/components/UI/Assets/components/Balance/AccountGroupBalance.tsx` (1 failure to 0).

### `exhaustive-deps` disabled to add an extra dep

The mirror image: the dep list carries a value the factory never reads, listed on purpose to force recomputation. Here the memo re-anchors `Date.now()` whenever a new price series arrives.

Fix: give the factory a real reason to read the extra dep. A guard clause is usually already justified on its own terms.

```tsx
// Before — prices is listed but never read
const { chartXMin, chartXMax } = useMemo(() => {
  if (!isTimeBased) {
    return { chartXMin: undefined, chartXMax: undefined };
  }
  const now = Date.now();
  return { chartXMin: now - timePeriodMs, chartXMax: now };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isTimeBased, timePeriodMs, prices]);

// After — prices is read, so the dep is honest
const { chartXMin, chartXMax } = useMemo(() => {
  if (!isTimeBased || prices.length === 0) {
    return { chartXMin: undefined, chartXMax: undefined };
  }
  const now = Date.now();
  return { chartXMin: now - timePeriodMs, chartXMax: now };
}, [isTimeBased, timePeriodMs, prices]);
```

Only sound if the new branch is unreachable or harmless. Check every consumer first — both readers here were already null-guarded, so an empty series yielding no domain changed nothing.

Verified on `app/components/UI/AssetOverview/PriceChart/PriceChart.tsx` (revealed 3 further failures, see below).

---

## `Cannot access refs during render`

Broader than it sounds. The compiler rejects all of:

- writing `someRef.current = x` in the render body
- reading `someRef.current` in the render body or JSX
- **passing a ref object into any call during render** — including a `useMemo` factory, which the compiler treats as render-time code

That third one is the surprising one, and it means the "latest ref" pattern cannot be *constructed* during render at all. No amount of rearranging the call helps; the refs have to stop being refs.

Work the ladder in order, re-running the marker after each rung:

0. **Check whether the platform already ships a hook that owns the ref.** A ref you create only to hold one object for the component's lifetime is a generic need, and the library that gave you the object has usually solved it. React Native's `useAnimatedValue` is exactly `useRef(new Animated.Value(x)).current`, minus the render-time `.current` read:

```tsx
// Before
const slideAnim = useRef(new Animated.Value(0)).current;

// After
const slideAnim = useAnimatedValue(0);
```

The ref still exists, one stack frame up inside the hook, where it is opaque to the compiler. Nothing else in the file changes: the value has the same identity and lifetime, so effects, dep arrays, and animation calls all stay as they are. It also fixes the incidental waste in the original, which constructed a throwaway `Animated.Value` on every render.

Prefer this over rung 2 whenever it applies. Rung 2 makes lifetime depend on `useMemo`, which React may discard; a hook wrapping a `useRef` guarantees it — and per "Keep the memoization" below, guarantees are what survive Jest with the compiler off.

Grep the codebase for the hook before adopting it. If it has precedent here it is a rename; if not, you are introducing an API in a migration pass, which needs a mention in the report.

1. **Ref writes during render** move into an effect with no dep array:

```tsx
// Before
const updatePositionRef = useRef(updatePosition);
updatePositionRef.current = updatePosition;

// After
const updatePositionRef = useRef(updatePosition);
useEffect(() => {
  updatePositionRef.current = updatePosition;
});
```

2. **`useRef(createSomething(...))`** becomes `useMemo`. The `useRef` form re-runs the initializer every render and discards the result anyway, so this is a bug fix as well as a compiler fix. Update the read site from `x.current` to `x`.

3. **Config objects whose callbacks touch refs** move to a module-scope factory. Hoisting the callbacks out of the component takes them out of the compiler's render analysis, and it shortens the component body:

```tsx
const createChartPanResponder = ({
  updatePosition,
  setIsChartBeingTouched,
}: ChartPanHandlers) => {
  const prevTouch = { current: { x: 0, y: 0 } };
  return PanResponder.create({ /* handlers */ });
};
```

4. **Per-instance mutable state that only handlers touch** is not React state at all. `prevTouch` above became a plain closure `const` holding a mutable object — no `useRef`, no `let`.

5. **If the factory still needs "latest" values**, stop passing refs and pass the functions, memoizing on them.

### Keep the memoization

Step 5 tempts you to delete the `useMemo` and let the compiler memoize the call. Do not, for two reasons.

`react-hooks/exhaustive-deps` is still enforced here and will error that the function "makes the dependencies of useMemo change on every render". Wrap the function in `useCallback` instead — the lint rule cannot see that the compiler already memoized it.

More importantly, the compiler is **disabled under Jest** (`scripts/react-compiler.js` gates on `NODE_ENV === 'test'`). Anything whose *correctness* depends on compiler memoization behaves differently in tests than in the app. A `PanResponder` that is rebuilt every render loses its gesture state mid-drag, so its stability has to survive without the compiler.

Verified on `app/components/UI/AssetOverview/PriceChart/PriceChart.tsx` (4 failures to 0, ESLint clean, 25 tests passing), and on `SlidingPillToggle.tsx` + `AlertAmountInput.tsx` in `app/components/UI/Assets/PriceAlerts/components` (12 failures to 0 via rung 0 alone, one line each).

The count per site is noise — the same `useRef(new Animated.Value(...)).current` reported 7 failures in one file and 5 in another, one per downstream use. One construct, many diagnostics: fix the construct and they all clear at once, so do not budget effort by failure count.

---

## The try/catch family

Covers three diagnostics, which surface one at a time:

- `(BuildHIR::lowerStatement) Handle TryStatement with a finalizer ('finally') clause`
- `(BuildHIR::lowerStatement) Support ThrowStatement inside of try/catch`
- `Support value blocks (conditional, logical, optional chaining, etc) within a try/catch statement`

(The fourth, `Handle TryStatement without a catch clause`, has its own entry below — its fix is different and the `finally` rewrite here is *wrong* for it.)

| Rejected | Allowed |
| --- | --- |
| `finally` clause | `try` with a `catch` |
| `throw` written inside a `try` | `throw` written outside, *called* from inside |
| ternary, `&&`/`\|\|`, `?.` written as a statement of the `try` block | the same constructs inside a nested function body, or in the `catch` |
| `try` with no `catch` | `if`/`else` and plain calls in the `try` block |

**Every restriction is lexical, and only on the `try` block's own statements.** Two consequences, and the second is easy to get wrong in the cautious direction:

The `catch` body is not checked — it can keep its optional chaining and ternaries untouched. And a `throw` merely has to not *appear* inside the `try`; it may still execute from there.

A **nested function body inside the `try` is not the `try` block.** Optional chaining inside a callback compiles fine:

```ts
try {
  const response = await handleFetch(url);
  setRawTokens(
    POPULAR_TOKENS.map((token) => ({
      ...token,
      price: response[token.assetId]?.price, // fine — inside a .map() arrow
    })),
  );
} catch { /* ... */ }
```

Do not hoist those. Check where the reported line actually sits before touching anything; the diagnostic points at the construct, not at the scope that owns it.

Together this means the reason needs no restructuring at all. Do not rewrite the branching.

In particular, do not convert the request into a helper that returns a boolean instead of throwing, deleting the `try`. The `catch` is a blanket net over the *whole* body — the analytics call, the cache write, the navigation — so branching on a return value silently narrows error handling to just the network call. Nor should you replace the `throw` guards with nested `if`/`else`: it works, but it turns one failure path into three, and the diff stops resembling the original.

Three mechanical substitutions, no control flow changes.

**`throw` moves behind a module-scope function returning `never`.** The `never` annotation preserves TypeScript's narrowing, so the guard still convinces the compiler that `target` is defined afterwards.

```tsx
// Extracted because React Compiler (BuildHIR) cannot lower a `throw` written inside a try/catch.
function failRequest(message: string): never {
  throw new Error(message);
}

// in the try block
if (!target) failRequest('Alert not found');
const response = await deleteAlertByType(target);
if (!response.ok) failRequest(`HTTP ${response.status}`);
```

Comment this one, in a single line that leads with *why it was extracted* and names `BuildHIR` — a bare thrower otherwise reads like indirection for its own sake, and the diagnostic name is what lets the next reader search it and know when the helper can go.

**Value blocks in the `try` get hoisted behind a helper.** Usually this is a repeated optional-chained call. Wrapping it once removes the construct from every `try` at the same time, and reads better than the original:

```tsx
const showToast = useCallback(
  (options: ToastOptions) => {
    toastRef?.current?.showToast(options);
  },
  [toastRef],
);
```

Leave identical calls in `catch` bodies alone unless you are replacing them wholesale — consistency within the file is worth more than a minimal diff here.

For a single-use value block a module-scope helper does the same job, and the file usually has one to match:

```ts
const isNonEvmAssetIgnored = (
  allIgnoredAssets: Record<string, CaipAssetType[] | undefined>,
  accountId: string,
  assetId: CaipAssetType,
) => allIgnoredAssets[accountId]?.includes(assetId) ?? false;
```

Note what this does *not* do: compute the value above the `try`. That is the tempting one-liner, and it quietly moves the read outside the `catch`'s coverage — principle 6. Putting the expression in a helper keeps the *call* inside the `try`, so the protected region is unchanged and only the rejected syntax moved.

(Hoisting above the `try` can be safe when the value is a render snapshot that the hoisted-past statements cannot mutate — but you have to prove that, and the helper is free.)

**`finally` becomes a trailing statement — but only after clearing both preconditions.** A trailing statement runs on strictly fewer paths than a `finally`, so this is the one rewrite in this skill that can silently change behavior. Check both:

1. **The `catch` does not rethrow.** If the `try` throws, `catch` handles it and execution falls through to the next statement. A rethrowing `catch` skips the trailing statement entirely, and the `finally` guarantee was real — flag it instead of rewriting.
2. **Neither the `try` nor the `catch` can exit early past the relocated code** — no `return`, `break`, or `continue`. `finally` runs on those paths; a trailing statement does not. This one is easy to miss because the early exit is often several lines above the `finally`.

If precondition 2 fails, the rewrite is still valid when the relocated statements are provably no-ops on exactly those exit paths — but you have to show it. In `usePopularTokens.ts` both blocks `return` early on `fetchId !== fetchIdRef.current`, and the relocated body is wrapped in `if (fetchId === fetchIdRef.current)`, the exact negation, so the old `finally` did nothing on those paths:

```ts
try {
  // ...
  if (fetchId !== fetchIdRef.current) return; // stale fetch
  setRawTokens(/* ... */);
} catch (err) {
  if (fetchId !== fetchIdRef.current) return; // stale fetch
  setError(/* ... */);
}

// was `finally` — the guard is the negation of both early returns,
// so relocating it out of the finally changes nothing
if (fetchId === fetchIdRef.current) {
  setIsInitialLoading(false);
  setIsRefreshing(false);
}
```

Without that guard — a `finally` that unconditionally ran `setIsRefreshing(false)` — the same rewrite strands the spinner on every superseded fetch. State which precondition you cleared, and how, in the report.

The result should be a diff of substitutions: `throw new Error(x)` to `failRequest(x)`, `finally { cleanup() }` to a trailing `cleanup()`, and a helper swap. If your diff has new branches in it, back up.

The three diagnostics surface in sequence, so the value-block error usually appears only once the `finally` and `throw` errors are gone, and a stale dep array often follows. Not always, though — a file with one `finally` and no other rejected syntax is genuinely done after one edit. Let the marker decide when you are finished rather than digging for a cascade the skill led you to expect.

---

## `Cannot reassign variables declared outside of the component/hook`

A module-scope `let` written from inside the hook — nearly always a hand-rolled cache that outlives the component. The reassignment is what the compiler rejects; the cache itself is fine.

Move the cache **and its writes** into a module-scope function and have the hook call it. Same escape hatch as the `try`/`catch` helpers: module-scope functions are not components or hooks, so nothing inside them is analyzed.

```ts
const nonEvmFilterCache: {
  key: string | null;
  transactions: Transaction[] | null;
} = { key: null, transactions: null };

const getFilteredNonEvmTransactions = (txs, asset) => {
  const key = JSON.stringify({ txCount: txs.length, lastTxId: txs[0]?.id /* ... */ });
  if (nonEvmFilterCache.key === key && nonEvmFilterCache.transactions) {
    return nonEvmFilterCache.transactions;
  }
  const filtered = filterTransactionsForNonEvmAsset(txs, asset);
  nonEvmFilterCache.transactions = filtered;
  nonEvmFilterCache.key = key;
  return filtered;
};
```

Two `let` slots become one `const` object whose fields are assigned. The mutation is still there — a cache cannot exist without it — but it is now named, scoped to the function that owns it, and no longer a binding the rest of the module could reassign. That also retires the `import-x/no-mutable-exports` suppressions the `let`s needed.

Split the pure work out of the cache wrapper (`filterTransactionsForNonEvmAsset` above). The wrapper then reads as exactly what it is, and the `let` accumulator inside the original branching collapses into early returns.

**Pass primitives, not the object.** The hook's `useMemo` listed `asset.chainId`, `asset.address`, `asset.symbol`, `asset.isNative`, `asset.isETH` — reading plain `asset` in the body would make `exhaustive-deps` demand `asset` itself, widening the memo to any new asset identity. Passing a literal of the same five fields keeps every dep entry byte-identical:

```ts
const filteredTransactions = getFilteredNonEvmTransactions(txs, {
  chainId: asset.chainId,
  address: asset.address,
  symbol: asset.symbol,
  isNative: asset.isNative,
  isETH: asset.isETH,
});
```

An unchanged dep array is the proof that a large extraction did not change when the memo recomputes. Type the parameter as a `Pick<...>` of the original so the field list stays honest.

**Land the extraction inside the same build fence.** This block sits in `///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)`, and it uses imports that are themselves fenced — hoisting it to unfenced module scope compiles here and breaks the build that strips `keyring-snaps`. The original `let`s were unfenced only because they referenced nothing fenced. Check the imports your extracted code needs, wrap the extraction in the same fence, and confirm `BEGIN` and `END` counts still match.

Verified on `app/components/UI/TokenDetails/hooks/useTokenTransactions.ts` (2 failures to 0, revealing the logical-test failures below).

---

## `Unexpected terminal kind ... for logical test block`

Reported as `` `logical` `` or `` `optional` ``, and the reported line is the whole expression, which is misleading — only one operand is at fault.

The compiler cannot lower a logical expression whose **test operand** (the left side of `&&`/`||`, evaluated to decide the branch) is itself something that branches. Both of these are rejected:

```ts
// nested logical group in the left operand
(areAddressesEqual(a, x) || areAddressesEqual(b, x)) && chainMatches && notUnapproved

// ?? inside a call in the left operand — the subtler one
areAddressesEqual(from ?? '', selectedAddress ?? '') && tx.nonce === nonce
```

`??` and `?.` branch, so they count even when buried in the arguments of a call. Note the *right* operand is unrestricted: `a === b || (!b && c === d)` compiles untouched, which is why only half of a symmetric-looking condition needs changing.

Fix by hoisting each branching sub-expression into a `const` above the statement, leaving operands that are plain values or calls:

```ts
const fromAddress = from ?? '';
const accountAddress = selectedAddress ?? '';

const involvesSelectedAddress =
  areAddressesEqual(fromAddress, accountAddress) ||
  areAddressesEqual(toAddress, accountAddress);
const matchesCurrentChain =
  chainId === tx.chainId || (!tx.chainId && networkId === tx.networkID);

if (involvesSelectedAddress && matchesCurrentChain && tx.status !== 'unapproved') {
```

A same-operator chain of simple operands (`a && b && c`) is fine, so the hoist does not have to go all the way to nested `if`s. Naming the conjuncts is the whole change, and it is usually the version worth reading anyway.

For an expression-bodied arrow, convert to a block body so there is somewhere to hoist to — that, not the condition, is the only structural edit.

Verified on `app/components/UI/TokenDetails/hooks/useTokenTransactions.ts` (3 occurrences to 0, ESLint and `tsc` clean, 484 tests passing).

---

## `Hooks may not be referenced as normal values`

Check whether it is actually a hook before doing anything. The compiler identifies hooks by name — any identifier matching `use[A-Z]` — so a plain value whose name starts with `use` trips it:

```tsx
useSubscriptPriceFormat={
  advancedChartLineChromePresets.tokenOverview.useSubscriptPriceFormat
}
```

`useSubscriptPriceFormat` is a `boolean` config property and a component prop. There is no hook anywhere in the diagnostic, and no amount of restructuring the reported file will satisfy it — the only fix is renaming the property.

That rename is out of scope for a migration pass: the name spans a presets module, two type files, the component, and a serialized `window.CONFIG` key baked into a webview template string, all owned by another team. Report it as a false positive with the suggested rename and leave the file alone.

The general rule: when a diagnostic names a *rule of React* rather than a syntax the compiler cannot lower, first establish that the code actually breaks the rule.

Seen on `app/components/UI/AssetOverview/Price/Price.advanced.tsx` (not fixed, by design).

---

## `(BuildHIR::lowerStatement) Handle TryStatement without a catch clause`

A `try`/`finally` with no `catch` — nearly always a pull-to-refresh or in-flight flag being reset:

```tsx
const handleDeFiRefresh = useCallback(async () => {
  setRefreshing(true);
  try {
    await refresh();
  } finally {
    setRefreshing(false);
  }
}, [refresh]);
```

**Do not reach for the `finally`-to-trailing-statement rewrite from the try/catch entry above.** That rewrite is sound only because a `catch` swallows the error and execution falls through. Here nothing catches, so a rejected `refresh()` propagates — and a trailing `setRefreshing(false)` would never run, leaving the spinner stuck forever. The `finally` is load-bearing precisely because there is no `catch`.

Move the cleanup to the promise instead. Same guarantee, no `TryStatement`:

```tsx
const handleDeFiRefresh = useCallback(async () => {
  setRefreshing(true);
  await refresh().finally(() => setRefreshing(false));
}, [refresh]);
```

`Promise.prototype.finally` runs on both settle paths and passes the rejection through untouched, so the error still propagates out of the callback exactly as before.

Check one thing before using it: the call must always *return* a promise. `refresh` is declared `() => Promise<void>`, and an `async` function cannot throw synchronously, so `.finally` is guaranteed to attach. If the callee is synchronous, might return `undefined`, or could throw before returning, `.finally` either crashes or never attaches — in that case keep `try`/`finally` and move the whole thing into a module-scope helper instead.

Verified on `app/components/UI/Assets/DeFiPositions/components/DeFiPositionsListV2.tsx` (1 failure to 0, 20 memo blocks, 0 pruned, 54 tests passing). The same shape sits in `DeFiPositionsList.tsx` and `Tokens/index.tsx`.

---

## `Existing memoization could not be preserved`

The compiler reproduces manual memoization only when it can express the same dependencies. It gives up when the written deps are *narrower* than what the body actually reads.

### Optional chaining in the dep array

The common primary cause. The body reads `asset`, but the deps claim to track only a field of it:

```ts
// Before — deps say asset?.chainId, body reads asset
const accountId = useMemo(() => {
  if (!asset?.chainId) return globalAccountId;
  // ...
}, [asset?.chainId, internalAccountByScope, globalAccountId]);

// After — body and deps read the same local
const assetChainId = asset?.chainId;

const accountId = useMemo(() => {
  if (!assetChainId) return globalAccountId;
  // ...
}, [assetChainId, internalAccountByScope, globalAccountId]);
```

Hoisting the optional access above the hook is the whole fix. It is also strictly more correct: `asset?.chainId` as a dep entry was always a promise the code could not keep, since the memo really did re-run whenever `asset` changed identity.

Verified on `app/components/UI/TokenDetails/components/useAssetVisibility.ts` (2 failures to 0, then a hidden value-block failure surfaced — see below).

### As a consequence of another fix

Also seen after extracting `toastRef?.current?.showToast` into a `showToast` helper, which left three dep arrays still listing `toastRef` that the hooks no longer read.

`yarn eslint` names the exact hook and the missing dependency, so run it before guessing. Swap the stale entry for the new one rather than appending.

Preserve odd-looking fallbacks exactly. `response.json().catch(() => [])` resets the cache to empty rather than to `previous`; that asymmetry is behavior, not a typo to tidy up mid-migration.

Verified on `app/components/UI/Assets/PriceAlerts/Views/ManagePriceAlertsView/ManagePriceAlertsView.tsx` (6 failures to 0, ESLint clean, 203 tests passing).
