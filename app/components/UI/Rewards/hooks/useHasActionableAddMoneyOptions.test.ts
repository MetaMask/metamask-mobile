import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { useMusdBalance } from '../../Earn/hooks/useMusdBalance';
import { useMMPayFiatConfig } from '../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { useRegionHasFiatProvider } from '../../Ramp/hooks/useRegionHasFiatProvider';
import { useMoneyAccountDepositAssetId } from '../../Money/hooks/useMoneyAccountDepositAssetId';
import { selectHasAnyNonZeroTokenBalance } from '../../../../selectors/tokenBalancesController';
import { useHasActionableAddMoneyOptions } from './useHasActionableAddMoneyOptions';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: jest.fn(),
}));

jest.mock('../../../Views/confirmations/hooks/pay/useMMPayFiatConfig', () => ({
  useMMPayFiatConfig: jest.fn(),
}));

jest.mock('../../Ramp/hooks/useRegionHasFiatProvider', () => ({
  useRegionHasFiatProvider: jest.fn(),
}));

jest.mock('../../Money/hooks/useMoneyAccountDepositAssetId', () => ({
  useMoneyAccountDepositAssetId: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseMusdBalance = useMusdBalance as jest.MockedFunction<
  typeof useMusdBalance
>;
const mockUseMMPayFiatConfig = useMMPayFiatConfig as jest.MockedFunction<
  typeof useMMPayFiatConfig
>;
const mockUseRegionHasFiatProvider =
  useRegionHasFiatProvider as jest.MockedFunction<
    typeof useRegionHasFiatProvider
  >;
const mockUseMoneyAccountDepositAssetId =
  useMoneyAccountDepositAssetId as jest.MockedFunction<
    typeof useMoneyAccountDepositAssetId
  >;

const DEPOSIT_ASSET_ID = 'eip155:1/erc20:0xmusd';

function setDefaults({
  hasAnyCryptoBalance = false,
  enabledTransactionTypes = [] as TransactionType[],
  regionHasFiatProvider = false,
  hasMusdBalanceOnAnyChain = false,
  fiatBalanceAggregated = '0',
}: {
  hasAnyCryptoBalance?: boolean;
  enabledTransactionTypes?: TransactionType[];
  regionHasFiatProvider?: boolean;
  hasMusdBalanceOnAnyChain?: boolean;
  fiatBalanceAggregated?: string;
} = {}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectHasAnyNonZeroTokenBalance) {
      return hasAnyCryptoBalance;
    }
    return undefined;
  });
  mockUseMusdBalance.mockReturnValue({
    fiatBalanceAggregated,
    hasMusdBalanceOnAnyChain,
  } as ReturnType<typeof useMusdBalance>);
  mockUseMMPayFiatConfig.mockReturnValue({
    enabledTransactionTypes,
  } as ReturnType<typeof useMMPayFiatConfig>);
  mockUseMoneyAccountDepositAssetId.mockReturnValue(DEPOSIT_ASSET_ID);
  mockUseRegionHasFiatProvider.mockReturnValue(regionHasFiatProvider);
}

describe('useHasActionableAddMoneyOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setDefaults();
  });

  it('returns false when no crypto, fiat deposit, or mUSD path is available', () => {
    const { result } = renderHook(() => useHasActionableAddMoneyOptions());

    expect(result.current).toBe(false);
    expect(mockUseRegionHasFiatProvider).toHaveBeenCalledWith(DEPOSIT_ASSET_ID);
  });

  it('returns true when wallet has a non-zero crypto balance', () => {
    setDefaults({ hasAnyCryptoBalance: true });

    const { result } = renderHook(() => useHasActionableAddMoneyOptions());

    expect(result.current).toBe(true);
  });

  it('returns true when fiat deposit is enabled and region has a provider', () => {
    setDefaults({
      enabledTransactionTypes: [TransactionType.moneyAccountDeposit],
      regionHasFiatProvider: true,
    });

    const { result } = renderHook(() => useHasActionableAddMoneyOptions());

    expect(result.current).toBe(true);
  });

  it('returns false when fiat deposit is enabled but region has no provider', () => {
    setDefaults({
      enabledTransactionTypes: [TransactionType.moneyAccountDeposit],
      regionHasFiatProvider: false,
    });

    const { result } = renderHook(() => useHasActionableAddMoneyOptions());

    expect(result.current).toBe(false);
  });

  it('returns false when region has a provider but fiat deposit is not enabled', () => {
    setDefaults({
      enabledTransactionTypes: [],
      regionHasFiatProvider: true,
    });

    const { result } = renderHook(() => useHasActionableAddMoneyOptions());

    expect(result.current).toBe(false);
  });

  it('returns true when mUSD balance exists on any chain', () => {
    setDefaults({ hasMusdBalanceOnAnyChain: true });

    const { result } = renderHook(() => useHasActionableAddMoneyOptions());

    expect(result.current).toBe(true);
  });

  it('returns true when aggregated mUSD fiat balance is greater than zero', () => {
    setDefaults({
      hasMusdBalanceOnAnyChain: false,
      fiatBalanceAggregated: '12.50',
    });

    const { result } = renderHook(() => useHasActionableAddMoneyOptions());

    expect(result.current).toBe(true);
  });

  it('returns false when aggregated mUSD fiat balance is not a positive number', () => {
    setDefaults({
      hasMusdBalanceOnAnyChain: false,
      fiatBalanceAggregated: 'not-a-number',
    });

    const { result } = renderHook(() => useHasActionableAddMoneyOptions());

    expect(result.current).toBe(false);
  });
});
