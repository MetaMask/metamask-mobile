# BN.js to BigInt Migration Guide

This guide covers migrating call-sites from the legacy `app/util/number/index.js` (BN.js-based) to the new `app/util/number/bigint.ts` (native BigInt-based).

## Why migrate?

- **Performance**: Native `BigInt` is a V8 primitive — no library overhead, no object allocation per operation.
- **Bundle size**: Removes `bnjs4` and `number-to-bn` from the dependency graph.
- **Type safety**: `bigint` is a first-class TypeScript type with compile-time checks. No more `as any` casts.
- **Simpler API**: Arithmetic uses native operators (`+`, `-`, `*`, `/`, `>`, `===`) instead of method chains (`.add()`, `.sub()`, `.mul()`, `.div()`, `.gt()`, `.eq()`).

## Quick start

```ts
// BEFORE
import { hexToBN, BNToHex, weiToFiatNumber } from '../util/number';

const balance = hexToBN(balanceHex);
const staked = hexToBN(stakedHex);
const total = balance.add(staked);
const fiat = weiToFiatNumber(total.toString('hex'), rate, 2);

// AFTER
import {
  hexToBigInt,
  bigIntToHex,
  weiToFiatNumber,
} from '../util/number/bigint';

const balance = hexToBigInt(balanceHex);
const staked = hexToBigInt(stakedHex);
const total = balance + staked;
const fiat = weiToFiatNumber(total, rate, 2);
```

## Import change

```ts
// BEFORE — legacy BN.js module
import { hexToBN, BNToHex, fromWei, toWei, ... } from '../util/number';
// or
import { hexToBN, BNToHex, fromWei, toWei, ... } from '../util/number/index';

// AFTER — BigInt module
import { hexToBigInt, bigIntToHex, fromWei, toWei, ... } from '../util/number/bigint';
```

## Function mapping (A → Z)

| Legacy (`index.js`)                 | BigInt (`bigint.ts`)                | Notes                                                                                                                  |
| ----------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `hexToBN(hex)`                      | `hexToBigInt(hex)`                  | Returns `bigint` instead of `BN`                                                                                       |
| `BNToHex(bn)`                       | `bigIntToHex(bi)`                   | Accepts `bigint`, returns `0x`-prefixed string                                                                         |
| `safeBNToHex(value)`                | `safeBigIntToHex(value)`            | Null-safe wrapper                                                                                                      |
| `safeNumberToBN(value)`             | `safeNumberToBigInt(value)`         | Truncates decimals, returns `bigint`                                                                                   |
| `isBN(value)`                       | `isBigInt(value)`                   | Checks `typeof value === 'bigint'`                                                                                     |
| `toBN(value)`                       | `BigInt(value)`                     | Direct native constructor                                                                                              |
| `fromWei(value, unit)`              | `fromWei(value, unit)`              | Same API, accepts `bigint` input                                                                                       |
| `toWei(value, unit)`                | `toWei(value, unit)`                | Returns `bigint` instead of `BN`                                                                                       |
| `fromTokenMinimalUnit(v, d)`        | `fromTokenMinimalUnit(v, d)`        | Same API, accepts `bigint` input                                                                                       |
| `toTokenMinimalUnit(v, d)`          | `toTokenMinimalUnit(v, d)`          | Returns `bigint` instead of `BN`                                                                                       |
| `renderFromWei(v)`                  | `renderFromWei(v)`                  | Identical API and output                                                                                               |
| `renderFromTokenMinimalUnit(v, d)`  | `renderFromTokenMinimalUnit(v, d)`  | Identical API and output                                                                                               |
| `weiToFiat(wei, rate, currency)`    | `weiToFiat(wei, rate, currency)`    | Accepts `bigint` directly (no `.toString()` needed)                                                                    |
| `weiToFiatNumber(wei, rate, dec)`   | `weiToFiatNumber(wei, rate, dec)`   | Accepts `bigint` directly                                                                                              |
| `balanceToFiat(...)`                | `balanceToFiat(...)`                | Same API                                                                                                               |
| `balanceToFiatNumber(...)`          | `balanceToFiatNumber(...)`          | Same API                                                                                                               |
| `fiatNumberToWei(fiat, rate)`       | `fiatNumberToWei(fiat, rate)`       | Returns `bigint` instead of `BN`                                                                                       |
| `fiatNumberToTokenMinimalUnit(...)` | `fiatNumberToTokenMinimalUnit(...)` | Returns `bigint` instead of `BN`                                                                                       |
| `addHexPrefix(str)`                 | `addHexPrefix(str)`                 | **Behavior diverges for uppercase `0X` prefixes** (legacy bug fixed in bigint) — see note below                        |
| `renderNumber(str)`                 | `renderNumber(str)`                 | **Behavior diverges for integer strings** — see note below                                                             |
| `toHexadecimal(dec)`                | `toHexadecimal(dec)`                | `null`/`undefined` pass through (same as legacy); minor difference for other falsy inputs (`0`, `''`) — see note below |
| `isZeroValue(v)`                    | `isZeroValue(v)`                    | Same behavior, also accepts `bigint`                                                                                   |
| `calculateEthFeeForMultiLayer(p)`   | `calculateEthFeeForMultiLayer(p)`   | Same API                                                                                                               |
| `conversionUtil(...)`               | `conversionUtil(...)`               | Same API                                                                                                               |

