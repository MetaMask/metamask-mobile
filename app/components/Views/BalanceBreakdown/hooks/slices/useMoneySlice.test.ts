import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import useMoneyAccountInfo from '../../../../UI/Money/hooks/useMoneyAccountInfo';
import { getMoneySliceStatus, useMoneySlice } from './useMoneySlice';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../UI/Money/hooks/useMoneyAccountBalance');
jest.mock('../../../../UI/Money/hooks/useMoneyAccountInfo');

const mockUseSelector = jest.mocked(useSelector);
const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);
const mockUseMoneyAccountInfo = jest.mocked(useMoneyAccountInfo);

const READY_INPUT = {
  isFeatureEnabled: true,
  isGeoEligible: true,
  hasMoneyAccount: true,
  isBalanceLoading: false,
  isBalanceFetchError: false,
  hasTokenTotal: true,
};

describe('getMoneySliceStatus', () => {
  it('requires feature, geo, and account eligibility', () => {
    expect(getMoneySliceStatus({ ...READY_INPUT, isGeoEligible: false })).toBe(
      'ineligible',
    );
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
      tokenTotal: { toNumber: () => 100 },
      isBalanceLoading: false,
      isBalanceFetchError: false,
      apyPercentFormatted: '4.1%',
    } as ReturnType<typeof useMoneyAccountBalance>);
  });

  it('converts a ready balance and exposes its APY', () => {
    const { result } = renderHook(() => useMoneySlice((amount) => amount * 2));

    expect(result.current).toEqual({
      key: 'money',
      valueFiat: 200,
      status: 'ready',
      apyPercentFormatted: '4.1%',
    });
  });

  it('stays loading while fiat conversion is unavailable', () => {
    const { result } = renderHook(() => useMoneySlice(() => undefined));

    expect(result.current).toEqual({
      key: 'money',
      valueFiat: 0,
      status: 'loading',
      apyPercentFormatted: undefined,
    });
  });

  it('returns an ineligible zero balance without APY', () => {
    mockUseMoneyAccountInfo.mockReturnValue({
      isMoneyAccountFeatureEnabled: false,
      hasMoneyAccount: false,
    } as ReturnType<typeof useMoneyAccountInfo>);

    const { result } = renderHook(() => useMoneySlice((amount) => amount));

    expect(result.current).toEqual({
      key: 'money',
      valueFiat: 0,
      status: 'ineligible',
      apyPercentFormatted: undefined,
    });
  });
});
