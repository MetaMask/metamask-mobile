import { useCallback, useState, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import { recordPerpsAction } from '../utils/perpsActivityStorage';
import {
  PERPS_CONSTANTS,
  type OrderResult,
  type OrdinaryOrderType,
  type Position,
  type TrackingData,
} from '@metamask/perps-controller';
import {
  handlePerpsError,
  isNoPositionFoundError,
} from '../utils/translatePerpsError';
import { PerpsCacheInvalidator } from '../services/PerpsCacheInvalidator';
import { usePerpsStream } from '../providers/PerpsStreamManager';
import { PERPS_CLOSE_STREAM_CONFIRM_TIMEOUT_MS } from '../constants/perpsConfig';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';
import { TraceName } from '../../../../util/trace';
import {
  startPerpsCufTrace,
  endPerpsCufTrace,
  endPerpsCufRequestAfter,
  watchPerpsCufPositionClosed,
  acceptPerpsCufRequest,
} from '../utils/perpsCufTrace';
import {
  PERPS_CUF_TAG,
  PERPS_CUF_END_REASON,
  PERPS_CUF_STREAM_TIMEOUT_MS,
} from '../constants/perpsCufTags';
import usePerpsToasts from './usePerpsToasts';
import { usePerpsTrading } from './usePerpsTrading';

interface UsePerpsClosePositionOptions {
  onSuccess?: (result: OrderResult) => void;
  onError?: (error: Error) => void;
}

interface ClosePositionParams {
  // Required
  position: Position;

  // Core parameters
  size?: string;
  orderType?: OrdinaryOrderType;
  limitPrice?: string;

  // Tracking data
  trackingData?: TrackingData;
  marketPrice?: string; // Used for PnL toast to lock in the market price at time of closing

  // Slippage validation (grouped for clarity)
  slippage?: {
    usdAmount?: string;
    priceAtCalculation?: number;
    maxSlippageBps?: number;
  };
}

// Closes in flight per account, provider, network and symbol. Module scope: the
// close screen dismisses before the request settles, so screen state can't guard it.
const closesInFlight = new Set<string>();
const closeLockListeners = new Set<() => void>();
let closeLockVersion = 0;

const getCloseKey = (
  accountAddress: string | undefined,
  provider: string | undefined,
  network: string,
  symbol: string,
) => [accountAddress, provider, network, symbol].join(':');

function setCloseLock(key: string, locked: boolean) {
  if (locked) {
    closesInFlight.add(key);
  } else {
    closesInFlight.delete(key);
  }
  closeLockVersion += 1;
  closeLockListeners.forEach((listener) => listener());
}

function subscribeCloseLocks(listener: () => void) {
  closeLockListeners.add(listener);
  return () => {
    closeLockListeners.delete(listener);
  };
}

const getCloseLockVersion = () => closeLockVersion;

// A filled market close stays locked until the positions stream shows it, so a
// form reopened on the stale position cannot send a second reduce-only close.
function releaseCloseLockOnPositionChange(
  stream: ReturnType<typeof usePerpsStream>,
  key: string,
  position: Position,
) {
  // The subscription can deliver cached data before `subscribe` returns.
  const handles: {
    timeout?: ReturnType<typeof setTimeout>;
    unsubscribe?: () => void;
  } = {};
  let released = false;
  const release = () => {
    if (released) {
      return;
    }
    released = true;
    clearTimeout(handles.timeout);
    handles.unsubscribe?.();
    setCloseLock(key, false);
  };
  handles.timeout = setTimeout(release, PERPS_CLOSE_STREAM_CONFIRM_TIMEOUT_MS);
  handles.unsubscribe = stream.positions.subscribe({
    callback: (positions) => {
      if (positions === null) {
        return;
      }
      const livePosition = positions.find(
        (item) => item.symbol === position.symbol,
      );
      if (livePosition?.size !== position.size) {
        release();
      }
    },
  });
  if (released) {
    handles.unsubscribe();
  }
}

export const resetPerpsCloseLocksForTests = () => {
  closesInFlight.clear();
  closeLockVersion = 0;
};

/** True while a close for this market is in flight or awaiting its stream update. */
export const usePerpsCloseInFlight = (symbol: string): boolean => {
  const accountAddress = useSelector(selectPerpsSelectedAccountAddress);
  const provider = useSelector(selectPerpsProvider);
  const network = useSelector(selectPerpsNetwork);
  useSyncExternalStore(subscribeCloseLocks, getCloseLockVersion);
  return closesInFlight.has(
    getCloseKey(accountAddress, provider, network, symbol),
  );
};

export const usePerpsClosePosition = (
  options?: UsePerpsClosePositionOptions,
) => {
  const { closePosition } = usePerpsTrading();
  const accountAddress = useSelector(selectPerpsSelectedAccountAddress);
  const provider = useSelector(selectPerpsProvider);
  const network = useSelector(selectPerpsNetwork);
  const stream = usePerpsStream();
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const handleClosePosition = useCallback(
    async (params: ClosePositionParams) => {
      const {
        position,
        size,
        orderType = 'market',
        limitPrice,
        trackingData,
        marketPrice,
        slippage,
      } = params;
      const closeKey = getCloseKey(
        accountAddress,
        provider,
        network,
        position.symbol,
      );
      if (closesInFlight.has(closeKey)) {
        DevLogger.log('usePerpsClosePosition: Close already in flight', {
          symbol: position.symbol,
        });
        showToast(
          PerpsToastOptions.positionManagement.closePosition
            .closeAlreadyInProgress,
        );
        return undefined;
      }
      const isFullClose = size === undefined || size === '';

      // Failure toast varies by order type and full/partial close. Shared so
      // both the { success: false } branch and the rejected-promise catch
      // surface the same feedback — otherwise a thrown close would leave the
      // submission/in-progress toast up with no failure indication.
      const showCloseFailureToast = () => {
        if (orderType === 'market' && isFullClose) {
          // Market full close failed
          showToast(
            PerpsToastOptions.positionManagement.closePosition.marketClose.full
              .closeFullPositionFailed,
          );
        } else if (orderType === 'market') {
          // Market partial close failed
          showToast(
            PerpsToastOptions.positionManagement.closePosition.marketClose
              .partial.closePartialPositionFailed,
          );
        } else if (isFullClose) {
          // Limit full close failed
          showToast(
            PerpsToastOptions.positionManagement.closePosition.limitClose.full
              .fullPositionCloseFailed,
          );
        } else {
          // Limit partial close failed
          showToast(
            PerpsToastOptions.positionManagement.closePosition.limitClose
              .partial.partialPositionCloseFailed,
          );
        }
      };
      // Guard against double-toasting: the { success: false } branch shows the
      // failure toast then throws, so the catch must not show it again.
      let failureToastShown = false;

      // Confirmation CUF (market close): ends when the stream shows the
      // position reduced or absent. Limit closes rest until filled, so their
      // confirmation is not a render-latency measurement.
      let closeCufOpId: string | undefined;
      let controllerSettled = false;
      if (orderType === 'market') {
        closeCufOpId = startPerpsCufTrace({
          name: TraceName.PerpsClosePositionToConfirmation,
        });
        watchPerpsCufPositionClosed(closeCufOpId, position);
        endPerpsCufRequestAfter(
          closeCufOpId,
          () => controllerSettled,
          PERPS_CUF_STREAM_TIMEOUT_MS,
        );
      }

      // The venue filled, closed or liquidated the position before this
      // request landed. Nothing failed on the user's side, so reconcile the
      // stale local state and say so instead of raising a close failure.
      const reconcileAlreadyClosed = () => {
        if (closeCufOpId) {
          endPerpsCufTrace({
            id: closeCufOpId,
            data: {
              [PERPS_CUF_TAG.SUCCESS]: false,
              [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.ALREADY_CLOSED,
            },
          });
        }
        showToast(
          PerpsToastOptions.positionManagement.closePosition
            .positionAlreadyClosed,
        );
        // Closing a position moves margin and balance, so account state is
        // stale too — the controller pairs these two everywhere it closes.
        PerpsCacheInvalidator.invalidate('positions');
        PerpsCacheInvalidator.invalidate('accountState');
      };

      setCloseLock(closeKey, true);
      let holdUntilPositionUpdates = false;
      try {
        setIsClosing(true);
        setError(null);

        DevLogger.log('usePerpsClosePosition: Closing position', {
          symbol: position.symbol,
          size,
          orderType,
          limitPrice,
        });
        const isLong = Number.parseFloat(position.size) >= 0;
        const direction = isLong
          ? strings('perps.market.long')
          : strings('perps.market.short');

        if (orderType === 'market') {
          // Market closing full position
          if (isFullClose) {
            showToast(
              PerpsToastOptions.positionManagement.closePosition.marketClose.full.closeFullPositionInProgress(
                direction,
                position.size,
                position.symbol,
              ),
            );
          }
          // Market closing partial position
          else {
            showToast(
              PerpsToastOptions.positionManagement.closePosition.marketClose.partial.closePartialPositionInProgress(
                direction,
                size,
                position.symbol,
              ),
            );
          }
        }

        if (orderType === 'limit') {
          // Limit closing full position
          if (isFullClose) {
            showToast(
              PerpsToastOptions.positionManagement.closePosition.limitClose.full.fullPositionCloseSubmitted(
                direction,
                position.size,
                position.symbol,
              ),
            );
          }
          // Limit closing partial position
          else {
            showToast(
              PerpsToastOptions.positionManagement.closePosition.limitClose.partial.partialPositionCloseSubmitted(
                direction,
                size,
                position.symbol,
              ),
            );
          }
        }

        // Limit closes rest at the user-specified price, so the market
        // slippage/price-staleness protection does not apply. Forwarding
        // usdAmount/priceAtCalculation would make the provider compare the live
        // market price against the calculation-time price and reject the order
        // with "Price moved too much" whenever the market has drifted. Send the
        // exact size and limit price instead, and only pass slippage parameters
        // for market orders.
        const isLimitOrder = orderType === 'limit';
        const result = await closePosition({
          symbol: position.symbol,
          size, // If undefined, will close full position
          orderType,
          price: limitPrice,
          trackingData,
          // Pass through slippage parameters (market orders only)
          usdAmount: isLimitOrder ? undefined : slippage?.usdAmount,
          priceAtCalculation: isLimitOrder
            ? undefined
            : slippage?.priceAtCalculation,
          maxSlippageBps: isLimitOrder ? undefined : slippage?.maxSlippageBps,
          // Pass live position to avoid getPositions() API call (prevents 429 rate limiting)
          position,
        });

        controllerSettled = true;

        DevLogger.log('usePerpsClosePosition: Close result', result);

        if (result.success || isNoPositionFoundError(result.error)) {
          recordPerpsAction();
        }

        if (!result.success && isNoPositionFoundError(result.error)) {
          reconcileAlreadyClosed();
          return result;
        }

        if (result.success) {
          holdUntilPositionUpdates = orderType === 'market';
          // Controller accepted the close: only now may a stream shrink/absence
          // complete the CUF as a success. If the position already shrank while
          // the request was in flight, that render instant was recorded and the
          // span ends at it here.
          if (closeCufOpId) {
            acceptPerpsCufRequest(closeCufOpId);
          }
          // Market order immediately fills or fails
          // Limit orders aren't guaranteed to fill immediately, so we don't display "close position success" toast for them.
          if (orderType === 'market') {
            // Market closed full position
            if (isFullClose) {
              showToast(
                PerpsToastOptions.positionManagement.closePosition.marketClose.full.closeFullPositionSuccess(
                  position,
                  marketPrice,
                ),
              );
            }
            // Market closed partial position
            else {
              showToast(
                PerpsToastOptions.positionManagement.closePosition.marketClose.partial.closePartialPositionSuccess(
                  position,
                  marketPrice,
                ),
              );
            }
          }

          // Call success callback
          options?.onSuccess?.(result);
        } else {
          showCloseFailureToast();
          failureToastShown = true;

          // Use centralized error handler for all errors
          const errorMessage = handlePerpsError({
            error: result.error,
            fallbackMessage: strings('perps.close_position.error_unknown'),
          });

          // Rejected request, not an exception: classify before the throw so
          // the catch's EXCEPTION end no-ops (matches TPSL/cancel paths).
          if (closeCufOpId) {
            endPerpsCufTrace({
              id: closeCufOpId,
              data: {
                [PERPS_CUF_TAG.SUCCESS]: false,
                [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.REQUEST_FAILED,
              },
            });
          }
          throw new Error(errorMessage);
        }

        return result;
      } catch (err) {
        if (isNoPositionFoundError(err)) {
          reconcileAlreadyClosed();
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }

        // A rejected promise (e.g. thrown by the controller/provider) skips the
        // { success: false } branch, so surface the failure toast here unless it
        // was already shown for a returned failure.
        if (!failureToastShown) {
          showCloseFailureToast();
        }

        if (closeCufOpId) {
          endPerpsCufTrace({
            id: closeCufOpId,
            data: {
              [PERPS_CUF_TAG.SUCCESS]: false,
              [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.EXCEPTION,
            },
          });
        }
        const closeError =
          err instanceof Error
            ? err
            : new Error(strings('perps.close_position.error_unknown'));

        DevLogger.log(
          'usePerpsClosePosition: Error closing position',
          closeError,
        );
        Logger.error(closeError, {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            component: 'usePerpsClosePosition',
            action: 'close_position',
            operation: 'position_management',
          },
          context: {
            name: 'usePerpsClosePosition',
            data: {
              symbol: position.symbol,
              positionSize: position.size,
              requestedSize: size,
              orderType,
              isFullClose,
              limitPrice,
              marketPrice,
              trackingSource: trackingData?.source,
              tradeAction: trackingData?.tradeAction,
              inputMethod: trackingData?.inputMethod,
              totalFee: trackingData?.totalFee,
              realizedPnl: trackingData?.realizedPnl,
              receivedAmount: trackingData?.receivedAmount,
              rawError:
                err instanceof Error
                  ? undefined
                  : err === undefined
                    ? 'undefined'
                    : String(err),
            },
          },
        });
        setError(closeError);

        // Call error callback
        options?.onError?.(closeError);

        throw closeError;
      } finally {
        if (holdUntilPositionUpdates) {
          releaseCloseLockOnPositionChange(stream, closeKey, position);
        } else {
          setCloseLock(closeKey, false);
        }
        setIsClosing(false);
      }
    },
    [
      PerpsToastOptions.positionManagement,
      accountAddress,
      closePosition,
      network,
      options,
      provider,
      showToast,
      stream,
    ],
  );

  return {
    handleClosePosition,
    isClosing,
    error,
  };
};
