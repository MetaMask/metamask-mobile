import { hexToBN } from '@metamask/controller-utils';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import { GasFeeEstimateLevel, GasFeeEstimateType, type TransactionBatchMeta, TransactionStatus } from '@metamask/transaction-controller';
import { Hex, add0x } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import I18n from '../../../../../../locales/i18n';
import { formatAmount } from '../../../../../components/UI/SimulationDetails/formatAmount';
import { RootState } from '../../../../../reducers';
import { selectConversionRateByChainId } from '../../../../../selectors/currencyRateController';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { selectShowFiatInTestnets } from '../../../../../selectors/settings';
import {
  addHexes,
  decGWEIToHexWEI,
  decimalToHex,
  getValueFromWeiHex,
  hexToDecimal,
  multiplyHexes,
} from '../../../../../util/conversions';
import { isTestNet } from '../../../../../util/networks';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { useTransactionBatchSupportsEIP1559 } from '../transactions/useTransactionBatchSupportsEIP1559';
import { useGasFeeEstimates } from './useGasFeeEstimates';

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

  const getFeesFromHex = useCallback(
    (hexFee: string) => {
      if (
        nativeConversionRate === undefined ||
        nativeConversionRate === null ||
        !nativeCurrency
      ) {
        return {
          currentCurrencyFee: null,
          nativeCurrencyFee: null,
          preciseNativeFeeInHex: null,
        };
      }

      const nativeConversionRateInBN = new BigNumber(
        nativeConversionRate as number,
      );
      const locale = I18n.locale;
      const nativeCurrencyFee = `${formatAmount(
        locale,
        new BigNumber(
          getValueFromWeiHex({
            value: hexFee,
            fromCurrency: 'WEI',
            toCurrency: 'ETH',
            numberOfDecimals: 4,
            conversionRate: 1,
            toDenomination: 'ETH',
          }) || 0,
        ),
      )} ${nativeCurrency}`;

      const preciseNativeCurrencyFee = `${formatAmount(
        locale,
        new BigNumber(
          getValueFromWeiHex({
            value: hexFee,
            fromCurrency: 'WEI',
            toCurrency: 'ETH',
            numberOfDecimals: 18,
            conversionRate: 1,
            toDenomination: 'ETH',
          }) || 0,
        ),
      )} ${nativeCurrency}`;

      const decimalCurrentCurrencyFee = Number(
        getValueFromWeiHex({
          value: hexFee,
          conversionRate: nativeConversionRateInBN,
          fromCurrency: 'GWEI',
          toCurrency: 'ETH',
          numberOfDecimals: 2,
          toDenomination: 'ETH',
        }),
      );

      // This is used to check if the fee is less than $0.01 - more precise than decimalCurrentCurrencyFee
      // Because decimalCurrentCurrencyFee is rounded to 2 decimal places
      const preciseCurrentCurrencyFee = Number(
        getValueFromWeiHex({
          value: hexFee,
          conversionRate: nativeConversionRateInBN,
          fromCurrency: 'GWEI',
          toCurrency: 'ETH',
          numberOfDecimals: 3,
          toDenomination: 'ETH',
        }),
      );

      let currentCurrencyFee;
      if (preciseCurrentCurrencyFee < 0.01) {
        currentCurrencyFee = `< ${fiatFormatter(new BigNumber(0.01))}`;
      } else {
        currentCurrencyFee = fiatFormatter(
          new BigNumber(decimalCurrentCurrencyFee),
        );
      }

      if(shouldHideFiat) {
        currentCurrencyFee = null;
      }

      return {
        currentCurrencyFee,
        nativeCurrencyFee,
        preciseNativeCurrencyFee,
        preciseNativeFeeInHex: add0x(hexFee),
      };
    },
    [fiatFormatter, nativeConversionRate, nativeCurrency, shouldHideFiat],
  );

  const calculateGasEstimate = useCallback(
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
    }) => {
      let minimumFeePerGas = addHexes(
        decGWEIToHexWEI(estimatedBaseFee) || HEX_ZERO,
        decimalToHex(priorityFeePerGas),
      );

      const minimumFeePerGasBN = hexToBN(minimumFeePerGas as Hex);

      // `minimumFeePerGas` should never be higher than the `maxFeePerGas`
      if (minimumFeePerGasBN.gt(hexToBN(feePerGas as Hex))) {
        minimumFeePerGas = feePerGas;
      }

      const estimation = multiplyHexes(
        shouldUseEIP1559FeeLogic
          ? (minimumFeePerGas as Hex)
          : (gasPrice as Hex),
        gas as Hex,
      );

      return getFeesFromHex(estimation);
    },
    [estimatedBaseFee, getFeesFromHex],
  );

  // Estimated fee
  const estimatedFees = useMemo(
    () =>
      calculateGasEstimate({
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
      calculateGasEstimate,
      gasLimit,
    ],
  );

  return {
    estimatedFeeFiat: estimatedFees.currentCurrencyFee,
    estimatedFeeNative: estimatedFees.nativeCurrencyFee,
    preciseNativeFeeInHex: estimatedFees.preciseNativeFeeInHex,
    calculateGasEstimate,
  };
};
