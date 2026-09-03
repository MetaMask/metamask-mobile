import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PERPS_ERROR_CODES,
  type OrderParams,
  type OrderResult,
  type Position,
} from '@metamask/perps-controller';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
import { store } from '../../../../store';
import { usePerpsStream } from '../providers/PerpsStreamManager';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';
import { isPerpsFillRendered } from '../utils/perpsCufTrace';
import { isPerpsErrorCode } from '../utils/translatePerpsError';
import usePerpsToasts from './usePerpsToasts';
import { usePerpsTrading } from './usePerpsTrading';

type PostOrderTPSLSource = Pick<
  OrderParams,
  'symbol' | 'takeProfitPrice' | 'stopLossPrice'
>;

interface PostOrderTPSLAttachmentOptions {
  positionBaseline?: Pick<Position, 'size'> | null;
}

type PerpsPositionStream = ReturnType<typeof usePerpsStream>['positions'];

type AttachmentWakeResult =
  | { type: 'position'; position: Position }
  | { type: 'delay' }
  | { type: 'context-changed' };

export const POST_ORDER_TPSL_RETRY_OFFSETS_MS = [0, 500, 2000, 4000] as const;

const getPerpsTradingContextKey = (): string => {
  const state = store.getState();
  return JSON.stringify([
    selectPerpsSelectedAccountAddress(state) ?? '',
    selectPerpsNetwork(state),
    selectPerpsProvider(state) ?? '',
  ]);
};

const findRenderedPosition = (
  positions: Position[] | null,
  symbol: string,
  baselineSize: string | undefined,
): Position | undefined => {
  const position = positions?.find((candidate) => candidate.symbol === symbol);
  return position && isPerpsFillRendered(position, baselineSize)
    ? position
    : undefined;
};

const waitForPositionOrDelay = (
  positionsStream: PerpsPositionStream,
  symbol: string,
  baselineSize: string | undefined,
  delayMs: number,
  isContextCurrent: () => boolean,
): Promise<AttachmentWakeResult> => {
  if (!isContextCurrent()) {
    return Promise.resolve({ type: 'context-changed' });
  }

  const renderedPosition = findRenderedPosition(
    positionsStream.getSnapshot(),
    symbol,
    baselineSize,
  );
  if (renderedPosition) {
    return Promise.resolve({ type: 'position', position: renderedPosition });
  }

  return new Promise((resolve) => {
    let settled = false;
    let unsubscribeFromPositions: (() => void) | undefined;
    let cancelDelay: () => void = () => undefined;
    let unsubscribeFromStore: () => void = () => undefined;
    const settle = (wakeResult: AttachmentWakeResult) => {
      if (settled) {
        return;
      }
      settled = true;
      cancelDelay();
      unsubscribeFromPositions?.();
      unsubscribeFromStore();
      resolve(wakeResult);
    };
    const delay = setTimeout(() => settle({ type: 'delay' }), delayMs);
    cancelDelay = () => clearTimeout(delay);

    unsubscribeFromStore = store.subscribe(() => {
      if (!isContextCurrent()) {
        settle({ type: 'context-changed' });
      }
    });

    try {
      unsubscribeFromPositions = positionsStream.subscribe({
        callback: (positions) => {
          if (!isContextCurrent()) {
            settle({ type: 'context-changed' });
            return;
          }
          const position = findRenderedPosition(
            positions,
            symbol,
            baselineSize,
          );
          if (position) {
            settle({ type: 'position', position });
          }
        },
        throttleMs: 0,
        symbols: [symbol],
      });
      // The stream may synchronously deliver cached data before subscribe()
      // returns its cleanup callback.
      if (settled) {
        unsubscribeFromPositions();
      }
    } catch {
      // The controller retry schedule remains available when the stream cannot
      // subscribe. The timer and context listener still settle this wait.
    }

    if (!isContextCurrent()) {
      settle({ type: 'context-changed' });
    }
  });
};

