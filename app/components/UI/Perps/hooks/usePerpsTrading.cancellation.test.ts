import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type {
  CancelOrderParams,
  CancelOrderResult,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { usePerpsTrading } from './usePerpsTrading';
import { readPerpsUiObservations } from '../utils/perpsUiObservations';
import { TraceName } from '../../../../util/trace';
import {
  acceptPerpsCufRequest,
  endPerpsCufRequestAfter,
  endPerpsCufTrace,
  startPerpsCufTrace,
  watchPerpsCufOrderAbsent,
} from '../utils/perpsCufTrace';
import {
  PERPS_CUF_END_REASON,
  PERPS_CUF_STREAM_TIMEOUT_MS,
  PERPS_CUF_TAG,
} from '../constants/perpsCufTags';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('./usePerpsNetworkManagement', () => ({
  usePerpsNetworkManagement: () => ({ ensureArbitrumNetworkExists: jest.fn() }),
}));
jest.mock('../utils/perpsCufTrace', () => ({
  startPerpsCufTrace: jest.fn(() => 'cancel-observation-cuf'),
  endPerpsCufTrace: jest.fn(),
  endPerpsCufRequestAfter: jest.fn(),
  watchPerpsCufOrderAbsent: jest.fn(),
  acceptPerpsCufRequest: jest.fn(),
}));
jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
  context: {
    PerpsController: {
      state: { activeProvider: 'lighter', isTestnet: true },
      cancelOrder: jest.fn(),
    },
  },
}));

const controller = Engine.context.PerpsController;
const address = '0x1111111111111111111111111111111111111111';
const request = (): CancelOrderParams => ({
  symbol: 'ETH',
  orderId: 'lighter-chase:owned',
  orderType: 'chase',
  providerId: 'lighter',
});
const held = () => {
  let resolve!: (value: CancelOrderResult) => void;
  const promise = new Promise<CancelOrderResult>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};
const after = (cursor: number) =>
  readPerpsUiObservations().cancellations.filter(
    (item) => item.sequence > cursor,
  );
const cufId = 'cancel-observation-cuf';
const expectNoCufCalls = () => {
  expect(startPerpsCufTrace).not.toHaveBeenCalled();
  expect(watchPerpsCufOrderAbsent).not.toHaveBeenCalled();
  expect(endPerpsCufRequestAfter).not.toHaveBeenCalled();
  expect(acceptPerpsCufRequest).not.toHaveBeenCalled();
  expect(endPerpsCufTrace).not.toHaveBeenCalled();
};

