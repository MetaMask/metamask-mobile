import { useMemo } from 'react';
import useBalance from '../../Stake/hooks/useBalance';
import useInputHandler from './useInput';
import { EarnTokenDetails } from '../types/lending.types';
import useMultichainInputHandlers from './useMultichainInputHandlers';

const useEarnWithdrawInputHandlers = ({
  earnToken,
  conversionRate,
  exchangeRate,
}: {
  earnToken: EarnTokenDetails;
  conversionRate: number;
  exchangeRate: number;
}) => {
  const {
    stakedBalanceWei,
    formattedStakedBalanceETH,
    stakedBalanceFiatNumber,
  } = useBalance();

  const balanceMinimalUnit = earnToken.isETH
    ? stakedBalanceWei
    : earnToken?.balanceMinimalUnit;

  const {
    amountToken,
    amountTokenMinimalUnit,
    amountFiatNumber: evmAmountFiatNumber,
    isFiat,
    currencyToggleValue: evmCurrencyToggleValue,
    isNonZeroAmount,
    isOverMaximum: isOverMaximumFromInputHandler,
    handleKeypadChange: evmHandleKeypadChange,
    handleCurrencySwitch: evmHandleCurrencySwitch,
    percentageOptions,
    handleQuickAmountPress: evmHandleQuickAmountPress,
    currentCurrency,
    handleTokenInput: evmHandleTokenInput,
    handleFiatInput: evmHandleFiatInput,
  } = useInputHandler({
    balance: balanceMinimalUnit,
    decimals: earnToken.decimals,
    ticker: earnToken.ticker ?? earnToken.symbol,
    conversionRate,
    exchangeRate,
  });

  const {
    isNonEvm,
    nonEvmFiatRate,
    currencyToggleValue,
    handleKeypadChange,
    handleCurrencySwitch,
    handleQuickAmountPress,
    amountFiatNumber,
  } = useMultichainInputHandlers({
    earnToken,
    evmHandlers: {
      isFiat,
      currencyToggleValue: evmCurrencyToggleValue,
      handleKeypadChange: evmHandleKeypadChange,
      handleCurrencySwitch: evmHandleCurrencySwitch,
      handleQuickAmountPress: evmHandleQuickAmountPress,
      handleTokenInput: evmHandleTokenInput,
      handleFiatInput: evmHandleFiatInput,
      amountToken,
      amountFiatNumber: evmAmountFiatNumber,
      currentCurrency,
    },
  });

  // TODO: this does not consider gas fee, as staking does not seem to have one for withdrawal
  // once we use the lending contracts, we may need to consider gas here
  const isOverMaximum = useMemo(
    () => ({
      isOverMaximumEth: isOverMaximumFromInputHandler,
      isOverMaximumToken: isOverMaximumFromInputHandler,
    }),
    [isOverMaximumFromInputHandler],
  );

  // For non-EVM chains calculate balance fiat using multichain rate
  const earnBalanceFiatValue = useMemo(() => {
    if (isNonEvm && nonEvmFiatRate && nonEvmFiatRate > 0) {
      const balanceNumber = parseFloat(earnToken?.balanceFormatted ?? '0') || 0;
      return (balanceNumber * nonEvmFiatRate).toFixed(2);
    }
    return stakedBalanceFiatNumber?.toString();
  }, [
    isNonEvm,
    nonEvmFiatRate,
    earnToken?.balanceFormatted,
    stakedBalanceFiatNumber,
  ]);

  // For non-EVM chains use the token's formatted balance
  const earnBalanceTokenValue = useMemo(() => {
    if (isNonEvm) {
      return earnToken?.balanceFormatted ?? '0';
    }
    return formattedStakedBalanceETH;
  }, [isNonEvm, earnToken?.balanceFormatted, formattedStakedBalanceETH]);

  const earnBalanceValue = isFiat
    ? `${earnBalanceFiatValue} ${currentCurrency.toUpperCase()}`
    : earnBalanceTokenValue;

  return {
    isFiat,
    currentCurrency,
    isNonZeroAmount,
    amountToken,
    amountTokenMinimalUnit,
    amountFiatNumber,
    isOverMaximum,
    handleCurrencySwitch,
    currencyToggleValue,
    percentageOptions,
    handleQuickAmountPress,
    handleKeypadChange,
    earnBalanceValue,
  };
};

export default useEarnWithdrawInputHandlers;
