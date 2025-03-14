import BN4 from 'bnjs4';
import useBalance from './useBalance';
import useInputHandler from './useInputHandler';

const useUnstakingInputHandlers = () => {
  const {
    stakedBalanceWei,
    formattedStakedBalanceETH,
    stakedBalanceFiatNumber,
  } = useBalance();

  const {
    amountEth,
    amountWei,
    fiatAmount,
    isEth,
    currencyToggleValue,
    isNonZeroAmount,
    isOverMaximum,
    handleKeypadChange,
    handleCurrencySwitch,
    percentageOptions,
    handleQuickAmountPress,
    currentCurrency,
  } = useInputHandler({ balance: new BN4(stakedBalanceWei) });

  const stakedBalanceValue = isEth
    ? formattedStakedBalanceETH
    : `${stakedBalanceFiatNumber?.toString()} ${currentCurrency.toUpperCase()}`;

  return {
    isEth,
    currentCurrency,
    isNonZeroAmount,
    amountEth,
    amountWei,
    fiatAmount,
    isOverMaximum,
    handleCurrencySwitch,
    currencyToggleValue,
    percentageOptions,
    handleQuickAmountPress,
    handleKeypadChange,
    stakedBalanceValue,
  };
};

export default useUnstakingInputHandlers;
