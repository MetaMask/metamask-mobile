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
import {
  addHexes,
  decimalToHex,
  multiplyHexes,
} from '../../../../../util/conversions';
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
  const { chainId, gasLimitNoBuffer, gasUsed, layer1GasFee, networkClientId } =
    transactionMeta;

  const { nativeCurrency } =
    useSelector((state: RootState) =>
      selectNetworkConfigurationByChainId(state, chainId as Hex),
    ) ?? {};
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

  // `gasUsed` is the gas limit actually used by the transaction in the
  // simulation environment.
  const optimizedGasLimit =
    gasUsed ||
    // While estimating gas for the transaction we add 50% gas limit buffer.
    // With `gasLimitNoBuffer` that buffer is removed. see PR
    // https://github.com/MetaMask/metamask-extension/pull/29502 for more
    // details.
    gasLimitNoBuffer ||
    transactionMeta?.txParams?.gas ||
    HEX_ZERO;

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
        gas: optimizedGasLimit,
        shouldUseEIP1559FeeLogic: supportsEIP1559,
        gasPrice: txParamsGasPrice,
      }),
    [
      calculateGasEstimateCallback,
      maxFeePerGas,
      maxPriorityFeePerGas,
      optimizedGasLimit,
      supportsEIP1559,
      txParamsGasPrice,
    ],
  );

  // Max fee
  const maxFee = useMemo(
    () =>
      addHexes(
        multiplyHexes(
          supportsEIP1559
            ? (decimalToHex(maxFeePerGas) as Hex)
            : (txParamsGasPrice as Hex),
          transactionMeta.txParams.gas,
        ),
        transactionMeta.layer1GasFee ?? '0x0',
      ).toString(),
    [
      supportsEIP1559,
      maxFeePerGas,
      txParamsGasPrice,
      transactionMeta.txParams.gas,
      transactionMeta.layer1GasFee,
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
