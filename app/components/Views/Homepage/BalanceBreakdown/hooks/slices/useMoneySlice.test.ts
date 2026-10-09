import { renderHook } from '@testing-library/react-native';
import BigNumber from 'bignumber.js';
import { useSelector } from 'react-redux';
import useMoneyAccountBalance from '../../../../../UI/Money/hooks/useMoneyAccountBalance';
import useMoneyVaultApy from '../../../../../UI/Money/hooks/useMoneyVaultApy';
import useMoneyAccountInfo from '../../../../../UI/Money/hooks/useMoneyAccountInfo';
import { getMoneySliceStatus, useMoneySlice } from './useMoneySlice';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('../../../../../UI/Money/hooks/useMoneyAccountBalance');
jest.mock('../../../../../UI/Money/hooks/useMoneyVaultApy');
jest.mock('../../../../../UI/Money/hooks/useMoneyAccountInfo');

const mockUseSelector = jest.mocked(useSelector);
const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);
const mockUseMoneyVaultApy = jest.mocked(useMoneyVaultApy);
const mockUseMoneyAccountInfo = jest.mocked(useMoneyAccountInfo);

const READY_INPUT = {
  isMoneyAccountVisible: true,
  hasMoneyAccount: true,
  isBalanceLoading: false,
  isBalanceFetchError: false,
  hasTokenTotal: true,
};

describe('getMoneySliceStatus', () => {
  it('requires Money visibility and an existing account', () => {
    expect(
      getMoneySliceStatus({ ...READY_INPUT, hasMoneyAccount: false }),
    ).toBe('ineligible');
    expect(
      getMoneySliceStatus({ ...READY_INPUT, isMoneyAccountVisible: false }),
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
    mockUseSelector.mockReturnValue(true);
    mockUseMoneyAccountInfo.mockReturnValue({
      isMoneyAccountFeatureEnabled: true,
      hasMoneyAccount: true,
    } as ReturnType<typeof useMoneyAccountInfo>);
    mockUseMoneyAccountBalance.mockReturnValue({
      tokenTotal: new BigNumber(100),
      isBalanceLoading: false,
      isBalanceFetchError: false,
    } as ReturnType<typeof useMoneyAccountBalance>);
    mockUseMoneyVaultApy.mockReturnValue({
      apyPercent: 4.1,
      vaultApyQuery: { isLoading: false },
    } as ReturnType<typeof useMoneyVaultApy>);
  });

  it('converts a ready balance and exposes its APY', () => {
    const { result } = renderHook(() => useMoneySlice((amount) => amount * 2));

    expect(result.current).toEqual({
      key: 'money',
      isVisible: true,
      valueFiat: 200,
      status: 'ready',
      apyPercent: 4.1,
      apyLoading: false,
    });
  });

  it('reports an error when fiat conversion is unavailable', () => {
    const { result } = renderHook(() => useMoneySlice(() => undefined));

    expect(result.current).toEqual({
      key: 'money',
      isVisible: true,
      valueFiat: 0,
      status: 'error',
      apyPercent: 4.1,
      apyLoading: false,
    });
  });

  it('exposes APY loading independently of balance readiness', () => {
    mockUseMoneyVaultApy.mockReturnValue({
      apyPercent: undefined,
      vaultApyQuery: { isLoading: true },
    } as ReturnType<typeof useMoneyVaultApy>);

    const { result } = renderHook(() => useMoneySlice((amount) => amount));

    expect(result.current.apyLoading).toBe(true);
    expect(result.current.apyPercent).toBeUndefined();
  });

  it('does not fabricate APY after a settled query without a rate', () => {
    mockUseMoneyVaultApy.mockReturnValue({
      apyPercent: undefined,
      vaultApyQuery: { isLoading: false },
    } as ReturnType<typeof useMoneyVaultApy>);

    const { result } = renderHook(() => useMoneySlice((amount) => amount));

    expect(result.current.apyLoading).toBe(false);
    expect(result.current.apyPercent).toBeUndefined();
  });

  it('preserves a genuine zero APY', () => {
    mockUseMoneyVaultApy.mockReturnValue({
      apyPercent: 0,
      vaultApyQuery: { isLoading: false },
    } as ReturnType<typeof useMoneyVaultApy>);

    const { result } = renderHook(() => useMoneySlice((amount) => amount));

    expect(result.current.apyPercent).toBe(0);
  });

  it('exposes APY before an eligible user creates a Money account', () => {
    mockUseMoneyAccountInfo.mockReturnValue({
      isMoneyAccountFeatureEnabled: true,
      hasMoneyAccount: false,
    } as ReturnType<typeof useMoneyAccountInfo>);

    const { result } = renderHook(() => useMoneySlice((amount) => amount));

    expect(result.current.status).toBe('ineligible');
    expect(result.current.apyPercent).toBe(4.1);
    expect(result.current.apyLoading).toBe(false);
  });

  it('hides an empty Money account when the account is geo-ineligible', () => {
    mockUseSelector.mockReturnValue(false);
    mockUseMoneyAccountBalance.mockReturnValue({
      tokenTotal: new BigNumber(0),
      isBalanceLoading: false,
      isBalanceFetchError: false,
    } as ReturnType<typeof useMoneyAccountBalance>);

    const { result } = renderHook(() => useMoneySlice((amount) => amount));

    expect(mockUseMoneyAccountBalance).toHaveBeenCalledWith({ enabled: true });
    expect(mockUseMoneyVaultApy).toHaveBeenCalledWith({ enabled: true });
    expect(result.current).toEqual({
      key: 'money',
      isVisible: false,
      valueFiat: 0,
      status: 'ineligible',
      apyPercent: undefined,
      apyLoading: false,
    });
  });

  it('shows a funded Money account with APY when the account is geo-ineligible', () => {
    mockUseSelector.mockReturnValue(false);

    const { result } = renderHook(() => useMoneySlice((amount) => amount));

    expect(mockUseMoneyAccountBalance).toHaveBeenCalledWith({ enabled: true });
    expect(mockUseMoneyVaultApy).toHaveBeenCalledWith({ enabled: true });
    expect(result.current).toEqual({
      key: 'money',
      isVisible: true,
      valueFiat: 100,
      status: 'ready',
      apyPercent: 4.1,
      apyLoading: false,
    });
  });
});
