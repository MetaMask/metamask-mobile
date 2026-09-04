# Perps TP/SL Attachment

## Overview

There are **two different mechanisms** for putting a take-profit or stop-loss on a Perps
position. They are not interchangeable, they have different failure modes, and they have
different behaviour over the position's lifetime. Choosing between them is a real trade-off,
not a style preference.

This document exists because getting it wrong has already shipped a bug (TAT-3916).

|                               | Order-linked                                                           | Position-linked                                                               |
| ----------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| HyperLiquid grouping          | `normalTpsl`                                                           | `positionTpsl`                                                                |
| Controller entry point        | `placeOrder` with `takeProfitPrice` / `stopLossPrice` in `OrderParams` | `updatePositionTPSL`                                                          |
| Submitted                     | in the **same exchange batch** as the parent order                     | as a **separate request**, after a position exists                            |
| Size sent                     | the parent **order** size, frozen at submission                        | `'0'` — HyperLiquid reads this as **the whole position, whatever it becomes** |
| Requires an existing position | no                                                                     | **yes**                                                                       |
| Races the position stream     | no                                                                     | **yes**                                                                       |
| Survives a later scale-in     | **no** — stays at the original size                                    | **yes** — self-resizing                                                       |
| Correct after a partial fill  | **no** — trigger is larger than the position                           | **yes** — sized to the actual position                                        |

**Neither is strictly better.** Order-linked buys atomicity and loses self-resizing.
Position-linked buys correct sizing over the position's life and loses atomicity.

## The app's decision point

Both order forms compute the same flag:

- `app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx` (Lite)
- `app/components/UI/Perps/Views/PerpsProMarketView/components/PerpsProOrderForm/usePerpsProOrderForm.ts` (Pro)

```js
const shouldHandleTPSLSeparately =
  (takeProfitPrice || stopLossPrice) &&
  ((!currentMarketPosition && orderForm.type === 'market') ||
    (currentMarketPosition &&
      willFlipPosition(currentMarketPosition, orderParams)));
```

`true` → strip TP/SL off the order, place it, then call `updatePositionTPSL`.
`false` → leave TP/SL on `orderParams`; the controller places everything in one batch.

Note that `willFlipPosition` (`app/components/UI/Perps/utils/orderUtils.ts:640`) already
returns `false` for non-market orders and for reduce-only orders. So limit, trigger, TWAP,
chase, scale and reduce-only orders were **never** on the deferred path. The flag really
selects between exactly two situations: _new position via market order_, and _flip_.

## How the controller maps this

### Order-linked (`placeOrder`)

`app/components/UI/Perps/utils/orderParams.ts` → `buildPerpsOrderParams` builds `OrderParams`
and **never sets `grouping` or `tpslLinkage`**. It only attaches TP/SL when `canAttachTpSl` —
not reduce-only, not a trigger type, not a strategy order.

In `@metamask/perps-controller`, `buildOrdersArray` (`dist/utils/orderCalculations.mjs`) then
applies the default:

```js
const finalGrouping =
  grouping ?? ((takeProfitPrice ?? stopLossPrice) ? 'normalTpsl' : 'na');
```

Omitting the field is what selects order-linked placement. Children are built `r: true`
(reduce-only) and sized by `formatTpslSize`, which returns the parent's `formattedSize` for
whole-position TP/SL and clamps any partial size to the parent.

Do **not** pass `tpslLinkage: 'position'` / `grouping: 'positionTpsl'` to `placeOrder` — the
controller rejects it with `ORDER_TPSL_POSITION_LINKAGE_UNSUPPORTED`, because HyperLiquid
requires every order in a `positionTpsl` batch to be a trigger and the parent is not.
`grouping: 'na'` with a TP/SL is rejected with `ORDER_TPSL_LINKAGE_REQUIRED`, because it would
leave orphan reduce-only triggers if the parent never fills.

### Position-linked (`updatePositionTPSL`)

Used by the Auto close sheet on a position card, the stop-loss prompt banner, and the Pro
positions panel — all cases where the position already exists.

Since **perps-controller 15.1.0** it resolves the position like this
(`dist/providers/HyperLiquidProvider.mjs`):

```js
const currentPositions = await #getPositionsForOperation(parseAssetName(symbol).dex ?? '');
const position = currentPositions.find((pos) => pos.symbol === symbol);
if (livePosition && position && sizes differ) { debugLog(...) }
if (!position) { throw new Error(PERPS_ERROR_CODES.POSITION_NOT_FOUND); }
```

Two things matter enormously:

1. **The `position` you pass is diagnostic only.** It is read for a size-mismatch debug log and
   nothing else. Passing a freshly-observed position does **not** make the lookup succeed.
   (Before 15.1.0 it did — the caller's snapshot decided the outcome.)
2. **The lookup is cache-first and fails closed.** `#getPositionsForOperation` returns the
   cached per-DEX slice whenever `getCachedPositionsForDex(dex)` is non-null, and only falls
   back to REST when it is `null`. "Fresh" is a **connection-epoch** check
   (`stampedEpoch === getConnectionEpoch()`), not a recency check — a slice published seconds
   ago stays "fresh" until reconnect. A populated-but-stale slice therefore fails in ~1 ms with
   no network call.

## The trap: "filled" is not "visible"

For market orders, `usePerpsOrderExecution` waits up to
`PERPS_CUF_STREAM_CONFIRM_RACE_MS` (**1000 ms**, `constants/perpsCufTags.ts`) for the position
to render on the stream — then **proceeds regardless of the outcome**. If the fill has not
reached the stream within that window, the subsequent `updatePositionTPSL` reads an
epoch-fresh but pre-fill slice and fails immediately.

Measured on an iOS testnet slot:

```
02:08:20.119  order accepted (orderId 59266439215)
02:08:21.576  updatePositionTPSL -> POSITION_NOT_FOUND     (1 ms, no network call)
02:08:24.108  position rendered  (toast_position_delta_ms: 2849)
```

An empty cache result has **two indistinguishable meanings**:

| Cache says      | Reality                               | Correct response      |
| --------------- | ------------------------------------- | --------------------- |
| no ETH position | closed / liquidated                   | fail closed ✅        |
| no ETH position | filled moments ago, not yet published | wait, or read HTTP ❌ |

The connection epoch guards against _reconnect staleness_, not _propagation latency_.
**Any code calling `updatePositionTPSL` shortly after `placeOrder` sits inside that window.**

## Error-string versions

The user-visible error differs by controller version, which matters when reading bug reports:

| Version  | Thrown value                            |
| -------- | --------------------------------------- |
| ≤ 15.1.0 | `` `No position found for ${symbol}` `` |
| ≥ 16.0.0 | bare code `POSITION_NOT_FOUND`          |

A report quoting _"No position found for ETH"_ was filed against **15.1.0**, not against a
build on 16.x.

**Known latent bug:** `app/components/UI/Perps/utils/translatePerpsError.ts` defines
`NO_POSITION_FOUND_PATTERN = /No position found/i`, which never matches v16's
`POSITION_NOT_FOUND`. The `isNoPositionFoundError` "position already closed" reconcile path in
`usePerpsTPSLUpdate` is therefore silently dead on 16.x, and
`usePerpsTPSLUpdate.test.ts` still asserts the old prose strings, so CI stays green over the
gap.

## Entry-point reachability

Which branch a user hits depends on **position existence and flip**, not on Lite vs Pro. Both
modes contain the identical condition.

Verified at runtime on Lite (iOS, testnet):

- Market details with **no** position → Long/Short present → order form with TP/SL →
  deferred branch.
- Market details with an **open** position → Long/Short are **not in the view tree**
  (`ui.wait_for expected=present` fails); the card offers Close / Modify instead.
- Modify → Add to position passes `hideTPSL: true`, but that is only a **render guard**
  (`PerpsOrderView.tsx`); `usePerpsOrderForm` restores TP/SL from
  `selectPendingTradeConfiguration` regardless, and `usePerpsSavePendingConfig` persists it
  with a 30 s TTL — so a recently-set TP/SL can still ride along on such an order.
- Modify → Reduce position goes to the close flow; `canAttachTpSl` strips TP/SL.
- Modify → Flip opens a confirmation sheet, because `PerpsMarketDetailsView` supplies
  `onReversePosition` — so TP/SL cannot be set on a Lite flip.

**Not verified:** `PerpsOrderBookView` is a second entry point with its own Long/Short and its
own `onReversePosition`, gated behind `selectPerpsOrderBookEnabledFlag`. Its reachability and
behaviour were not exercised.

## Invariants to preserve

1. **Never call `updatePositionTPSL` in the same tick as `placeOrder`.** If you must defer,
   wait for the position on the `PerpsStreamManager` positions channel — it is fed by
   `PerpsController.subscribeToPositions`, the same subscription service backing
   `getCachedPositionsForDex`, so it is a conservative proxy. The existing 1 s bounded wait is
   **not** sufficient.
2. **Do not rely on the `position` argument to `updatePositionTPSL`** to avoid
   `POSITION_NOT_FOUND`. It is diagnostic.
3. **Do not set `grouping` / `tpslLinkage` in `buildPerpsOrderParams`.** The controller default
   is the intended behaviour; `positionTpsl` is rejected on `placeOrder`.
4. **Moving a case between the two mechanisms changes sizing semantics**, not just timing. See
   the comparison table — order-linked protection does not resize with the position.
5. **Any change to the decision flag needs a live test.** The failure is timing-dependent and
   every unit test mocks the position cache as already populated. Note also that Lite has no
   unit coverage that submits an order _with_ TP/SL.

## Open questions requiring a testnet probe

Neither can be settled from source:

1. **Partial fill.** Attached children are sized to the _submitted_ order size, so after a
   partial fill the reduce-only trigger exceeds the position. Does HyperLiquid cap it at
   trigger time, or reject it? `TradingService` computes `isPartiallyFilled` but nothing
   rebinds TP/SL afterwards.
2. **$10 minimum order value on the SL child.** The SL child is its own order in the batch,
   priced below the parent for a long, so its notional is lower. An $11 long with an SL 25 %
   below entry yields an ~$8.80 child. The controller changelog records that reduce-only orders
   rejected for the minimum are no longer retried, and there is no client-side min-notional
   check on attached TP/SL.

## History

- **11.0.0 – 15.0.0**: `updatePositionTPSL` honoured the caller's snapshot, and otherwise did a
  fresh `getPositions({ skipCache: true })` REST read. Deferred attachment worked.
- **15.1.0** ([core#10037](https://github.com/MetaMask/core/pull/10037)) replaced that with the
  cache-first, fail-closed lookup and demoted the caller's snapshot to a log line — to stop a
  _stale_ position driving an oversized reduce-only order (TAT-3252). It did not distinguish
  "closed" from "not published yet".
- Mobile picked it up in
  [#35609](https://github.com/MetaMask/metamask-mobile/pull/35609) (`b9afc6b1f6e`, 2026-09-02);
  TAT-3916 was filed two days later.

See `temp/tasks/fix/tat-3916-0904-094306/artifacts/blame-report.md` for the full bisect.