export function usePerpsPostOrderTPSL() {
  const { updatePositionTPSL } = usePerpsTrading();
  const { showToast, PerpsToastOptions } = usePerpsToasts();
  const stream = usePerpsStream();
  const [isAttachingPostOrderTPSL, setIsAttachingPostOrderTPSL] =
    useState(false);
  const isMountedRef = useRef(true);
  const activeAttachmentRef = useRef<
    Promise<OrderResult | undefined> | undefined
  >(undefined);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const attachPostOrderTPSL = useCallback(
    (
      order: PostOrderTPSLSource,
      options: PostOrderTPSLAttachmentOptions = {},
    ): Promise<OrderResult | undefined> => {
      if (activeAttachmentRef.current) {
        return activeAttachmentRef.current;
      }

      const tradingContextKey = getPerpsTradingContextKey();
      const isContextCurrent = () =>
        getPerpsTradingContextKey() === tradingContextKey;
      const startedAt = Date.now();
      const initialBaselineSize = options.positionBaseline?.size;

      if (isMountedRef.current) {
        setIsAttachingPostOrderTPSL(true);
      }

      const attachment = (async (): Promise<OrderResult | undefined> => {
        let position: Position | undefined;
        let waitBaselineSize = initialBaselineSize;

        if (initialBaselineSize !== undefined) {
          const wakeResult = await waitForPositionOrDelay(
            stream.positions,
            order.symbol,
            initialBaselineSize,
            POST_ORDER_TPSL_RETRY_OFFSETS_MS[
              POST_ORDER_TPSL_RETRY_OFFSETS_MS.length - 1
            ],
            isContextCurrent,
          );
          if (wakeResult.type === 'context-changed') {
            return undefined;
          }
          if (wakeResult.type !== 'position') {
            const result = {
              success: false,
              error: PERPS_ERROR_CODES.POSITION_NOT_FOUND,
            };
            showToast(
              PerpsToastOptions.positionManagement.tpsl
                .postOrderAttachmentFailed,
            );
            return result;
          }
          position = wakeResult.position;
          waitBaselineSize = position.size;
        }

        let lastResult: OrderResult = {
          success: false,
          error: PERPS_ERROR_CODES.POSITION_NOT_FOUND,
        };

        for (
          let attemptIndex = 0;
          attemptIndex < POST_ORDER_TPSL_RETRY_OFFSETS_MS.length;
          attemptIndex += 1
        ) {
          if (!isContextCurrent()) {
            return undefined;
          }

          if (attemptIndex > 0) {
            const targetOffset = POST_ORDER_TPSL_RETRY_OFFSETS_MS[attemptIndex];
            const elapsedMs = Date.now() - startedAt;
            const wakeResult = await waitForPositionOrDelay(
              stream.positions,
              order.symbol,
              waitBaselineSize,
              Math.max(0, targetOffset - elapsedMs),
              isContextCurrent,
            );
            if (wakeResult.type === 'context-changed') {
              return undefined;
            }
            if (wakeResult.type === 'position') {
              position = wakeResult.position;
              waitBaselineSize = position.size;
            }
          }

          let rejectedError: Error | undefined;
          try {
            lastResult = await updatePositionTPSL({
              symbol: order.symbol,
              takeProfitPrice: order.takeProfitPrice,
              stopLossPrice: order.stopLossPrice,
              position,
            });
          } catch (error) {
            rejectedError = ensureError(
              error,
              'usePerpsPostOrderTPSL.attachPostOrderTPSL',
            );
            lastResult = {
              success: false,
              error: rejectedError.message,
            };
          }

          if (!isContextCurrent()) {
            return undefined;
          }
          if (lastResult.success) {
            return lastResult;
          }

          const isPositionNotFound = isPerpsErrorCode(
            lastResult.error,
            PERPS_ERROR_CODES.POSITION_NOT_FOUND,
          );
          const hasMoreAttempts =
            attemptIndex < POST_ORDER_TPSL_RETRY_OFFSETS_MS.length - 1;
          if (isPositionNotFound && hasMoreAttempts) {
            continue;
          }

          if (rejectedError) {
            Logger.error(
              rejectedError,
              'usePerpsPostOrderTPSL: Failed to attach protection',
            );
          }
          showToast(
            PerpsToastOptions.positionManagement.tpsl.postOrderAttachmentFailed,
          );
          return lastResult;
        }

        return lastResult;
      })().finally(() => {
        activeAttachmentRef.current = undefined;
        if (isMountedRef.current) {
          setIsAttachingPostOrderTPSL(false);
        }
      });

      activeAttachmentRef.current = attachment;
      return attachment;
    },
    [
      PerpsToastOptions.positionManagement.tpsl.postOrderAttachmentFailed,
      showToast,
      stream.positions,
      updatePositionTPSL,
    ],
  );

  return { attachPostOrderTPSL, isAttachingPostOrderTPSL };
}
