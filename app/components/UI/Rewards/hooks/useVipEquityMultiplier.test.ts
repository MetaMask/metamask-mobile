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

const mockHoldings = jest.fn(() => ({
  holdingsUsd: '5000000' as string | undefined,
}));

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

describe('useVipEquityMultiplier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockHoldings.mockReturnValue({ holdingsUsd: '5000000' });
    mockUseFocusEffect.mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('sets shouldRender when available:true is returned', async () => {
    (Engine.controllerMessenger.call as jest.Mock).mockResolvedValue({
      available: true,
      multiplier: '1.0889',
      eligible: true,
      progressPercent: 44.4,
      tierNumber: 6,
      tierName: 'VIP 6',
      capUsd: '10000000',
      computedAt: '2026-08-04T00:00:00.000Z',
      localizedText: {
        title: 'Estimated equity multiplier',
        eligibleDescription: 'ok',
        ineligibleDescription: 'no',
      },
    });

    const { result } = renderHook(() => useVipEquityMultiplier());

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.shouldRender).toBe(true);
    expect(result.current.data?.multiplier).toBe('1.0889');
    expect(result.current.holdingsUsd).toBe('5000000');
    expect(result.current.data).not.toHaveProperty('holdingsUsd');
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

    expect(result.current.shouldRender).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('hides when holdings are still loading', async () => {
    mockHoldings.mockReturnValue({ holdingsUsd: undefined });

    const { result } = renderHook(() => useVipEquityMultiplier());

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(result.current.shouldRender).toBe(false);
    expect(Engine.controllerMessenger.call).not.toHaveBeenCalled();
  });
});
