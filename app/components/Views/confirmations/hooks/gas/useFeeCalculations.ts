import { hexToBN } from '@metamask/controller-utils';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { Hex, add0x } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import I18n from '../../../../../../locales/i18n';
import { formatAmount } from '../../../../../components/UI/SimulationDetails/formatAmount';
import { RootState } from '../../../../../reducers';
import { selectConversionRateByChainId } from '../../../../../selectors/currencyRateController';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import {
  addHexes,
  decGWEIToHexWEI,
  decimalToHex,
  getValueFromWeiHex,
  multiplyHexes,
} from '../../../../../util/conversions';
import { selectShowFiatInTestnets } from '../../../../../selectors/settings';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { isTestNet } from '../../../../../util/networks';
import { useEIP1559TxFees } from './useEIP1559TxFees';
import { useGasFeeEstimates } from './useGasFeeEstimates';
import { useSupportsEIP1559 } from '../transactions/useSupportsEIP1559';

const HEX_ZERO = '0x0';

export const useFeeCalculations = (transactionMeta: TransactionMeta) => {
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
  const txParamsGasPrice = transactionMeta?.txParams?.gasPrice || HEX_ZERO;

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

      const hasLayer1GasFee = Boolean(layer1GasFee);

      if (hasLayer1GasFee) {
        const estimatedTotalFeesForL2 = addHexes(
          estimation,
          layer1GasFee,
        ) as Hex;

        return getFeesFromHex(estimatedTotalFeesForL2);
      }

      return getFeesFromHex(estimation);
    },
    [estimatedBaseFee, layer1GasFee, getFeesFromHex],
  );

  // Estimated fee
  const estimatedFees = useMemo(
    () =>
      calculateGasEstimate({
        feePerGas: maxFeePerGas,
        priorityFeePerGas: maxPriorityFeePerGas,
        gas: gasLimitNoBuffer || HEX_ZERO,
        shouldUseEIP1559FeeLogic: supportsEIP1559,
        gasPrice: txParamsGasPrice,
      }),
    [
      txParamsGasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
      supportsEIP1559,
      calculateGasEstimate,
      gasLimitNoBuffer,
    ],
  );

  return {
    estimatedFeeFiat: estimatedFees.currentCurrencyFee,
    estimatedFeeNative: estimatedFees.nativeCurrencyFee,
    preciseNativeFeeInHex: estimatedFees.preciseNativeFeeInHex,
    calculateGasEstimate,
  };
};
