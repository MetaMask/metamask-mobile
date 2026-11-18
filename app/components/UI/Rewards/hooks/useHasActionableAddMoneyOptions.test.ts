import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { useMMPayFiatConfig } from '../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { useRegionHasFiatProvider } from '../../Ramp/hooks/useRegionHasFiatProvider';
import { useMoneyAccountDepositAssetId } from '../../Money/hooks/useMoneyAccountDepositAssetId';
import { selectHasAnyNonZeroTokenBalance } from '../../../../selectors/tokenBalancesController';
import { useHasActionableAddMoneyOptions } from './useHasActionableAddMoneyOptions';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
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
}: {
  hasAnyCryptoBalance?: boolean;
  enabledTransactionTypes?: TransactionType[];
  regionHasFiatProvider?: boolean;
} = {}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectHasAnyNonZeroTokenBalance) {
      return hasAnyCryptoBalance;
    }
    return undefined;
  });
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

  it('returns false when no crypto or fiat deposit path is available', () => {
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
});
