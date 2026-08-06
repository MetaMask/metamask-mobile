import { act, renderHook } from '@testing-library/react-hooks';
import { useFocusEffect } from '@react-navigation/native';
import { useVipEquityMultiplier } from './useVipEquityMultiplier';
import Engine from '../../../../core/Engine';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: () => 'sub-1',
}));

jest.mock('../../../../selectors/featureFlagController/vipProgram', () => ({
  selectVipProgramEnabled: () => true,
}));

interface MockHoldings {
  holdingsUsd: string | undefined;
  isLoading: boolean;
  hasError: boolean;
}

const mockHoldings = jest.fn<MockHoldings, []>();

jest.mock('./useSubscriptionLinkedMusdHoldings', () => ({
  useSubscriptionLinkedMusdHoldings: () => mockHoldings(),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: jest.fn(),
    },
  },
}));

const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
  typeof useFocusEffect
>;

/** `capUsd` echoes the requested holdings so tests can identify the response. */
const buildAvailableResult = (holdings: string) => ({
  available: true,
  multiplier: '1.0889',
  eligible: true,
  progressPercent: 44.4,
  tierNumber: 6,
  tierName: 'VIP 6',
  capUsd: holdings,
  computedAt: '2026-08-04T00:00:00.000Z',
  localizedText: {
    title: 'Estimated equity multiplier',
    eligibleDescription: 'ok',
    ineligibleDescription: 'no',
  },
});

describe('useVipEquityMultiplier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockHoldings.mockReturnValue({
      holdingsUsd: '5000000',
      isLoading: false,
      hasError: false,
    });
    mockUseFocusEffect.mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('becomes ready when available:true is returned', async () => {
    (Engine.controllerMessenger.call as jest.Mock).mockResolvedValue(
      buildAvailableResult('10000000'),
    );

    const { result } = renderHook(() => useVipEquityMultiplier());

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.data?.multiplier).toBe('1.0889');
    expect(result.current.holdingsUsd).toBe('5000000');
    expect(result.current.data).not.toHaveProperty('holdingsUsd');
    expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
      'RewardsController:getVipEquityMultiplier',
      'sub-1',
      '5000000',
    );
  });

  it('requests the first holdings value without waiting for the debounce', async () => {
    (Engine.controllerMessenger.call as jest.Mock).mockResolvedValue(
      buildAvailableResult('10000000'),
    );

    renderHook(() => useVipEquityMultiplier());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
      'RewardsController:getVipEquityMultiplier',
      'sub-1',
      '5000000',
    );
  });

  it('hides when available:false', async () => {
    (Engine.controllerMessenger.call as jest.Mock).mockResolvedValue({
      available: false,
    });

    const { result } = renderHook(() => useVipEquityMultiplier());

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status).toBe('hidden');
    expect(result.current.data).toBeNull();
  });

  it('hides when the backend reports no enrollment', async () => {
    (Engine.controllerMessenger.call as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useVipEquityMultiplier());

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status).toBe('hidden');
  });

  it('reports loading while holdings are still resolving', async () => {
    mockHoldings.mockReturnValue({
      holdingsUsd: undefined,
      isLoading: true,
      hasError: false,
    });

    const { result } = renderHook(() => useVipEquityMultiplier());

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(result.current.status).toBe('loading');
    expect(Engine.controllerMessenger.call).not.toHaveBeenCalled();
  });

  it('reports an error when holdings cannot be determined', async () => {
    mockHoldings.mockReturnValue({
      holdingsUsd: undefined,
      isLoading: false,
      hasError: true,
    });

    const { result } = renderHook(() => useVipEquityMultiplier());

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(result.current.status).toBe('error');
    expect(Engine.controllerMessenger.call).not.toHaveBeenCalled();
  });

  it('reports an error when the request fails, and recovers on retry', async () => {
    (Engine.controllerMessenger.call as jest.Mock).mockRejectedValueOnce(
      new Error('boom'),
    );

    const { result } = renderHook(() => useVipEquityMultiplier());

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status).toBe('error');

    (Engine.controllerMessenger.call as jest.Mock).mockResolvedValue(
      buildAvailableResult('10000000'),
    );

    await act(async () => {
      result.current.retry();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.data?.capUsd).toBe('10000000');
  });

  it('fetches again for holdings that change while a request is in flight', async () => {
    const deferred: ((value: unknown) => void)[] = [];
    (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
      (_action, _subscriptionId, holdings: string) =>
        new Promise((resolve) => {
          deferred.push(() => resolve(buildAvailableResult(holdings)));
        }),
    );

    const { result, rerender } = renderHook(() => useVipEquityMultiplier());

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(1);

    mockHoldings.mockReturnValue({
      holdingsUsd: '7000000',
      isLoading: false,
      hasError: false,
    });
    rerender();
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(2);
    expect(Engine.controllerMessenger.call).toHaveBeenLastCalledWith(
      'RewardsController:getVipEquityMultiplier',
      'sub-1',
      '7000000',
    );

    await act(async () => {
      deferred.forEach((resolveDeferred) => resolveDeferred(undefined));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.holdingsUsd).toBe('7000000');
    expect(result.current.data?.capUsd).toBe('7000000');
  });

  it('discards a superseded response so state matches the latest holdings', async () => {
    const resolvers = new Map<string, (value: unknown) => void>();
    (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
      (_action, _subscriptionId, holdings: string) =>
        new Promise((resolve) => {
          resolvers.set(holdings, () =>
            resolve(buildAvailableResult(holdings)),
          );
        }),
    );

    const { result, rerender } = renderHook(() => useVipEquityMultiplier());

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    mockHoldings.mockReturnValue({
      holdingsUsd: '7000000',
      isLoading: false,
      hasError: false,
    });
    rerender();
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    // Newest response settles first, stale one arrives afterwards.
    await act(async () => {
      resolvers.get('7000000')?.(undefined);
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      resolvers.get('5000000')?.(undefined);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.data?.capUsd).toBe('7000000');
    expect(result.current.holdingsUsd).toBe('7000000');
  });

  it('does not issue duplicate requests for unchanged holdings', async () => {
    let resolveCall: ((value: unknown) => void) | undefined;
    (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCall = () => resolve(buildAvailableResult('5000000'));
        }),
    );

    const { rerender } = renderHook(() => useVipEquityMultiplier());

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(1);

    rerender();
    await act(async () => {
      await Promise.resolve();
    });

    expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCall?.(undefined);
      await Promise.resolve();
      await Promise.resolve();
    });
  });
});
