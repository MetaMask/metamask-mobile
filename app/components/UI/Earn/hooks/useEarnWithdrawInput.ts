import { useMemo } from 'react';
import useBalance from '../../Stake/hooks/useBalance';
import { EarnTokenDetails } from './useEarnTokenDetails';
import useInputHandler from './useInput';

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

  // TODO: implement balanceMinimalUnit value for the earn token's underlying token
  // once we have this data to link the two tokens in the state
  const balanceMinimalUnit = earnToken.isETH ? stakedBalanceWei : '0';

  const {
    amountToken,
    amountTokenMinimalUnit,
    amountFiatNumber,
    isFiat,
    currencyToggleValue,
    isNonZeroAmount,
    isOverMaximum: isOverMaximumFromInputHandler,
    handleKeypadChange,
    handleCurrencySwitch,
    percentageOptions,
    handleQuickAmountPress,
    currentCurrency,
  } = useInputHandler({
    balance: balanceMinimalUnit,
    decimals: earnToken.decimals,
    ticker: earnToken.ticker ?? earnToken.symbol,
    conversionRate,
    exchangeRate,
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

  // TODO: implement balanceMinimalUnit value for the earn token's underlying token
  // once we have this data to link the two tokens in the state
  const earnBalanceValue = isFiat
    ? `${stakedBalanceFiatNumber?.toString()} ${currentCurrency.toUpperCase()}`
    : formattedStakedBalanceETH;

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
