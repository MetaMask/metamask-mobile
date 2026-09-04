import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PERPS_ERROR_CODES,
  type OrderParams,
  type OrderResult,
  type Position,
  type UpdatePositionTPSLParams,
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

interface AttachmentPositionState {
  position?: Position;
  waitBaselineSize?: string;
}

type AttachmentOutcome =
  | { type: 'success'; result: OrderResult }
  | { type: 'failure'; result: OrderResult; rejectedError?: Error }
  | { type: 'context-changed' };

type AttachmentPositionOutcome =
  | { type: 'ready'; state: AttachmentPositionState }
  | Extract<AttachmentOutcome, { type: 'failure' | 'context-changed' }>;

type AttachmentPreparationOutcome =
  | { type: 'ready'; state: AttachmentPositionState }
  | Extract<AttachmentOutcome, { type: 'context-changed' }>;

type PreparedAttachmentOutcome =
  | {
      type: 'attempted';
      outcome: Extract<AttachmentOutcome, { type: 'failure' | 'success' }>;
      state: AttachmentPositionState;
    }
  | Extract<AttachmentOutcome, { type: 'context-changed' }>;

type UpdatePositionTPSL = (
  params: UpdatePositionTPSLParams,
) => Promise<OrderResult>;

interface AttachmentCoordinatorParams {
  order: PostOrderTPSLSource;
  positionsStream: PerpsPositionStream;
  updatePositionTPSL: UpdatePositionTPSL;
  isContextCurrent: () => boolean;
  startedAt: number;
  initialBaselineSize?: string;
}

export const POST_ORDER_TPSL_RETRY_OFFSETS_MS = [0, 500, 2000, 4000] as const;

const createPositionNotFoundResult = (): OrderResult => ({
  success: false,
  error: PERPS_ERROR_CODES.POSITION_NOT_FOUND,
});

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

const resolveInitialAttachmentPosition = async ({
  positionsStream,
  order,
  initialBaselineSize,
  isContextCurrent,
}: AttachmentCoordinatorParams): Promise<AttachmentPositionOutcome> => {
  if (initialBaselineSize === undefined) {
    return {
      type: 'ready',
      state: { waitBaselineSize: initialBaselineSize },
    };
  }

  const wakeResult = await waitForPositionOrDelay(
    positionsStream,
    order.symbol,
    initialBaselineSize,
    POST_ORDER_TPSL_RETRY_OFFSETS_MS.at(-1) ?? 0,
    isContextCurrent,
  );
  if (wakeResult.type === 'context-changed') {
    return wakeResult;
  }
  if (wakeResult.type !== 'position') {
    return { type: 'failure', result: createPositionNotFoundResult() };
  }

  return {
    type: 'ready',
    state: {
      position: wakeResult.position,
      waitBaselineSize: wakeResult.position.size,
    },
  };
};

const prepareAttachmentAttempt = async (
  attemptIndex: number,
  state: AttachmentPositionState,
  {
    positionsStream,
    order,
    startedAt,
    isContextCurrent,
  }: AttachmentCoordinatorParams,
): Promise<AttachmentPreparationOutcome> => {
  const targetOffset = POST_ORDER_TPSL_RETRY_OFFSETS_MS[attemptIndex];
  const elapsedMs = Date.now() - startedAt;
  const wakeResult = await waitForPositionOrDelay(
    positionsStream,
    order.symbol,
    state.waitBaselineSize,
    Math.max(0, targetOffset - elapsedMs),
    isContextCurrent,
  );
  if (wakeResult.type === 'context-changed') {
    return wakeResult;
  }
  if (wakeResult.type !== 'position') {
    return { type: 'ready', state };
  }

  return {
    type: 'ready',
    state: {
      position: wakeResult.position,
      waitBaselineSize: wakeResult.position.size,
    },
  };
};

