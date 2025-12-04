import BigNumber from 'bignumber.js';
import BN4 from 'bnjs4';
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { CaipAssetType } from '@metamask/utils';
import {
  addCurrencySymbol,
  fromTokenMinimalUnit,
  limitToMaximumDecimalPlaces,
  renderFiat,
  weiToFiatNumber,
} from '../../../../util/number';
import { Keys } from '../../../Base/Keypad/constants';
import useBalance from '../../Stake/hooks/useBalance';
import { EarnTokenDetails } from '../types/lending.types';
import useEarnDepositGasFee from './useEarnGasFee';
import { useEarnMetadata } from './useEarnMetadata';
import useInputHandler from './useInput';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';

export interface EarnInputProps {
  earnToken: EarnTokenDetails;
  conversionRate: number;
  exchangeRate: number;
}

const useEarnInputHandlers = ({
  earnToken,
  conversionRate,
  exchangeRate,
}: EarnInputProps) => {
  const { balanceWei, balanceETH, balanceFiatNumber } = useBalance();
  const [estimatedAnnualRewards, setEstimatedAnnualRewards] = useState('-');

  // Non-EVM chain support: get multichain asset rates for fiat conversion
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
  const isNonEvm = useMemo(
    () => isNonEvmChainId(earnToken?.chainId ?? ''),
    [earnToken?.chainId],
  );

  const nonEvmFiatRate = useMemo(() => {
    if (!isNonEvm || !earnToken?.address) return undefined;
    const rate = multichainAssetsRates?.[earnToken.address as CaipAssetType];
    return rate?.rate ? Number(rate.rate) : undefined;
  }, [isNonEvm, earnToken?.address, multichainAssetsRates]);

  const balanceMinimalUnit: BN4 = useMemo(
    () => new BN4(earnToken?.balanceMinimalUnit ?? '0'),
    [earnToken?.balanceMinimalUnit],
  );

  const {
    isFiat,
    currencyToggleValue: evmCurrencyToggleValue,
    isNonZeroAmount,
    handleKeypadChange: evmHandleKeypadChange,
    handleCurrencySwitch: evmHandleCurrencySwitch,
    percentageOptions,
    handleQuickAmountPress: evmHandleQuickAmountPress,
    currentCurrency,
    handleTokenInput: evmHandleTokenInput,
    handleFiatInput: evmHandleFiatInput,
    amountToken,
    amountTokenMinimalUnit,
    amountFiatNumber: evmAmountFiatNumber,
    handleMaxInput,
  } = useInputHandler({
    balance: earnToken?.balanceMinimalUnit ?? '0',
    decimals: earnToken?.decimals ?? 0,
    ticker: earnToken?.ticker ?? earnToken?.symbol,
    conversionRate,
    exchangeRate,
  });

  // For non-EVM chains, track the typed fiat value directly to preserve user input
  const [nonEvmTypedFiatValue, setNonEvmTypedFiatValue] = useState<
    string | null
  >(null);

  // Reset typed fiat value when switching currency modes
  const handleCurrencySwitch = useCallback(() => {
    setNonEvmTypedFiatValue(null);
    evmHandleCurrencySwitch();
  }, [evmHandleCurrencySwitch]);

  // Wrapper for token input that clears the typed fiat value
  const handleTokenInput = useCallback(
    (value: string) => {
      setNonEvmTypedFiatValue(null);
      evmHandleTokenInput(value);
    },
    [evmHandleTokenInput],
  );

  // Wrapper for quick amount press that clears the typed fiat value
  const handleQuickAmountPress = useCallback(
    (params: { value: number }) => {
      setNonEvmTypedFiatValue(null);
      evmHandleQuickAmountPress(params);
    },
    [evmHandleQuickAmountPress],
  );

  // For non-EVM chains override fiat input to convert fiat → token using correct rate
  const nonEvmHandleFiatInput = useCallback(
    (value: string) => {
      if (!nonEvmFiatRate || nonEvmFiatRate <= 0) {
        evmHandleFiatInput(value);
        return;
      }
      // Store the typed fiat value directly for display
      setNonEvmTypedFiatValue(value);
      // Convert fiat to token: tokenAmount = fiatValue / rate
      const fiatValue = parseFloat(value) || 0;
      const tokenValue = fiatValue / nonEvmFiatRate;
      const tokenValueString = tokenValue.toFixed(5);
      // Use the token input handler with the converted value (without clearing typed fiat)
      evmHandleTokenInput(tokenValueString);
    },
    [nonEvmFiatRate, evmHandleFiatInput, evmHandleTokenInput],
  );

  // Select the appropriate fiat input handler
  const handleFiatInput = isNonEvm ? nonEvmHandleFiatInput : evmHandleFiatInput;

  // For non-EVM chains override keypad change to use our fiat handler
  const handleKeypadChange = useCallback(
    ({ value, pressedKey }: { value: string; pressedKey: string }) => {
      if (!isNonEvm) {
        evmHandleKeypadChange({ value, pressedKey });
        return;
      }

      // Replicate the validation logic from useInput.ts
      const digitsOnly = value.replace(/[^0-9.]/g, '');
      const [whole = '', fraction = ''] = digitsOnly.split('.');
      const totalDigits = whole.length + fraction.length;
      const isValueNaN = isNaN(parseFloat(value));
      const MAX_DIGITS = 12;
      const MAX_FRACTION_DIGITS = 5;

      if (
        pressedKey === Keys.Back ||
        isValueNaN ||
        (totalDigits <= MAX_DIGITS &&
          fraction.length <= MAX_FRACTION_DIGITS &&
          value !== amountToken)
      ) {
        if (isValueNaN) {
          if (
            pressedKey === digitsOnly[digitsOnly.length - 1] ||
            pressedKey === Keys.Period
          ) {
            value = pressedKey === Keys.Period ? '0.' : pressedKey;
          } else {
            value = '0';
          }
        }
        isFiat ? nonEvmHandleFiatInput(value) : handleTokenInput(value);
      }
    },
    [
      isNonEvm,
      evmHandleKeypadChange,
      isFiat,
      nonEvmHandleFiatInput,
      handleTokenInput,
      amountToken,
    ],
  );

  // For non-EVM chains, recalculate fiat amount using multichain rates
  // When user is typing in fiat mode, preserve their exact input
  const amountFiatNumber = useMemo(() => {
    if (!isNonEvm || !nonEvmFiatRate || nonEvmFiatRate <= 0) {
      return evmAmountFiatNumber;
    }
    // If user typed a fiat value directly, use it
    if (nonEvmTypedFiatValue !== null) {
      return nonEvmTypedFiatValue;
    }
    // Otherwise, calculate from token amount
    const tokenAmount = parseFloat(amountToken) || 0;
    return (tokenAmount * nonEvmFiatRate).toFixed(2);
  }, [
    isNonEvm,
    nonEvmFiatRate,
    amountToken,
    evmAmountFiatNumber,
    nonEvmTypedFiatValue,
  ]);

  // For non-EVM chains calculate currency toggle value
  const currencyToggleValue = useMemo(() => {
    if (!isNonEvm || !nonEvmFiatRate || nonEvmFiatRate <= 0) {
      return evmCurrencyToggleValue;
    }
    const ticker = earnToken?.ticker ?? earnToken?.symbol ?? '';
    const amountTokenText = `${amountToken} ${ticker}`;
    const amountFiatText = addCurrencySymbol(amountFiatNumber, currentCurrency);
    return isFiat ? amountTokenText : amountFiatText;
  }, [
    isNonEvm,
    nonEvmFiatRate,
    evmCurrencyToggleValue,
    earnToken?.ticker,
    earnToken?.symbol,
    amountToken,
    amountFiatNumber,
    currentCurrency,
    isFiat,
  ]);

  const earnGasFee = useEarnDepositGasFee(
    amountTokenMinimalUnit,
    earnToken.experience,
  );
  const isNativeETH = earnToken.isETH;
  const estimatedGasFeeWei = useMemo(
    () => (isNativeETH ? earnGasFee.estimatedEarnGasFeeWei : new BN4(0)),
    [isNativeETH, earnGasFee.estimatedEarnGasFeeWei],
  );
  const isLoadingEarnGasFee = useMemo(
    () => (isNativeETH ? earnGasFee.isLoadingEarnGasFee : false),
    [isNativeETH, earnGasFee.isLoadingEarnGasFee],
  );
  const getEstimatedEarnGasFee = useCallback(
    async (amountMinimalUnitParam: BN4) => {
      if (isNativeETH) {
        return earnGasFee.getEstimatedEarnGasFee(amountMinimalUnitParam);
      }
      return new BN4(0);
    },
    [isNativeETH, earnGasFee],
  );
  const isEarnGasFeeError = useMemo(
    () => (isNativeETH ? earnGasFee.isEarnGasFeeError : false),
    [isNativeETH, earnGasFee.isEarnGasFeeError],
  );

  // max amount of native currency stakable after gas fee
  const maxStakeableAmountWei = useMemo(
    () =>
      !isEarnGasFeeError &&
      !isLoadingEarnGasFee &&
      balanceWei.gt(estimatedGasFeeWei)
        ? balanceWei.sub(estimatedGasFeeWei)
        : new BN4(0),

    [balanceWei, estimatedGasFeeWei, isEarnGasFeeError, isLoadingEarnGasFee],
  );

  const isOverMaximum = useMemo(() => {
    let isOverMaximumEth = false;
    if (earnToken.isETH && isNonZeroAmount && !isLoadingEarnGasFee) {
      isOverMaximumEth = amountTokenMinimalUnit
        .sub(maxStakeableAmountWei)
        .gt(new BN4(0));
    }
    let isOverMaximumToken = false;
    if (!earnToken.isETH && isNonZeroAmount && !isLoadingEarnGasFee) {
      isOverMaximumToken = amountTokenMinimalUnit
        .sub(balanceMinimalUnit)
        .gt(new BN4(0));
    }

    return {
      isOverMaximumEth,
      isOverMaximumToken,
    };
  }, [
    amountTokenMinimalUnit,
    isNonZeroAmount,
    maxStakeableAmountWei,
    earnToken.isETH,
    balanceMinimalUnit,
    isLoadingEarnGasFee,
  ]);

  const { annualRewardRate, annualRewardRateDecimal, isLoadingEarnMetadata } =
    useEarnMetadata(earnToken);
  const handleMax = useCallback(async () => {
    if (!balanceMinimalUnit) return;

    let maxMinimalUnit;

    if (earnToken.isETH) {
      const preEstimatedGasFee = await getEstimatedEarnGasFee(
        maxStakeableAmountWei,
      );
      maxMinimalUnit = balanceWei.sub(preEstimatedGasFee);
    } else {
      maxMinimalUnit = balanceMinimalUnit;
    }
    handleMaxInput(maxMinimalUnit);
  }, [
    balanceMinimalUnit,
    handleMaxInput,
    maxStakeableAmountWei,
    earnToken.isETH,
    getEstimatedEarnGasFee,
    balanceWei,
  ]);

  const annualRewardsToken = useMemo(
    () =>
      `${limitToMaximumDecimalPlaces(
        parseFloat(
          fromTokenMinimalUnit(amountTokenMinimalUnit, earnToken.decimals),
        ) * annualRewardRateDecimal,
        5,
      )} ${earnToken.ticker}`,
    [
      amountTokenMinimalUnit,
      annualRewardRateDecimal,
      earnToken.decimals,
      earnToken.ticker,
    ],
  );

  const annualRewardsFiat = useMemo(() => {
    const fiatAmount = parseFloat(amountFiatNumber) || 0;
    return renderFiat(fiatAmount * annualRewardRateDecimal, currentCurrency, 2);
  }, [amountFiatNumber, annualRewardRateDecimal, currentCurrency]);

  const calculateEstimatedAnnualRewards = useCallback(() => {
    if (isNonZeroAmount) {
      if (!isFiat) {
        setEstimatedAnnualRewards(annualRewardsToken);
      } else {
        setEstimatedAnnualRewards(annualRewardsFiat);
      }
    } else {
      setEstimatedAnnualRewards(annualRewardRate);
    }
  }, [
    isNonZeroAmount,
    isFiat,
    annualRewardsToken,
    annualRewardsFiat,
    annualRewardRate,
  ]);

  const tokenBalanceFiat = useMemo(() => {
    if (isNonEvm && nonEvmFiatRate && nonEvmFiatRate > 0) {
      const balanceNumber = parseFloat(earnToken?.balanceFormatted ?? '0') || 0;
      return (balanceNumber * nonEvmFiatRate).toFixed(2);
    }
    return earnToken.isETH
      ? balanceFiatNumber?.toString()
      : earnToken.balanceFiat;
  }, [
    isNonEvm,
    nonEvmFiatRate,
    earnToken?.balanceFormatted,
    earnToken.isETH,
    earnToken.balanceFiat,
    balanceFiatNumber,
  ]);

  const tokenBalance = earnToken.isETH
    ? `${balanceETH} ETH`
    : earnToken.balanceFormatted;

  const balanceValue = isFiat
    ? `${tokenBalanceFiat} ${currentCurrency.toUpperCase()}`
    : `${tokenBalance}`;

  const getDepositTxGasPercentage = useCallback(() => {
    if (!isNonZeroAmount || isLoadingEarnGasFee || !estimatedGasFeeWei) {
      return '0';
    }

    const gasBN = new BigNumber(estimatedGasFeeWei.toString());
    const gasFiatNumber = weiToFiatNumber(gasBN.toString(), conversionRate, 2);

    return new BigNumber(gasFiatNumber)
      .multipliedBy(new BigNumber(100))
      .div(new BigNumber(amountFiatNumber))
      .toFixed(0, 1)
      .toString();
  }, [
    conversionRate,
    estimatedGasFeeWei,
    isNonZeroAmount,
    isLoadingEarnGasFee,
    amountFiatNumber,
  ]);

  // Gas fee make up 30% or more of the deposit amount.
  const isHighGasCostImpact = useCallback(
    () => new BN4(getDepositTxGasPercentage()).gt(new BN4(30)),
    [getDepositTxGasPercentage],
  );

  return {
    amountToken,
    amountTokenMinimalUnit,
    amountFiatNumber,
    isFiat,
    currencyToggleValue,
    isNonZeroAmount,
    isOverMaximum,
    handleTokenInput,
    handleFiatInput,
    handleKeypadChange,
    handleCurrencySwitch,
    percentageOptions,
    handleQuickAmountPress,
    currentCurrency,
    conversionRate,
    estimatedAnnualRewards,
    calculateEstimatedAnnualRewards,
    annualRewardsToken,
    annualRewardsFiat,
    annualRewardRate,
    handleMax,
    isLoadingEarnGasFee,
    isLoadingEarnMetadata,
    balanceValue,
    getDepositTxGasPercentage,
    isHighGasCostImpact,
    estimatedGasFeeWei,
  };
};

export default useEarnInputHandlers;