Functions with **identical names** (e.g. `fromWei`, `renderFromWei`) have the same API — just change the import path.

### `renderNumber` behavior change

The bigint `renderNumber` fixes a long-standing bug in the legacy implementation:

```ts
// Legacy (index.js): if (index === 0) return number;
// BigInt (bigint.ts): if (index === -1) return number;
```

`indexOf('.')` returns `-1` when the string has no decimal point, not `0`. The
legacy check is a typo, so for integer-only strings legacy falls through to
`substring(0, -1 + 6)` which truncates the value to its first 5 characters.

| Input           | Legacy output | BigInt output |
| --------------- | ------------- | ------------- |
| `'1.123456789'` | `'1.12345'`   | `'1.12345'`   |
| `'1.123'`       | `'1.123'`     | `'1.123'`     |
| `'12345'`       | `'12345'`     | `'12345'`     |
| `'123456'`      | `'12345'` ⚠️  | `'123456'`    |
| `'123456789'`   | `'12345'` ⚠️  | `'123456789'` |
| `'.123'`        | `'.123'`      | `'.123'`      |

In practice this affects integer-valued crypto amounts ≥ 100,000 displayed by
the Ramp / Bridge / Deposit notification flows (the only call sites). Migrating
to the bigint version will cause those values to render with their full integer
portion instead of being silently chopped to 5 characters. This is a fix, but
it is a visible behavioral change — verify your feature tolerates it before
switching.

### `addHexPrefix` behavior change

The bigint `addHexPrefix` fixes another long-standing bug in the legacy
implementation: how it handles uppercase `0X` prefixes.

```js
// Legacy (index.js)
export const addHexPrefix = (str) => {
  if (typeof str !== 'string' || str.match(regex.hexPrefix)) {
    return str; // (1)
  }

  if (str.match(regex.hexPrefix)) {
    // (2) unreachable — same regex as (1)
    return str.replace('0X', '0x');
  }

  if (str.startsWith('-')) {
    return str.replace('-', '-0x'); // (3) runs even for '-0X…'
  }

  return `0x${str}`; // (4) runs for '0X…'
};
```

`regex.hexPrefix` is `/^-?0x/u` — case-sensitive. So the early-return at
(1) only matches lowercase `0x` / `-0x`; uppercase variants fall through.
Branch (2) repeats the same regex, so it can never run, and the intended
`0X → 0x` normalization is unreachable. Uppercase inputs end up in (3) or
(4), producing malformed strings.

The bigint version replaces (2) with `str.match(/^-?0X/u)` so uppercase
prefixes are correctly normalized to lowercase before returning.

| Input       | Legacy output    | BigInt output |
| ----------- | ---------------- | ------------- |
| `'0x1a2b'`  | `'0x1a2b'`       | `'0x1a2b'`    |
| `'1a2b'`    | `'0x1a2b'`       | `'0x1a2b'`    |
| `'-1a2b'`   | `'-0x1a2b'`      | `'-0x1a2b'`   |
| `'0X1A2B'`  | `'0x0X1A2B'` ⚠️  | `'0x1A2B'`    |
| `'-0X1A2B'` | `'-0x0X1A2B'` ⚠️ | `'-0x1A2B'`   |