const executeAttachmentAttempt = async (
  updatePositionTPSL: UpdatePositionTPSL,
  order: PostOrderTPSLSource,
  position?: Position,
): Promise<Extract<AttachmentOutcome, { type: 'failure' | 'success' }>> => {
  try {
    const result = await updatePositionTPSL({
      symbol: order.symbol,
      takeProfitPrice: order.takeProfitPrice,
      stopLossPrice: order.stopLossPrice,
      position,
    });
    return result.success
      ? { type: 'success', result }
      : { type: 'failure', result };
  } catch (error) {
    const rejectedError = ensureError(
      error,
      'usePerpsPostOrderTPSL.attachPostOrderTPSL',
    );
    return {
      type: 'failure',
      result: {
        success: false,
        error: rejectedError.message,
      },
      rejectedError,
    };
  }
};

const executePreparedAttachmentAttempt = async (
  attemptIndex: number,
  state: AttachmentPositionState,
  params: AttachmentCoordinatorParams,
): Promise<PreparedAttachmentOutcome> => {
  let preparedState = state;
  if (attemptIndex > 0) {
    const preparedAttempt = await prepareAttachmentAttempt(
      attemptIndex,
      state,
      params,
    );
    if (preparedAttempt.type !== 'ready') {
      return preparedAttempt;
    }
    preparedState = preparedAttempt.state;
  }

  const outcome = await executeAttachmentAttempt(
    params.updatePositionTPSL,
    params.order,
    preparedState.position,
  );
  return { type: 'attempted', outcome, state: preparedState };
};

const isRetryableAttachmentFailure = (
  outcome: Extract<AttachmentOutcome, { type: 'failure' }>,
  attemptIndex: number,
): boolean =>
  isPerpsErrorCode(
    outcome.result.error,
    PERPS_ERROR_CODES.POSITION_NOT_FOUND,
  ) && attemptIndex < POST_ORDER_TPSL_RETRY_OFFSETS_MS.length - 1;

const runPostOrderTPSLAttachment = async (
  params: AttachmentCoordinatorParams,
): Promise<AttachmentOutcome> => {
  let initialPosition: AttachmentPositionOutcome = {
    type: 'ready',
    state: { waitBaselineSize: params.initialBaselineSize },
  };
  if (params.initialBaselineSize !== undefined) {
    initialPosition = await resolveInitialAttachmentPosition(params);
  }
  if (initialPosition.type !== 'ready') {
    return initialPosition;
  }

  let state = initialPosition.state;
  for (
    let attemptIndex = 0;
    attemptIndex < POST_ORDER_TPSL_RETRY_OFFSETS_MS.length;
    attemptIndex += 1
  ) {
    if (!params.isContextCurrent()) {
      return { type: 'context-changed' };
    }

    const preparedAttempt = await executePreparedAttachmentAttempt(
      attemptIndex,
      state,
      params,
    );
    if (preparedAttempt.type === 'context-changed') {
      return preparedAttempt;
    }
    state = preparedAttempt.state;
    const { outcome } = preparedAttempt;
    if (!params.isContextCurrent()) {
      return { type: 'context-changed' };
    }
    if (outcome.type === 'success') {
      return outcome;
    }
    if (!isRetryableAttachmentFailure(outcome, attemptIndex)) {
      return outcome;
    }
  }

  return { type: 'failure', result: createPositionNotFoundResult() };
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

      const attachment = runPostOrderTPSLAttachment({
        order,
        positionsStream: stream.positions,
        updatePositionTPSL,
        isContextCurrent,
        startedAt,
        initialBaselineSize,
      })
        .then((outcome): OrderResult | undefined => {
          if (outcome.type === 'context-changed') {
            return undefined;
          }
          if (outcome.type === 'failure') {
            if (outcome.rejectedError) {
              Logger.error(
                outcome.rejectedError,
                'usePerpsPostOrderTPSL: Failed to attach protection',
              );
            }
            showToast(
              PerpsToastOptions.positionManagement.tpsl
                .postOrderAttachmentFailed,
            );
          }
          return outcome.result;
        })
        .finally(() => {
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
