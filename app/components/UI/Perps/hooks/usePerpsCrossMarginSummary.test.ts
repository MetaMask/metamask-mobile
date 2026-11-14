import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { AccountState, Position } from '@metamask/perps-controller';
import { usePerpsCrossMarginSummary } from './usePerpsCrossMarginSummary';
import { usePerpsLiveAccount, usePerpsLivePositions } from './stream';
import { selectPerpsCrossMarginEnabledFlag } from '../selectors/featureFlags';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('./stream', () => ({
  usePerpsLiveAccount: jest.fn(),
  usePerpsLivePositions: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;
const mockUsePerpsLiveAccount = usePerpsLiveAccount as jest.Mock;
const mockUsePerpsLivePositions = usePerpsLivePositions as jest.Mock;

const crossAccount = {
  totalBalance: '1000',
  crossMarginSummary: {
    accountValue: '1000',
    maintenanceMargin: '630',
    marginUsed: '730',
    notional: '12500',
  },
} as AccountState;

const givenFlag = (enabled: boolean) => {
  mockUseSelector.mockImplementation((selector: unknown) =>
    selector === selectPerpsCrossMarginEnabledFlag ? enabled : undefined,
  );
};

describe('usePerpsCrossMarginSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    givenFlag(true);
    mockUsePerpsLiveAccount.mockReturnValue({
      account: crossAccount,
      isInitialLoading: false,
    });
    mockUsePerpsLivePositions.mockReturnValue({ positions: [] });
  });

  it('returns cross margin metrics and tone for a cross account', () => {
    const { result } = renderHook(() => usePerpsCrossMarginSummary());

    expect(result.current).toEqual(
      expect.objectContaining({
        accountRatio: 0.63,
        maintenanceMargin: 630,
        accountLeverage: 12.5,
        crossMarginUsage: 0.73,
        tone: 'warning',
        hasCrossExposure: true,
        isCrossMarginEnabled: true,
      }),
    );
  });

  it('reports cross exposure from a cross position when maintenance margin is zero', () => {
    mockUsePerpsLiveAccount.mockReturnValue({
      account: {
        ...crossAccount,
        crossMarginSummary: {
          ...crossAccount.crossMarginSummary,
          maintenanceMargin: '0',
        },
      },
      isInitialLoading: false,
    });
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [{ symbol: 'BTC', leverage: { type: 'cross', value: 10 } }],
    });

    const { result } = renderHook(() => usePerpsCrossMarginSummary());

    expect(result.current.hasCrossExposure).toBe(true);
  });

  it('reports no cross exposure for an isolated-only account', () => {
    mockUsePerpsLiveAccount.mockReturnValue({
      account: {
        ...crossAccount,
        crossMarginSummary: {
          accountValue: '1000',
          maintenanceMargin: '0',
          marginUsed: '0',
          notional: '0',
        },
      },
      isInitialLoading: false,
    });
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [
        { symbol: 'BTC', leverage: { type: 'isolated', value: 10 } },
      ] as Position[],
    });

    const { result } = renderHook(() => usePerpsCrossMarginSummary());

    expect(result.current.hasCrossExposure).toBe(false);
    expect(result.current.tone).toBe('safe');
  });

  it('returns empty metrics when the flag is off', () => {
    givenFlag(false);

    const { result } = renderHook(() => usePerpsCrossMarginSummary());

    expect(result.current.isCrossMarginEnabled).toBe(false);
    expect(result.current.hasCrossExposure).toBe(false);
    expect(result.current.accountRatio).toBeUndefined();
    expect(mockUsePerpsLiveAccount).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(mockUsePerpsLivePositions).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('skips the positions subscription when the caller disables it', () => {
    renderHook(() => usePerpsCrossMarginSummary({ enabled: false }));

    expect(mockUsePerpsLivePositions).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});
