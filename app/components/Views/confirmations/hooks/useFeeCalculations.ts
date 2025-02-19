import { BigNumber } from 'bignumber.js';
import { useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { Hex, add0x } from '@metamask/utils';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import { hexToBN } from '@metamask/controller-utils';

import I18n from '../../../../../locales/i18n';
import { selectConversionRateByChainId } from '../../../../selectors/currencyRateController';
import { RootState } from '../../../../reducers';
import useFiatFormatter from '../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { selectTicker } from '../../../../selectors/networkController';
import { getValueFromWeiHex } from '../../../../util/conversions';
import { useEIP1559TxFees } from './useEIP1559TxFees';
import { useSupportsEIP1559 } from './useSupportsEIP1559';
import { useGasFeeEstimates } from './useGasFeeEstimates';
import { useTransactionGasFeeEstimate } from './useTransactionGasFeeEstimate';
import {
  decGWEIToHexWEI,
  addHexes,
  decimalToHex,
} from '../../../../util/conversions';

const HEX_ZERO = '0x0';

function multiplyHexes(hex1: Hex, hex2: Hex) {
  return hexToBN(hex1 as Hex)
    .mul(hexToBN(hex2 as Hex))
    .toString('hex');
}

export const useFeeCalculations = (transactionMeta: TransactionMeta) => {
  const fiatFormatter = useFiatFormatter();
  const locale = I18n.locale;
  const { chainId } = transactionMeta;
  const nativeConversionRate = useSelector((state: RootState) =>
    selectConversionRateByChainId(state, chainId as Hex),
  );
  const nativeConversionRateInBN = new BigNumber(nativeConversionRate || 1);
  const ticker = useSelector(selectTicker);

  const gasPrice = transactionMeta?.txParams?.gasPrice || HEX_ZERO;
  // const { maxFeePerGas, maxPriorityFeePerGas } =
  //   useEIP1559TxFees(transactionMeta);
  const maxFeePerGas = HEX_ZERO;
  const maxPriorityFeePerGas = HEX_ZERO;
  const { supportsEIP1559 } = useSupportsEIP1559(transactionMeta);

  const gasFeeEstimate = useTransactionGasFeeEstimate(
    transactionMeta,
    supportsEIP1559,
  );

  const getFeesFromHex = useCallback(
    (hexFee: string) => {
      // const nativeCurrencyFee = `${
      //   getValueFromWeiHex({
      //     value: hexFee,
      //     fromCurrency: 'GWEI',
      //     toCurrency: 'ETH',
      //     numberOfDecimals: 4,
      //     conversionRate: nativeConversionRateInBN,
      //     toDenomination: 'ETH',
      //   }) || 0
      // } ${ticker}`;

      // const decimalCurrentCurrencyFee = Number(
      //   getValueFromWeiHex({
      //     value: hexFee,
      //     conversionRate: nativeConversionRateInBN,
      //     fromCurrency: 'GWEI',
      //     toCurrency: 'ETH',
      //     numberOfDecimals: 2,
      //     toDenomination: 'ETH',
      //   }),
      // );

      // let currentCurrencyFee, currentCurrencyFeeWith18SignificantDigits;
      // if (decimalCurrentCurrencyFee === 0) {
      //   currentCurrencyFee = `< ${fiatFormatter(new BigNumber(0.01))}`;
      //   currentCurrencyFeeWith18SignificantDigits = getValueFromWeiHex({
      //     value: hexFee,
      //     conversionRate: nativeConversionRateInBN,
      //     fromCurrency: 'GWEI',
      //     toCurrency: 'ETH',
      //     numberOfDecimals: 18,
      //     toDenomination: 'ETH',
      //   });
      // } else {
      //   currentCurrencyFee = fiatFormatter(
      //     new BigNumber(decimalCurrentCurrencyFee),
      //   );
      //   currentCurrencyFeeWith18SignificantDigits = null;
      // }

      return {
        currentCurrencyFee: '',
        currentCurrencyFeeWith18SignificantDigits: '',
        nativeCurrencyFee: '',
        preciseNativeFeeInHex: add0x(hexFee),
      };
    },
    [fiatFormatter],
  );

  const { gasFeeEstimates } = useGasFeeEstimates(
    transactionMeta.networkClientId,
  );
  const estimatedBaseFee = (gasFeeEstimates as GasFeeEstimates)
    ?.estimatedBaseFee;

  // Estimated fee
  const estimatedFees = useMemo(() => {
    // Logic for any network without L1 and L2 fee components
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
    gasFeeEstimate,
    transactionMeta,
    estimatedBaseFee,
    maxPriorityFeePerGas,
    getFeesFromHex,
  ]);

  return {
    estimatedFeeFiat: estimatedFees.currentCurrencyFee,
    estimatedFeeFiatWith18SignificantDigits:
      estimatedFees.currentCurrencyFeeWith18SignificantDigits,
    estimatedFeeNative: estimatedFees.nativeCurrencyFee,
  };
};