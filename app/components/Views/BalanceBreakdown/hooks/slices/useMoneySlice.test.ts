import { renderHook } from '@testing-library/react-native';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import useMoneyAccountInfo from '../../../../UI/Money/hooks/useMoneyAccountInfo';
import { getMoneySliceStatus, useMoneySlice } from './useMoneySlice';

jest.mock('../../../../UI/Money/hooks/useMoneyAccountBalance');
jest.mock('../../../../UI/Money/hooks/useMoneyAccountInfo');

const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);
const mockUseMoneyAccountInfo = jest.mocked(useMoneyAccountInfo);

const READY_INPUT = {
  isFeatureEnabled: true,
  hasMoneyAccount: true,
  isBalanceLoading: false,
  isBalanceFetchError: false,
  hasTokenTotal: true,
};

describe('getMoneySliceStatus', () => {
  it('requires the feature and an existing account', () => {
    expect(
      getMoneySliceStatus({ ...READY_INPUT, hasMoneyAccount: false }),
    ).toBe('ineligible');
    expect(
      getMoneySliceStatus({ ...READY_INPUT, isFeatureEnabled: false }),
    ).toBe('ineligible');
  });

  it('distinguishes loading, error, and a canonical ready value', () => {
    expect(
      getMoneySliceStatus({ ...READY_INPUT, isBalanceLoading: true }),
    ).toBe('loading');
    expect(
      getMoneySliceStatus({ ...READY_INPUT, isBalanceFetchError: true }),
    ).toBe('error');
    expect(getMoneySliceStatus(READY_INPUT)).toBe('ready');
  });
});

describe('useMoneySlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountInfo.mockReturnValue({
      isMoneyAccountFeatureEnabled: true,
      hasMoneyAccount: true,
    } as ReturnType<typeof useMoneyAccountInfo>);
    mockUseMoneyAccountBalance.mockReturnValue({
      tokenTotal: { toNumber: () => 100 },
      isBalanceLoading: false,
      isBalanceFetchError: false,
      apyPercent: 4.1,
      vaultApyQuery: { isLoading: false },
    } as ReturnType<typeof useMoneyAccountBalance>);
  });

  it('converts a ready balance and exposes its APY', () => {
    const { result } = renderHook(() => useMoneySlice((amount) => amount * 2));

    expect(result.current).toEqual({
      key: 'money',
      valueFiat: 200,
      status: 'ready',
      apyPercentFormatted: '4.1%',
      apyLoading: false,
    });
  });

  it('stays loading while fiat conversion is unavailable', () => {
    const { result } = renderHook(() => useMoneySlice(() => undefined));

    expect(result.current).toEqual({
      key: 'money',
      valueFiat: 0,
      status: 'loading',
      apyPercentFormatted: '4.1%',
      apyLoading: false,
    });
  });

  it('exposes APY loading independently of balance readiness', () => {
    mockUseMoneyAccountBalance.mockReturnValue({
      tokenTotal: { toNumber: () => 100 },
      isBalanceLoading: false,
      isBalanceFetchError: false,
      apyPercent: undefined,
      vaultApyQuery: { isLoading: true },
    } as ReturnType<typeof useMoneyAccountBalance>);

    const { result } = renderHook(() => useMoneySlice((amount) => amount));

    expect(result.current.apyLoading).toBe(true);
    expect(result.current.apyPercentFormatted).toBeUndefined();
  });

  it('exposes APY before an eligible user creates a Money account', () => {
    mockUseMoneyAccountInfo.mockReturnValue({
      isMoneyAccountFeatureEnabled: true,
      hasMoneyAccount: false,
    } as ReturnType<typeof useMoneyAccountInfo>);

    const { result } = renderHook(() => useMoneySlice((amount) => amount));

    expect(result.current.status).toBe('ineligible');
    expect(result.current.apyPercentFormatted).toBe('4.1%');
    expect(result.current.apyLoading).toBe(false);
  });

  it('returns an ineligible zero balance without APY', () => {
    mockUseMoneyAccountInfo.mockReturnValue({
      isMoneyAccountFeatureEnabled: false,
      hasMoneyAccount: false,
    } as ReturnType<typeof useMoneyAccountInfo>);
    mockUseMoneyAccountBalance.mockReturnValue({
      tokenTotal: undefined,
      isBalanceLoading: false,
      isBalanceFetchError: false,
      apyPercent: undefined,
      vaultApyQuery: { isLoading: false },
    } as ReturnType<typeof useMoneyAccountBalance>);

    const { result } = renderHook(() => useMoneySlice((amount) => amount));

    expect(result.current).toEqual({
      key: 'money',
      valueFiat: 0,
      status: 'ineligible',
      apyPercentFormatted: '0%',
      apyLoading: false,
    });
  });
});
