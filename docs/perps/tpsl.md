# Perps TP/SL in Mobile

The two TP/SL mechanisms (order-linked via `placeOrder`, position-linked via `updatePositionTPSL`), their sizing, the position lookup and the error codes are in the [Core TP/SL doc](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/tpsl.md). This page covers where Mobile picks one and which hooks call it.

## The decision flag

Both order forms compute `shouldHandleTPSLSeparately`.

| Form                        | Condition                                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lite, `PerpsOrderView`      | `(takeProfitPrice \|\| stopLossPrice) && ((!currentMarketPosition && type === 'market') \|\| (currentMarketPosition && willFlipPosition(currentMarketPosition, orderParams)))` |
| Pro, `usePerpsProOrderForm` | The same, plus `!isTwapOrder && !reduceOnly && !isTriggerOrderType(type) && type !== 'chase'`                                                                                  |

The extra Pro guards do not change the outcome for market orders or flips. `willFlipPosition` already returns `false` for reduce-only and non-market orders. So limit, trigger, TWAP, chase, scale and reduce-only orders never take the separate path. The flag selects between a new position from a market order and a flip.

| Flag    | What the form does                                                                                                                                                                                             |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `true`  | Removes `takeProfitPrice` and `stopLossPrice`, places the order, then calls `updatePositionTPSL({ symbol, takeProfitPrice, stopLossPrice })` with no `position`. A failed TP/SL update shows `updateTPSLError` |
| `false` | Leaves TP/SL on `orderParams`. The controller places everything in one batch                                                                                                                                   |

Code: `app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx` `shouldHandleTPSLSeparately`; `app/components/UI/Perps/Views/PerpsProMarketView/components/PerpsProOrderForm/usePerpsProOrderForm.ts` `shouldHandleTPSLSeparately`; `app/components/UI/Perps/utils/orderUtils.ts` `willFlipPosition`

## Building order params

`buildPerpsOrderParams` builds `OrderParams` for both forms. It never sets `grouping` or `tpslLinkage`, so the controller default applies. It attaches TP/SL only when `canAttachTpSl` is true, meaning the order is not reduce-only, not a trigger type and not a strategy order.

Code: `app/components/UI/Perps/utils/orderParams.ts` `buildPerpsOrderParams`, `canAttachTpSl`

## Hooks

| Hook                                             | Role                                                                                                                                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `usePerpsOrderExecution`                         | Places the order. For market orders it waits up to `PERPS_CUF_STREAM_CONFIRM_RACE_MS` (1000 ms) for the position to render on the stream, then proceeds either way                            |
| `usePerpsTrading`                                | Exposes `updatePositionTPSL` to both forms                                                                                                                                                    |
| `usePerpsTPSLUpdate`                             | `handleUpdateTPSL` for an existing position. It calls `updatePositionTPSL` with `position` and `expectedPosition` (size and entry price), then applies an optimistic stream update on success |
| `usePerpsSavePendingConfig`, `usePerpsOrderForm` | Persist and restore pending TP/SL from `selectPendingTradeConfiguration`                                                                                                                      |

Position-linked callers through `usePerpsTPSLUpdate`:

- the Auto close sheet on market details
- the stop-loss prompt banner on market details
- the Pro positions panel

Code: `app/components/UI/Perps/hooks/usePerpsOrderExecution.ts`; `app/components/UI/Perps/constants/perpsCufTags.ts` `PERPS_CUF_STREAM_CONFIRM_RACE_MS`; `app/components/UI/Perps/hooks/usePerpsTPSLUpdate.ts` `handleUpdateTPSL`; `app/components/UI/Perps/Views/PerpsMarketDetailsView/PerpsMarketDetailsView.tsx` `handleAutoClosePress`; `app/components/UI/Perps/hooks/useStopLossPrompt.ts`; `app/components/UI/Perps/hooks/usePerpsProPositionsPanelActions.tsx`; `app/components/UI/Perps/hooks/usePerpsOrderForm.ts`

## Entry points

The branch a user hits depends on whether a position exists and whether the order flips it, not on Lite vs Pro.

| Path                                    | TP/SL behaviour                                                                                                                                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Market details, no position, Long/Short | Order form with TP/SL. Market orders take the separate path                                                                                                                                                                                                   |
| Modify, Add to position                 | Passes `hideTPSL: true`, which only hides the row. `usePerpsOrderForm` still restores pending TP/SL from `selectPendingTradeConfiguration`, so a recent TP/SL can ride along. The pending-config TTL is Core `PERPS_CONSTANTS.PendingTradeConfigurationTtlMs` |
| Modify, Reduce position                 | Opens the close flow, which calls `closePosition`. No TP/SL is sent                                                                                                                                                                                           |
| Modify, Flip (Lite)                     | `PerpsMarketDetailsView` passes `onReversePosition`, so a confirmation sheet opens and TP/SL cannot be set                                                                                                                                                    |
| `PerpsOrderBookView`                    | Has its own Long/Short and `onReversePosition`, behind `selectPerpsOrderBookEnabledFlag`                                                                                                                                                                      |

Code: `app/components/UI/Perps/Views/PerpsSelectModifyActionView/PerpsSelectModifyActionView.tsx`; `app/components/UI/Perps/hooks/usePerpsOrderForm.ts`; `app/components/UI/Perps/hooks/usePerpsClosePosition.ts`; `app/components/UI/Perps/Views/PerpsOrderBookView/PerpsOrderBookView.tsx`

## Rules for Mobile code

1. Do not call `updatePositionTPSL` in the same tick as `placeOrder`. If you must defer, wait for the position on the `PerpsStreamManager` positions channel, which `PerpsController.subscribeToPositions` feeds. The 1 s wait in `usePerpsOrderExecution` is not enough.
2. Do not set `grouping` or `tpslLinkage` in `buildPerpsOrderParams`.
3. Moving a case between the two mechanisms changes sizing, not only timing. See the Core doc.
4. A change to the decision flag needs a live test. The failure depends on timing and unit tests mock a populated cache. `PerpsOrderView.view.test.tsx` covers one market order with TP/SL that asserts `updatePositionTPSL`.

Code: `app/components/UI/Perps/providers/PerpsStreamManager.tsx`; `app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.view.test.tsx`

## Normalized failures

Mobile consumes stable `PERPS_ERROR_CODES` from `@metamask/perps-controller` 25.0.0 and later. Venue-prose classification belongs in the provider, not in Mobile. Error translation and reconciliation receive the whole failed result so `errorCode` takes precedence over diagnostic text. Unclassified text gets retryable copy rather than being shown to the user.

`POSITION_NOT_FOUND` is an already-closed race for both close and TP/SL updates. Mobile invalidates the positions and account-state caches, ends the CUF trace as `ALREADY_CLOSED`, and shows the already-closed toast. It recognizes the code in a failed result, a code string or an `Error` message; it does not match venue wording.

`ORDER_POST_ONLY_WINDOW` and `ORDER_POST_ONLY_WOULD_CROSS` select the existing post-only messages. A rejected post-only edit with `ORDER_POST_ONLY_WOULD_CROSS` retains the warning that the original order was cancelled. `PROVIDER_ROUTE_REQUIRED` uses the route-selection message, which does not interpolate a provider name.
