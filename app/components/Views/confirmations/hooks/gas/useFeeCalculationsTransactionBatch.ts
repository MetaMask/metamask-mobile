import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import {
  GasFeeEstimateLevel,
  GasFeeEstimateType,
  type TransactionBatchMeta,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectConversionRateByChainId } from '../../../../../selectors/currencyRateController';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { selectShowFiatInTestnets } from '../../../../../selectors/settings';
import { hexToDecimal } from '../../../../../util/conversions';
import { isTestNet } from '../../../../../util/networks';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { calculateGasEstimate, getFeesFromHex } from '../../utils/gas';
import { useTransactionBatchSupportsEIP1559 } from '../transactions/useTransactionBatchSupportsEIP1559';
import { useGasFeeEstimates } from './useGasFeeEstimates';

const HEX_ZERO = '0x0';

export const useFeeCalculationsTransactionBatch = (
  transactionBatchesMeta: TransactionBatchMeta,
) => {
  const chainId = transactionBatchesMeta.chainId;
  const gasLimit = transactionBatchesMeta.gas;
  const networkClientId = transactionBatchesMeta.networkClientId;
  const { nativeCurrency } = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, chainId as Hex),
  );
  const nativeConversionRate = useSelector((state: RootState) =>
    selectConversionRateByChainId(state, chainId as Hex, true),
  );
  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);
  const { supportsEIP1559 } = useTransactionBatchSupportsEIP1559(
    transactionBatchesMeta,
  );
  const fiatFormatter = useFiatFormatter();

  let maxFeePerGas = '0';
  let maxPriorityFeePerGas = '0';
  if (
    transactionBatchesMeta?.gasFeeEstimates?.type ===
    GasFeeEstimateType.FeeMarket
  ) {
    maxFeePerGas = String(
      hexToDecimal(
        transactionBatchesMeta?.gasFeeEstimates?.[GasFeeEstimateLevel.Medium]
          ?.maxFeePerGas ?? HEX_ZERO,
      ),
    );
    maxPriorityFeePerGas = String(
      hexToDecimal(
        transactionBatchesMeta?.gasFeeEstimates?.[GasFeeEstimateLevel.Medium]
          ?.maxPriorityFeePerGas ?? HEX_ZERO,
      ),
    );
  }

  const { gasFeeEstimates } = useGasFeeEstimates(networkClientId);
  const shouldHideFiat = isTestNet(chainId as Hex) && !showFiatOnTestnets;

  const estimatedBaseFee = (gasFeeEstimates as GasFeeEstimates)
    ?.estimatedBaseFee;

  let txParamsGasPrice = HEX_ZERO;
  if (
    transactionBatchesMeta?.gasFeeEstimates?.type ===
    GasFeeEstimateType.GasPrice
  ) {
    txParamsGasPrice =
      transactionBatchesMeta?.gasFeeEstimates?.gasPrice ?? HEX_ZERO;
  } else if (
    transactionBatchesMeta?.gasFeeEstimates?.type === GasFeeEstimateType.Legacy
  ) {
    txParamsGasPrice =
      transactionBatchesMeta?.gasFeeEstimates?.[GasFeeEstimateLevel.Medium] ??
      HEX_ZERO;
  } else if (
    transactionBatchesMeta?.gasFeeEstimates?.type ===
    GasFeeEstimateType.FeeMarket
  ) {
    txParamsGasPrice =
      transactionBatchesMeta?.gasFeeEstimates?.[GasFeeEstimateLevel.Medium]
        ?.maxFeePerGas ?? HEX_ZERO;
  }

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
        // No layer1GasFee for batch transactions
        getFeesFromHexFn: getFeesFromHexCallback,
      }),
    [estimatedBaseFee, getFeesFromHexCallback],
  );

  // Estimated fee
  const estimatedFees = useMemo(
    () =>
      calculateGasEstimateCallback({
        feePerGas: maxFeePerGas,
        priorityFeePerGas: maxPriorityFeePerGas,
        gas: gasLimit ?? HEX_ZERO,
        shouldUseEIP1559FeeLogic: supportsEIP1559,
        gasPrice: txParamsGasPrice,
      }),
    [
      txParamsGasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
      supportsEIP1559,
      calculateGasEstimateCallback,
      gasLimit,
    ],
  );

  return {
    estimatedFeeFiat: estimatedFees.currentCurrencyFee,
    estimatedFeeNative: estimatedFees.nativeCurrencyFee,
    preciseNativeFeeInHex: estimatedFees.preciseNativeFeeInHex,
    calculateGasEstimate: calculateGasEstimateCallback,
  };
};
