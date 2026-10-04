import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { OrderParams, OrderResult } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { usePerpsOrderExecution } from './usePerpsOrderExecution';
import { readPerpsUiObservations } from '../utils/perpsUiObservations';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('./usePerpsNetworkManagement', () => ({
  usePerpsNetworkManagement: () => ({ ensureArbitrumNetworkExists: jest.fn() }),
}));
jest.mock('./usePerpsNetwork', () => ({ usePerpsNetwork: () => 'testnet' }));
jest.mock('./usePerpsMeasurement', () => ({ usePerpsMeasurement: jest.fn() }));
jest.mock('../utils/perpsActivityStorage', () => ({
  recordPerpsAction: jest.fn(),
}));
jest.mock('../providers/PerpsStreamManager', () => ({
  usePerpsStream: () => ({
    positions: { getSnapshot: () => [], getLastDeliveredAt: () => null },
    orders: {
      getSnapshot: () => [{ orderId: 'child-1' }],
      getLastDeliveredAt: () => null,
    },
  }),
}));
jest.mock('../utils/perpsCufTrace', () => ({
  startPerpsCufTrace: () => 'observation-cuf',
  endPerpsCufTrace: jest.fn(),
  endPerpsCufTraceAfter: jest.fn(),
  armPerpsPlaceOrderCuf: jest.fn(),
  isPerpsPlaceOrderCufCurrent: () => true,
  isPerpsFillRendered: () => false,
  waitForPerpsPlaceOrderPositionRendered: () => Promise.resolve(undefined),
  watchPerpsCufLimitRendered: () => Promise.resolve(undefined),
}));
jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
  context: {
    PerpsController: {
      state: { activeProvider: 'lighter', isTestnet: true },
      placeOrder: jest.fn(),
    },
  },
}));
const controller = Engine.context.PerpsController;
const address = '0x1111111111111111111111111111111111111111';
const request = (orderType: 'scale' | 'chase' | 'twap'): OrderParams => ({
  symbol: 'ETH',
  isBuy: true,
  providerId: 'lighter',
  orderType,
  size: '0.01',
  leverage: 1,
});
const held = () => {
  let resolve!: (result: OrderResult) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<OrderResult>((complete, fail) => {
    resolve = complete;
    reject = fail;
  });
  return { promise, resolve, reject };
};
const after = (cursor: number) =>
  readPerpsUiObservations().submissions.filter(
    (item) => item.sequence > cursor,
  );

describe('the real UI execution observation dispatch boundary', () => {
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

  it.each(['scale', 'chase', 'twap'] as const)(
    'captures %s before the controller resolves and retains it across hook exit',
    async (orderType) => {
      const cursor = readPerpsUiObservations().submissionSequence;
      const pending = held();
      jest.mocked(controller.placeOrder).mockReturnValue(pending.promise);
      const mounted = renderHook(() => usePerpsOrderExecution());
      let placement: Promise<OrderResult | undefined> | undefined;

      act(() => {
        placement = mounted.result.current.placeOrder(request(orderType));
      });
      const issued = after(cursor)[0];
      mounted.rerender(undefined);
      mounted.unmount();
      controller.state.activeProvider = 'hyperliquid';
      controller.state.isTestnet = false;
      const result: OrderResult = {
        success: true,
        orderId: 'owned-' + orderType,
        childOrderIds: ['child-1'],
      };
      await act(async () => {
        pending.resolve(result);
        await placement;
      });

      expect(issued.state).toBe('pending');
      expect(issued.scope).toEqual({
        account: address,
        provider: 'lighter',
        network: 'testnet',
        market: 'ETH',
      });
      expect(after(cursor)).toHaveLength(1);
      expect(after(cursor)[0]).toEqual(
        expect.objectContaining({
          requestId: issued.requestId,
          state: 'settled',
          scope: issued.scope,
          result,
        }),
      );
      expect(controller.placeOrder).toHaveBeenCalledTimes(1);
      expect(controller.placeOrder).toHaveBeenCalledWith(request(orderType));
    },
  );

  it('matches concurrent late refusals to their original issuing scopes', async () => {
    const cursor = readPerpsUiObservations().submissionSequence;
    const first = held(),
      second = held();
    jest
      .mocked(controller.placeOrder)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => usePerpsOrderExecution());
    let one: Promise<OrderResult | undefined> | undefined,
      two: Promise<OrderResult | undefined> | undefined;

    act(() => {
      one = result.current.placeOrder(request('chase'));
    });
    controller.state.isTestnet = false;
    (Engine.controllerMessenger.call as jest.Mock).mockReturnValue({
      address: '0x2222222222222222222222222222222222222222',
      type: 'eip155:eoa',
    });
    act(() => {
      two = result.current.placeOrder({
        ...request('twap'),
        providerId: 'hyperliquid',
      });
    });
    await act(async () => {
      second.resolve({
        success: false,
        error: 'refused',
        partialState: { leverageUpdated: 1 },
      });
      await two;
    });
    const partial: OrderResult = {
      success: false,
      orderId: 'partial-chase',
      childOrderIds: ['child-1'],
    };
    await act(async () => {
      first.resolve(partial);
      await one;
    });

    expect(after(cursor).map((item) => item.scope.network)).toEqual([
      'testnet',
      'mainnet',
    ]);
    expect(after(cursor).map((item) => item.scope.provider)).toEqual([
      'lighter',
      'hyperliquid',
    ]);
    expect(after(cursor).map((item) => item.scope.account)).toEqual([
      address,
      '0x2222222222222222222222222222222222222222',
    ]);
    expect(after(cursor)[0].result).toEqual(partial);
    expect(after(cursor)[1].result).toEqual({
      success: false,
      error: 'refused',
      partialState: { leverageUpdated: 1 },
    });
    expect(result.current.lastResult).toEqual(partial);
    expect(controller.placeOrder).toHaveBeenCalledTimes(2);
  });

  it('keeps a controller exception unknown without exposing its private message or replaying', async () => {
    const cursor = readPerpsUiObservations().submissionSequence;
    jest
      .mocked(controller.placeOrder)
      .mockRejectedValue(new Error('private signed payload'));
    const { result } = renderHook(() => usePerpsOrderExecution());

    await act(async () => {
      await result.current.placeOrder(request('twap'));
    });

    expect(after(cursor)[0].state).toBe('unknown');
    expect(after(cursor)[0].result).toBeUndefined();
    expect(JSON.stringify(after(cursor))).not.toContain(
      'private signed payload',
    );
    expect(controller.placeOrder).toHaveBeenCalledTimes(1);
  });

  it('does not let observation context failure prevent the existing dispatch', async () => {
    const before = readPerpsUiObservations();
    const originalState = controller.state;
    Object.defineProperty(controller, 'state', {
      configurable: true,
      get: () => {
        throw new Error('read unavailable');
      },
    });
    const outcome: OrderResult = { success: false, error: 'venue refused' };
    jest.mocked(controller.placeOrder).mockResolvedValue(outcome);
    const { result } = renderHook(() => usePerpsOrderExecution());

    try {
      await act(async () => {
        await result.current.placeOrder(request('chase'));
      });
    } finally {
      Object.defineProperty(controller, 'state', {
        configurable: true,
        writable: true,
        value: originalState,
      });
    }

    expect(controller.placeOrder).toHaveBeenCalledWith(request('chase'));
    expect(result.current.lastResult).toEqual(outcome);
    expect(readPerpsUiObservations().captureFailures).toBe(
      before.captureFailures + 1,
    );
    expect(after(before.submissionSequence)).toEqual([]);
  });
});
