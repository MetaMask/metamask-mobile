import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import { type TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectConversionRateByChainId } from '../../../../../selectors/currencyRateController';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { selectShowFiatInTestnets } from '../../../../../selectors/settings';
import { isTestNet } from '../../../../../util/networks';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { calculateGasEstimate, getFeesFromHex } from '../../utils/gas';
import { decimalToHex, multiplyHexes } from '../../../../../util/conversions';
import { useSupportsEIP1559 } from '../transactions/useSupportsEIP1559';
import { useEIP1559TxFees } from './useEIP1559TxFees';
import { useGasFeeEstimates } from './useGasFeeEstimates';

const HEX_ZERO = '0x0';

export const useFeeCalculations = (
  transactionMeta: TransactionMeta,
): {
  estimatedFeeFiat: string | null;
  estimatedFeeFiatPrecise: string | null;
  estimatedFeeNative: string | null;
  preciseNativeFeeInHex: string | null;
  calculateGasEstimate: ({
    feePerGas,
    gasPrice,
    gas,
    shouldUseEIP1559FeeLogic,
    priorityFeePerGas,
  }: {
    feePerGas: string;
    gasPrice: string;
    gas: string;
    shouldUseEIP1559FeeLogic: boolean;
    priorityFeePerGas: string;
  }) => {
    currentCurrencyFee: string | null;
    nativeCurrencyFee: string | null;
    preciseCurrentCurrencyFee: string | null;
    preciseNativeCurrencyFee: string | null;
    preciseNativeFeeInHex: string | null;
  };
  maxFeeFiat: string | null;
  maxFeeNative: string | null;
  maxFeeNativePrecise: string | null;
  maxFeeNativeHex: string | null;
} => {
  const { chainId, gasLimitNoBuffer, layer1GasFee, networkClientId } =
    transactionMeta;

  const { nativeCurrency } = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, chainId as Hex),
  );
  const nativeConversionRate = useSelector((state: RootState) =>
    selectConversionRateByChainId(state, chainId as Hex, true),
  );
  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);

  const { supportsEIP1559 } = useSupportsEIP1559(transactionMeta);
  const fiatFormatter = useFiatFormatter();
  const { maxFeePerGas, maxPriorityFeePerGas } =
    useEIP1559TxFees(transactionMeta);
  const { gasFeeEstimates } = useGasFeeEstimates(networkClientId);
  const shouldHideFiat = isTestNet(chainId as Hex) && !showFiatOnTestnets;

  const estimatedBaseFee = (gasFeeEstimates as GasFeeEstimates)
    ?.estimatedBaseFee;
  const txParamsGasPrice = transactionMeta.txParams?.gasPrice ?? HEX_ZERO;

  const getFeesFromHexCallback = useCallback(
    (hexFee: string) =>
      getFeesFromHex({
        hexFee,
        nativeConversionRate,
        nativeCurrency,
        fiatFormatter,
        shouldHideFiat,
      }),
    [fiatFormatter, nativeConversionRate, nativeCurrency, shouldHideFiat],
  );

  const calculateGasEstimateCallback = useCallback(
    ({
      feePerGas,
      gasPrice,
      gas,
      shouldUseEIP1559FeeLogic,
      priorityFeePerGas,
    }: {
      feePerGas: string;
      priorityFeePerGas: string;
      gasPrice: string;
      gas: string;
      shouldUseEIP1559FeeLogic: boolean;
    }) =>
      calculateGasEstimate({
        feePerGas,
        priorityFeePerGas,
        gasPrice,
        gas,
        shouldUseEIP1559FeeLogic,
        estimatedBaseFee,
        layer1GasFee,
        getFeesFromHexFn: getFeesFromHexCallback,
      }),
    [estimatedBaseFee, layer1GasFee, getFeesFromHexCallback],
  );

  // Estimated fee
  const estimatedFees = useMemo(
    () =>
      calculateGasEstimateCallback({
        feePerGas: maxFeePerGas,
        priorityFeePerGas: maxPriorityFeePerGas,
        gas: gasLimitNoBuffer ?? HEX_ZERO,
        shouldUseEIP1559FeeLogic: supportsEIP1559,
        gasPrice: txParamsGasPrice,
      }),
    [
      txParamsGasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
      supportsEIP1559,
      calculateGasEstimateCallback,
      gasLimitNoBuffer,
    ],
  );

  // Max fee
  const maxFee = useMemo(
    () =>
      multiplyHexes(
        supportsEIP1559
          ? (decimalToHex(maxFeePerGas) as Hex)
          : (txParamsGasPrice as Hex),
        transactionMeta.txParams.gas,
      ),
    [
      supportsEIP1559,
      maxFeePerGas,
      txParamsGasPrice,
      transactionMeta.txParams.gas,
    ],
  );

  const {
    currentCurrencyFee: maxFeeFiat,
    nativeCurrencyFee: maxFeeNative,
    preciseNativeCurrencyFee: maxFeeNativePrecise,
    preciseNativeFeeInHex: maxFeeNativeHex,
  } = getFeesFromHexCallback(maxFee);

  return {
    estimatedFeeFiat: estimatedFees.currentCurrencyFee,
    estimatedFeeFiatPrecise: estimatedFees.preciseCurrentCurrencyFee,
    estimatedFeeNative: estimatedFees.nativeCurrencyFee,
    preciseNativeFeeInHex: estimatedFees.preciseNativeFeeInHex,
    calculateGasEstimate: calculateGasEstimateCallback,
    maxFeeFiat,
    maxFeeNative,
    maxFeeNativePrecise,
    maxFeeNativeHex,
  };
};
