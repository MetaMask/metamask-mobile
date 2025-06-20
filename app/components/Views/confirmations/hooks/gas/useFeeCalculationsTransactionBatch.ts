import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import { GasFeeEstimateLevel, GasFeeEstimateType, type TransactionBatchMeta, TransactionStatus } from '@metamask/transaction-controller';
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
import { useTransactionBatchSupportsEIP1559 } from '../transactions/useTransactionBatchSupportsEIP1559';
import { useGasFeeEstimates } from './useGasFeeEstimates';
import { getFeesFromHex, calculateGasEstimate } from './feeCalculationsShared';

const HEX_ZERO = '0x0';

// Default batch meta for when undefined is passed
const DEFAULT_BATCH_META: TransactionBatchMeta = {
  id: 'default-batch',
  from: '0x0000000000000000000000000000000000000000' as Hex,
  status: TransactionStatus.unapproved,
  chainId: '0x1' as Hex,
  gas: HEX_ZERO,
  networkClientId: '',
  gasFeeEstimates: undefined,
  transactions: [],
};

export const useFeeCalculationsTransactionBatch = (transactionBatchesMeta?: TransactionBatchMeta) => {
  // Use a default batch meta when undefined to satisfy hook requirements
  const safeBatchMeta = transactionBatchesMeta || DEFAULT_BATCH_META;

  const chainId = safeBatchMeta.chainId;
  const gasLimit = safeBatchMeta.gas;
  const networkClientId = safeBatchMeta.networkClientId;
  const { nativeCurrency } = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, chainId as Hex),
  );
  const nativeConversionRate = useSelector((state: RootState) =>
    selectConversionRateByChainId(state, chainId as Hex, true),
  );
  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);
  const { supportsEIP1559 } = useTransactionBatchSupportsEIP1559(safeBatchMeta);
  const fiatFormatter = useFiatFormatter();

  let maxFeePerGas = '0';
  let maxPriorityFeePerGas = '0';
  if (safeBatchMeta?.gasFeeEstimates?.type === GasFeeEstimateType.FeeMarket) {
    maxFeePerGas = String(hexToDecimal(safeBatchMeta?.gasFeeEstimates?.[GasFeeEstimateLevel.Medium]?.maxFeePerGas || HEX_ZERO));
    maxPriorityFeePerGas = String(hexToDecimal(safeBatchMeta?.gasFeeEstimates?.[GasFeeEstimateLevel.Medium]?.maxPriorityFeePerGas || HEX_ZERO));
  }

  const { gasFeeEstimates } = useGasFeeEstimates(networkClientId);
  const shouldHideFiat = isTestNet(chainId as Hex) && !showFiatOnTestnets;

  const estimatedBaseFee = (gasFeeEstimates as GasFeeEstimates)
    ?.estimatedBaseFee;

  let txParamsGasPrice = HEX_ZERO;
  if (safeBatchMeta?.gasFeeEstimates?.type === GasFeeEstimateType.GasPrice) {
    txParamsGasPrice = safeBatchMeta?.gasFeeEstimates?.gasPrice || HEX_ZERO;
  } else if (safeBatchMeta?.gasFeeEstimates?.type === GasFeeEstimateType.Legacy) {
    txParamsGasPrice = safeBatchMeta?.gasFeeEstimates?.[GasFeeEstimateLevel.Medium] || HEX_ZERO;
  } else if (safeBatchMeta?.gasFeeEstimates?.type === GasFeeEstimateType.FeeMarket) {
    txParamsGasPrice = safeBatchMeta?.gasFeeEstimates?.[GasFeeEstimateLevel.Medium]?.maxFeePerGas || HEX_ZERO;
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
        gas: gasLimit || HEX_ZERO,
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
