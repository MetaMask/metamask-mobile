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
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { useEIP1559TxFees } from './useEIP1559TxFees';
import { useGasFeeEstimates } from './useGasFeeEstimates';
import { useSupportsEIP1559 } from '../transactions/useSupportsEIP1559';

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
      const locale = I18n.locale;
      const nativeCurrencyFee = `${
        formatAmount(
          locale,
          new BigNumber(
            getValueFromWeiHex({
              value: hexFee,
              fromCurrency: 'WEI',
              toCurrency: 'ETH',
              numberOfDecimals: 4,
              conversionRate: 1,
              toDenomination: 'ETH',
            }) || 0
          )
        )
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

    // If there is a L1 and L2 component to the gas fee, add them together
    const layer1GasFee = transactionMeta?.layer1GasFee as Hex;
    const hasLayer1GasFee = Boolean(layer1GasFee);
    if (hasLayer1GasFee) {
      const estimatedTotalFeesForL2 = addHexes(
        estimatedFee,
        layer1GasFee,
      ) as Hex;

      return getFeesFromHex(estimatedTotalFeesForL2);
    }

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