In practice, all known production call sites pass lowercase hex strings (or
strings that don't start with a prefix at all), so the divergence is unlikely
to affect production. But because the parity tests for these inputs are
[`describe.skip`'d as a known-divergent case](../app/util/number/bigint-parity.test.ts),
the bigint version is **not** a guaranteed-identical drop-in for `addHexPrefix`
when callers might pass uppercase `0X` prefixes — verify your input shape
before migrating.

## Arithmetic migration

BN.js uses method chains. Native BigInt uses operators.

```ts
// Addition
bn1.add(bn2)          →  bi1 + bi2

// Subtraction
bn1.sub(bn2)          →  bi1 - bi2

// Multiplication
bn1.mul(bn2)          →  bi1 * bi2

// Division (integer)
bn1.div(bn2)          →  bi1 / bi2

// Modulo
bn1.mod(bn2)          →  bi1 % bi2

// Negation
bn1.neg()             →  -bi1

// Absolute value
bn1.abs()             →  bigIntAbs(bi1)   // or: bi1 < 0n ? -bi1 : bi1

// Exponentiation
bn1.pow(bn2)          →  bi1 ** bi2
```

## Comparison migration

```ts
// Equality
bn1.eq(bn2)           →  bi1 === bi2

// Greater than
bn1.gt(bn2)           →  bi1 > bi2

// Greater than or equal
bn1.gte(bn2)          →  bi1 >= bi2

// Less than
bn1.lt(bn2)           →  bi1 < bi2

// Less than or equal
bn1.lte(bn2)          →  bi1 <= bi2

// Zero check
bn1.isZero()          →  bi1 === 0n
```

## Conversion / serialization

```ts
// To decimal string
bn.toString(10)       →  bi.toString(10)    // or bi.toString()

// To hex string
bn.toString(16)       →  bi.toString(16)
bn.toString('hex')    →  bi.toString(16)

// To 0x-prefixed hex
BNToHex(bn)           →  bigIntToHex(bi)

// From 0x-prefixed hex
hexToBN(hex)          →  hexToBigInt(hex)
```

## Common migration patterns

### Pattern 1: Hex balance → fiat

```ts
// BEFORE
const balanceBN = hexToBN(balanceHex);
const stakedBN = hexToBN(stakedHex || '0x00');
const totalHex = balanceBN.add(stakedBN).toString('hex');
const fiat = weiToFiatNumber(totalHex, conversionRate, 2);

// AFTER
const balance = hexToBigInt(balanceHex);
const staked = hexToBigInt(stakedHex || '0x00');
const fiat = weiToFiatNumber(balance + staked, conversionRate, 2);
```

### Pattern 2: Native ETH send (value encoding)

```ts
// BEFORE
import { BNToHex, toWei } from '../util/number';
trxnParams.value = BNToHex(toWei(value ?? '0'));

// AFTER
import { bigIntToHex, toWei } from '../util/number/bigint';
trxnParams.value = bigIntToHex(toWei(value ?? '0'));
```

### Pattern 3: ERC-20 token amount encoding

```ts
// BEFORE
import { BNToHex, toTokenMinimalUnit } from '../util/number';
const amount = toTokenMinimalUnit(value, decimals);
const data = generateTransferData('transfer', {
  toAddress: to,
  amount: BNToHex(amount),
});

// AFTER
import { bigIntToHex, toTokenMinimalUnit } from '../util/number/bigint';
const amount = toTokenMinimalUnit(value, decimals);
const data = generateTransferData('transfer', {
  toAddress: to,
  amount: bigIntToHex(amount),
});
```

### Pattern 4: Zero check on hex balance

```ts
// BEFORE
hexToBN(stakedBalance).isZero();

// AFTER
hexToBigInt(stakedBalance) === 0n;
```

### Pattern 5: Fiat display for a balance

```ts
// BEFORE
weiToFiat(hexToBN(balance) as any, rate, 'usd');

// AFTER
weiToFiat(hexToBigInt(balance), rate, 'usd');
```

### Pattern 6: Rendering wei for display

```ts
// BEFORE & AFTER are identical — renderFromWei accepts hex strings directly:
renderFromWei(balanceHex);
```

## Gotchas

### 1. BigInt cannot mix with Number in arithmetic

```ts
// ERROR — will throw at runtime
const result = 1n + 2;

// CORRECT — both operands must be the same type
const result = 1n + 2n;
const result = 1n + BigInt(someNumber);
```

### 2. BigInt division truncates (no decimals)

```ts
// BigInt division is integer division
5n / 2n === 2n; // not 2.5

// For fractional results, convert to string first then use BigNumber or parseFloat
const ethString = fromWei(weiBigInt); // returns string like "1.5"
const ethFloat = parseFloat(ethString);
```

### 3. BigInt cannot be serialized to JSON directly

```ts
JSON.stringify(1n); // throws TypeError

// Convert to string or number first
JSON.stringify(bi.toString());
JSON.stringify(Number(bi)); // only safe for values < 2^53
```

### 4. BigInt is not `instanceof` anything

```ts
// BN.js
value instanceof BN; // works

// BigInt
value instanceof BigInt; // ERROR — BigInt is not a constructor
typeof value === 'bigint'; // correct check
isBigInt(value); // utility from bigint.ts
```

### 5. BigInt comparisons use `===`, not `.eq()`

```ts
// BigInt literals need the n suffix
if (balance === 0n) { ... }   // correct
if (balance === 0) { ... }    // always false — different types
if (balance == 0) { ... }     // works but avoid loose equality
```

### 6. `toWei` / `toTokenMinimalUnit` return `bigint`, not `BN`

If your code chains BN methods on the result, you need to switch to BigInt operators:

```ts
// BEFORE
toWei('1').add(toWei('2'));

// AFTER
toWei('1') + toWei('2');
```

### 7. `toHexadecimal` falsy-input handling

Both the legacy and BigInt versions pass `null` and `undefined` through unchanged
— there is **no divergence** for those inputs.

The implementations differ for **non-null falsy inputs**:

| Input       | Legacy       | BigInt         |
| ----------- | ------------ | -------------- |
| `null`      | `null`       | `null`         |
| `undefined` | `undefined`  | `undefined`    |
| `0`         | `0` (number) | `'0'` (string) |
| `''`        | `''`         | `'0'`          |

Legacy short-circuits via `if (!decimal) return decimal;`, so any falsy value
is passed through as-is (including the raw number `0` and the empty string).
BigInt narrows that guard to `decimal == null`, so `0` and `''` fall through
to `BigInt(String(decimal)).toString(16)` and produce the string `'0'`.

In practice all known call sites pass non-empty hex / decimal strings, so this
divergence is unlikely to affect production. If your call site can pass raw
`0` or `''` and downstream code distinguishes them from `'0'`, normalize the
input before switching imports.

## Migration checklist

For each file you migrate:

1. [ ] Change imports from `../util/number` (or `../util/number/index`) to `../util/number/bigint`
2. [ ] Replace `hexToBN` → `hexToBigInt`, `BNToHex` → `bigIntToHex`
3. [ ] Replace BN method chains with native operators (`+`, `-`, `*`, `===`, `>`, etc.)
4. [ ] Replace `.isZero()` with `=== 0n`
5. [ ] Replace `.toString('hex')` with `.toString(16)` or `bigIntToHex()`
6. [ ] Remove any `as any` or `as unknown as BN` casts (no longer needed)
7. [ ] Update type annotations from `BN` to `bigint`
8. [ ] Run `yarn jest <your-file>` to confirm tests pass
9. [ ] Run `yarn lint:tsc` to confirm no type errors

## Parity tests

Two test suites verify that the BigInt module produces identical results to the legacy module:

- **`app/util/number/bigint-parity.test.ts`** — Function-by-function parity (94 tests)
- **`app/util/number/bigint-migration-reference.test.ts`** — Call-site-specific migration patterns

Run them to confirm the safety net is green before and after your migration:

```bash
yarn jest app/util/number/bigint-parity.test.ts
yarn jest app/util/number/bigint-migration-reference.test.ts
```

## Files identified for migration

These are the hot-path call-sites identified so far (see `bigint-migration-reference.test.ts` for exact before/after patterns):

| #   | File                                                               | Pattern                                                    |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| 1   | `app/core/Engine/Engine.ts`                                        | `hexToBN` + `.add()` + `weiToFiatNumber`                   |
| 2   | `app/components/hooks/useGetTotalFiatBalanceCrossChains.tsx`       | Same as #1, in a loop                                      |
| 3   | `app/selectors/multichain/evm.ts`                                  | `hexToBN` + `weiToFiat` + `.isZero()`                      |
| 4   | `app/selectors/assets/assets-list.ts`                              | `hexToBN` + `weiToFiatNumber` + `fromWei`                  |
| 5   | `app/selectors/earnController/earn/index.ts`                       | `hexToBN` + conditional selection + `weiToFiatNumber`      |
| 6   | `app/components/Views/confirmations/context/send-context/utils.ts` | `BNToHex(toWei(...))` + `BNToHex(toTokenMinimalUnit(...))` |
| 7   | `app/components/UI/Ramp/Aggregator/hooks/useBalance.ts`            | `hexToBN`                                                  |
| 8   | `app/components/UI/Stake/hooks/useBalance.ts`                      | `hexToBN`                                                  |