describe('UI cancellation result observations', () => {
  const savedDev = __DEV__;
  beforeEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    jest.clearAllMocks();
    jest.mocked(useSelector).mockReturnValue(false);
    (Engine.controllerMessenger.call as jest.Mock).mockReturnValue({
      address,
      type: 'eip155:eoa',
    });
    controller.state.activeProvider = 'lighter';
    controller.state.isTestnet = true;
  });
  afterEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = savedDev;
  });

  it.each([
    { skipCufConfirmationTrace: true, success: true },
    { skipCufConfirmationTrace: true, success: false },
    { skipCufConfirmationTrace: false, success: true },
    { skipCufConfirmationTrace: false, success: false },
  ])(
    'returns the original success:$success result with trace bypass:$skipCufConfirmationTrace',
    async ({ skipCufConfirmationTrace, success }) => {
      const cursor = readPerpsUiObservations().cancellationSequence;
      const outcome: CancelOrderResult = {
        success,
        ...(!success && { error: 'venue refused cancellation' }),
        orderId: request().orderId,
        providerId: 'lighter',
      };
      jest.mocked(controller.cancelOrder).mockResolvedValue(outcome);
      const { result } = renderHook(() => usePerpsTrading());
      let returned: CancelOrderResult | undefined;

      await act(async () => {
        returned = await result.current.cancelOrder({
          ...request(),
          skipCufConfirmationTrace,
        });
      });

      expect(returned).toBe(outcome);
      expect(after(cursor)).toEqual([
        expect.objectContaining({
          request: request(),
          state: 'settled',
          result: outcome,
        }),
      ]);
      expect(controller.cancelOrder).toHaveBeenCalledTimes(1);
      expect(controller.cancelOrder).toHaveBeenCalledWith(request());
      if (skipCufConfirmationTrace) {
        expectNoCufCalls();
      } else {
        expect(startPerpsCufTrace).toHaveBeenCalledTimes(1);
        expect(startPerpsCufTrace).toHaveBeenCalledWith({
          name: TraceName.PerpsCancelOrderToConfirmation,
        });
        expect(watchPerpsCufOrderAbsent).toHaveBeenCalledWith(
          cufId,
          request().orderId,
        );
        expect(endPerpsCufRequestAfter).toHaveBeenCalledWith(
          cufId,
          expect.any(Function),
          PERPS_CUF_STREAM_TIMEOUT_MS,
        );
        const [, hasControllerSettled] = jest.mocked(endPerpsCufRequestAfter)
          .mock.calls[0];
        expect(hasControllerSettled()).toBe(true);
        if (success) {
          expect(acceptPerpsCufRequest).toHaveBeenCalledTimes(1);
          expect(acceptPerpsCufRequest).toHaveBeenCalledWith(cufId);
          expect(endPerpsCufTrace).not.toHaveBeenCalled();
        } else {
          expect(acceptPerpsCufRequest).not.toHaveBeenCalled();
          expect(endPerpsCufTrace).toHaveBeenCalledTimes(1);
          expect(endPerpsCufTrace).toHaveBeenCalledWith({
            id: cufId,
            data: {
              [PERPS_CUF_TAG.SUCCESS]: false,
              [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.REQUEST_FAILED,
            },
          });
        }
      }
    },
  );

  it('leaves the cancellation cursor unchanged for an ordinary order without orderType', async () => {
    const before = readPerpsUiObservations();
    const params: CancelOrderParams = { symbol: 'ETH', orderId: 'ordinary' };
    const outcome: CancelOrderResult = { success: true, orderId: 'ordinary' };
    jest.mocked(controller.cancelOrder).mockResolvedValue(outcome);
    const { result } = renderHook(() => usePerpsTrading());

    const returned = await result.current.cancelOrder(params);

    expect(returned).toBe(outcome);
    expect(controller.cancelOrder).toHaveBeenCalledTimes(1);
    expect(controller.cancelOrder).toHaveBeenCalledWith(params);
    expect(readPerpsUiObservations().cancellationSequence).toBe(
      before.cancellationSequence,
    );
    expect(readPerpsUiObservations().cancellations).toEqual(
      before.cancellations,
    );
    expect(acceptPerpsCufRequest).toHaveBeenCalledWith(cufId);
  });

  it('returns the original accepted cancellation when result sanitization throws', async () => {
    const before = readPerpsUiObservations();
    const outcome: CancelOrderResult = {
      success: true,
      orderId: request().orderId,
    };
    Object.defineProperty(outcome, 'error', {
      get: () => {
        throw new Error('private signed payload');
      },
    });
    jest.mocked(controller.cancelOrder).mockResolvedValue(outcome);
    const { result } = renderHook(() => usePerpsTrading());

    const returned = await result.current.cancelOrder(request());

    expect(returned).toBe(outcome);
    expect(controller.cancelOrder).toHaveBeenCalledTimes(1);
    expect(after(before.cancellationSequence)[0].state).toBe('unknown');
    expect(after(before.cancellationSequence)[0].result).toBeUndefined();
    expect(readPerpsUiObservations().captureFailures).toBe(
      before.captureFailures + 1,
    );
    expect(JSON.stringify(after(before.cancellationSequence))).not.toContain(
      'private signed payload',
    );
    expect(acceptPerpsCufRequest).toHaveBeenCalledWith(cufId);
    expect(endPerpsCufTrace).not.toHaveBeenCalled();
  });

  it('retains pending cancellation and its issuing scope after the hook exits', async () => {
    const cursor = readPerpsUiObservations().cancellationSequence;
    const pending = held();
    jest.mocked(controller.cancelOrder).mockReturnValue(pending.promise);
    const mounted = renderHook(() => usePerpsTrading());
    let cancellation: Promise<CancelOrderResult> | undefined;

    act(() => {
      cancellation = mounted.result.current.cancelOrder({
        ...request(),
        skipCufConfirmationTrace: true,
      });
    });
    const issued = after(cursor)[0];
    mounted.unmount();
    controller.state.activeProvider = 'hyperliquid';
    controller.state.isTestnet = false;
    await act(async () => {
      pending.resolve({
        success: true,
        orderId: request().orderId,
        providerId: 'lighter',
      });
      await cancellation;
    });

    expect(issued.state).toBe('pending');
    expect(after(cursor)[0]).toEqual(
      expect.objectContaining({
        requestId: issued.requestId,
        scope: {
          account: address,
          provider: 'lighter',
          network: 'testnet',
          market: 'ETH',
        },
        state: 'settled',
        result: {
          success: true,
          orderId: request().orderId,
          providerId: 'lighter',
        },
      }),
    );
    expect(controller.cancelOrder).toHaveBeenCalledTimes(1);
  });

  it('matches overlapping cancellation results to their original account and network', async () => {
    const cursor = readPerpsUiObservations().cancellationSequence;
    const first = held(),
      second = held();
    jest
      .mocked(controller.cancelOrder)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => usePerpsTrading());
    const one = result.current.cancelOrder({
      ...request(),
      skipCufConfirmationTrace: true,
    });
    controller.state.isTestnet = false;
    (Engine.controllerMessenger.call as jest.Mock).mockReturnValue({
      address: '0x2222222222222222222222222222222222222222',
      type: 'eip155:eoa',
    });
    const two = result.current.cancelOrder({
      ...request(),
      orderId: 'other-handle',
      providerId: 'hyperliquid',
      skipCufConfirmationTrace: true,
    });

    await act(async () => {
      second.resolve({
        success: true,
        orderId: 'other-handle',
        providerId: 'hyperliquid',
      });
      await two;
      first.resolve({
        success: false,
        orderId: request().orderId,
        providerId: 'lighter',
      });
      await one;
    });

    expect(after(cursor).map((item) => item.scope.account)).toEqual([
      address,
      '0x2222222222222222222222222222222222222222',
    ]);
    expect(after(cursor).map((item) => item.scope.network)).toEqual([
      'testnet',
      'mainnet',
    ]);
    expect(after(cursor).map((item) => item.result?.success)).toEqual([
      false,
      true,
    ]);
    expect(controller.cancelOrder).toHaveBeenCalledTimes(2);
  });

  it.each([true, false])(
    'rethrows the original cancellation exception with trace bypass:%s',
    async (skipCufConfirmationTrace) => {
      const cursor = readPerpsUiObservations().cancellationSequence;
      const exception = new Error('private signed payload');
      jest.mocked(controller.cancelOrder).mockRejectedValue(exception);
      const { result } = renderHook(() => usePerpsTrading());

      await expect(
        result.current.cancelOrder({
          ...request(),
          skipCufConfirmationTrace,
        }),
      ).rejects.toBe(exception);

      expect(after(cursor)[0].state).toBe('unknown');
      expect(after(cursor)[0].result).toBeUndefined();
      expect(JSON.stringify(after(cursor))).not.toContain(
        'private signed payload',
      );
      expect(controller.cancelOrder).toHaveBeenCalledTimes(1);
      expect(controller.cancelOrder).toHaveBeenCalledWith(request());
      if (skipCufConfirmationTrace) {
        expectNoCufCalls();
      } else {
        expect(startPerpsCufTrace).toHaveBeenCalledWith({
          name: TraceName.PerpsCancelOrderToConfirmation,
        });
        expect(watchPerpsCufOrderAbsent).toHaveBeenCalledWith(
          cufId,
          request().orderId,
        );
        expect(endPerpsCufRequestAfter).toHaveBeenCalledWith(
          cufId,
          expect.any(Function),
          PERPS_CUF_STREAM_TIMEOUT_MS,
        );
        const [, hasControllerSettled] = jest.mocked(endPerpsCufRequestAfter)
          .mock.calls[0];
        expect(hasControllerSettled()).toBe(false);
        expect(acceptPerpsCufRequest).not.toHaveBeenCalled();
        expect(endPerpsCufTrace).toHaveBeenCalledTimes(1);
        expect(endPerpsCufTrace).toHaveBeenCalledWith({
          id: cufId,
          data: {
            [PERPS_CUF_TAG.SUCCESS]: false,
            [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.EXCEPTION,
          },
        });
      }
    },
  );

  it('continues the original cancellation when observation context cannot be read', async () => {
    const before = readPerpsUiObservations();
    const originalState = controller.state;
    Object.defineProperty(controller, 'state', {
      configurable: true,
      get: () => {
        throw new Error('unavailable context');
      },
    });
    const outcome: CancelOrderResult = {
      success: false,
      orderId: request().orderId,
    };
    jest.mocked(controller.cancelOrder).mockResolvedValue(outcome);
    const { result } = renderHook(() => usePerpsTrading());

    try {
      await expect(
        result.current.cancelOrder({
          ...request(),
          skipCufConfirmationTrace: true,
        }),
      ).resolves.toBe(outcome);
    } finally {
      Object.defineProperty(controller, 'state', {
        configurable: true,
        writable: true,
        value: originalState,
      });
    }

    expect(readPerpsUiObservations().captureFailures).toBe(
      before.captureFailures + 1,
    );
    expect(readPerpsUiObservations().cancellationSequence).toBe(
      before.cancellationSequence + 1,
    );
    expect(after(before.cancellationSequence)).toEqual([]);
    expect(controller.cancelOrder).toHaveBeenCalledTimes(1);
  });
});
