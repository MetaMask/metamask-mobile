import { BigNumber } from 'bignumber.js';
import { useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { Hex, add0x } from '@metamask/utils';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import { hexToBN } from '@metamask/controller-utils';

import {
  decGWEIToHexWEI,
  addHexes,
  decimalToHex,
  getValueFromWeiHex,
  multiplyHexes,
} from '../../../../util/conversions';
import { selectConversionRateByChainId } from '../../../../selectors/currencyRateController';
import { RootState } from '../../../../reducers';
import { selectNetworkConfigurationByChainId } from '../../../../selectors/networkController';
import useFiatFormatter from '../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { useEIP1559TxFees } from './useEIP1559TxFees';
import { useSupportsEIP1559 } from './useSupportsEIP1559';
import { useGasFeeEstimates } from './useGasFeeEstimates';

const HEX_ZERO = '0x0';

export const useFeeCalculations = (transactionMeta: TransactionMeta) => {
  const { chainId } = transactionMeta;
  const { nativeCurrency } = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, chainId as Hex),
  );
  const fiatFormatter = useFiatFormatter();
  const nativeConversionRate = useSelector((state: RootState) =>
    selectConversionRateByChainId(state, chainId as Hex),
  );

  const gasPrice = transactionMeta?.txParams?.gasPrice || HEX_ZERO;
  const { maxFeePerGas, maxPriorityFeePerGas } =
    useEIP1559TxFees(transactionMeta);
  const { supportsEIP1559 } = useSupportsEIP1559(transactionMeta);

  const getFeesFromHex = useCallback(
    (hexFee: string) => {
      const nativeConversionRateInBN = new BigNumber(
        nativeConversionRate as number,
      );
      const nativeCurrencyFee = `${
        getValueFromWeiHex({
          value: hexFee,
          fromCurrency: 'WEI',
          toCurrency: 'ETH',
          numberOfDecimals: 4,
          conversionRate: 1,
          toDenomination: 'ETH',
        }) || 0
      } ${nativeCurrency}`;

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
      if (decimalCurrentCurrencyFee === 0) {
        currentCurrencyFee = '$0.00';
      } else if (preciseCurrentCurrencyFee < 0.01) {
        currentCurrencyFee = `< ${fiatFormatter(new BigNumber(0.01))}`;
      } else {
        currentCurrencyFee = fiatFormatter(
          new BigNumber(decimalCurrentCurrencyFee),
        );
      }

      if (!nativeConversionRate) {
        currentCurrencyFee = null;
      }

      return {
        currentCurrencyFee,
        nativeCurrencyFee,
        preciseNativeFeeInHex: add0x(hexFee),
      };
    },
    [fiatFormatter, nativeConversionRate, nativeCurrency],
  );

  const { gasFeeEstimates } = useGasFeeEstimates(
    transactionMeta.networkClientId,
  );
  const estimatedBaseFee = (gasFeeEstimates as GasFeeEstimates)
    ?.estimatedBaseFee;

  // Estimated fee
  const estimatedFees = useMemo(() => {
    let minimumFeePerGas = addHexes(
      decGWEIToHexWEI(estimatedBaseFee) || HEX_ZERO,
      decimalToHex(maxPriorityFeePerGas),
    );

    const minimumFeePerGasBN = hexToBN(minimumFeePerGas as Hex);

    // `minimumFeePerGas` should never be higher than the `maxFeePerGas`
    if (minimumFeePerGasBN.gt(hexToBN(maxFeePerGas as Hex))) {
      minimumFeePerGas = decimalToHex(maxFeePerGas) as Hex;
    }
    const gasLimitNoBuffer = transactionMeta.gasLimitNoBuffer || HEX_ZERO;
    const estimatedFee = multiplyHexes(
      supportsEIP1559 ? (minimumFeePerGas as Hex) : (gasPrice as Hex),
      gasLimitNoBuffer as Hex,
    );
    return getFeesFromHex(estimatedFee);
  }, [
    estimatedBaseFee,
    getFeesFromHex,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
    supportsEIP1559,
    transactionMeta,
  ]);

  return {
    estimatedFeeFiat: estimatedFees.currentCurrencyFee,
    estimatedFeeNative: estimatedFees.nativeCurrencyFee,
    preciseNativeFeeInHex: estimatedFees.preciseNativeFeeInHex,
  };
};
