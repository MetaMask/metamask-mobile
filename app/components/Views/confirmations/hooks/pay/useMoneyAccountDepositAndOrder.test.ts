import { CHAIN_IDS } from '@metamask/transaction-controller';
import { renderHook } from '@testing-library/react-native';
import { MUSD_TOKEN_ADDRESS } from '../../../../UI/Earn/constants/musd';
import { useAutomaticMoneyAccountPayToken } from './useAutomaticMoneyAccountPayToken';
import { useDefaultPaySelectedSection } from './useDefaultPaySelectedSection';
import { useIsMoneyAccountPaymentOverride } from './useIsMoneyAccountPaymentOverride';
import { useMoneyAccountDepositAndOrder } from './useMoneyAccountDepositAndOrder';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useTransactionPayToken } from './useTransactionPayToken';

jest.mock('./useAutomaticMoneyAccountPayToken');
jest.mock('./useDefaultPaySelectedSection');
jest.mock('./useIsMoneyAccountPaymentOverride');
jest.mock('./useTransactionPayAvailableTokens');
jest.mock('./useTransactionPayData');
jest.mock('./useTransactionPayToken');

const ARBITRUM_USDC_MOCK = {
  address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  chainId: CHAIN_IDS.ARBITRUM,
};

describe('useMoneyAccountDepositAndOrder', () => {
  const setPayTokenMock = jest.fn();
  const useAutomaticMoneyAccountPayTokenMock = jest.mocked(
    useAutomaticMoneyAccountPayToken,
  );
  const useIsMoneyAccountPaymentOverrideMock = jest.mocked(
    useIsMoneyAccountPaymentOverride,
  );
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);

  beforeEach(() => {
    jest.clearAllMocks();

    useIsMoneyAccountPaymentOverrideMock.mockReturnValue(false);
    useAutomaticMoneyAccountPayTokenMock.mockReturnValue({
      isPending: false,
      shouldSelect: false,
    });
    jest.mocked(useTransactionPayAvailableTokens).mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });
    jest.mocked(useTransactionPayFiatPayment).mockReturnValue(undefined);
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: setPayTokenMock,
    });
  });

  it('mounts the default-pay-section hook so the remote flag applies to this flow', () => {
    renderHook(() => useMoneyAccountDepositAndOrder());

    expect(useDefaultPaySelectedSection).toHaveBeenCalled();
  });

  it('mounts the money account fallback with the current pay state', () => {
    jest.mocked(useTransactionPayAvailableTokens).mockReturnValue({
      availableTokens: [],
      hasTokens: true,
    });
    jest
      .mocked(useTransactionPayFiatPayment)
      .mockReturnValue({ selectedPaymentMethodId: 'card' } as never);
    useTransactionPayTokenMock.mockReturnValue({
      payToken: ARBITRUM_USDC_MOCK as never,
      setPayToken: setPayTokenMock,
    });

    renderHook(() => useMoneyAccountDepositAndOrder());

    expect(useAutomaticMoneyAccountPayTokenMock).toHaveBeenCalledWith({
      hasFiatPaymentSelected: true,
      hasTokenBalance: true,
      payTokenSelected: true,
    });
  });

  it('points the pay token at mUSD on Monad once the override is set', () => {
    useIsMoneyAccountPaymentOverrideMock.mockReturnValue(true);

    renderHook(() => useMoneyAccountDepositAndOrder());

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: MUSD_TOKEN_ADDRESS,
      chainId: CHAIN_IDS.MONAD,
    });
  });

  it('replaces a non-money-account pay token when the override is set', () => {
    useIsMoneyAccountPaymentOverrideMock.mockReturnValue(true);
    useTransactionPayTokenMock.mockReturnValue({
      payToken: ARBITRUM_USDC_MOCK as never,
      setPayToken: setPayTokenMock,
    });

    renderHook(() => useMoneyAccountDepositAndOrder());

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: MUSD_TOKEN_ADDRESS,
      chainId: CHAIN_IDS.MONAD,
    });
  });

  it('does not touch the pay token when no override is set', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: ARBITRUM_USDC_MOCK as never,
      setPayToken: setPayTokenMock,
    });

    renderHook(() => useMoneyAccountDepositAndOrder());

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('does not re-set the pay token when mUSD on Monad is already selected', () => {
    useIsMoneyAccountPaymentOverrideMock.mockReturnValue(true);
    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: MUSD_TOKEN_ADDRESS.toUpperCase(),
        chainId: CHAIN_IDS.MONAD,
      } as never,
      setPayToken: setPayTokenMock,
    });

    renderHook(() => useMoneyAccountDepositAndOrder());

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });
});
