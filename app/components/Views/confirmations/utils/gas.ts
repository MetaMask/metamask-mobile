import { hexToBN } from '@metamask/controller-utils';
import { Hex, add0x } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import I18n from '../../../../../locales/i18n';
import { formatAmount } from '../../../../components/UI/SimulationDetails/formatAmount';
import {
  addHexes,
  decGWEIToHexWEI,
  decimalToHex,
  getValueFromWeiHex,
  multiplyHexes,
} from '../../../../util/conversions';

const HEX_ZERO = '0x0';

export function getFeesFromHex({
  hexFee,
  nativeConversionRate,
  nativeCurrency,
  fiatFormatter,
  shouldHideFiat,
}: {
  hexFee: string;
  nativeConversionRate: number | null | undefined;
  nativeCurrency: string | undefined;
  fiatFormatter: (amount: BigNumber) => string;
  shouldHideFiat: boolean;
}) {
  if (
    nativeConversionRate === undefined ||
    nativeConversionRate === null ||
    !nativeCurrency
  ) {
    return {
      currentCurrencyFee: null,
      nativeCurrencyFee: null,
      preciseCurrentCurrencyFee: null,
      preciseNativeCurrencyFee: null,
      preciseNativeFeeInHex: null,
    };
  }

  const nativeConversionRateInBN = new BigNumber(nativeConversionRate);
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
      }) ?? 0,
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
      }) ?? 0,
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
  const preciseCurrentCurrencyFeeNum = Number(
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
  if (preciseCurrentCurrencyFeeNum < 0.01) {
    currentCurrencyFee = `< ${fiatFormatter(new BigNumber(0.01))}`;
  } else {
    currentCurrencyFee = fiatFormatter(
      new BigNumber(decimalCurrentCurrencyFee),
    );
  }

  if (shouldHideFiat) {
    currentCurrencyFee = null;
  }

  const preciseCurrentCurrencyFee = currentCurrencyFee
    ? new BigNumber(preciseCurrentCurrencyFeeNum).toString(10)
    : null;

  return {
    currentCurrencyFee,
    nativeCurrencyFee,
    preciseCurrentCurrencyFee,
    preciseNativeCurrencyFee,
    preciseNativeFeeInHex: add0x(hexFee),
  };
}

export function calculateGasEstimate({
  feePerGas,
  gasPrice,
  gas,
  shouldUseEIP1559FeeLogic,
  priorityFeePerGas,
  estimatedBaseFee,
  layer1GasFee,
  getFeesFromHexFn,
}: {
  feePerGas: string;
  priorityFeePerGas: string;
  gasPrice: string;
  gas: string;
  shouldUseEIP1559FeeLogic: boolean;
  estimatedBaseFee: string | undefined;
  layer1GasFee?: string;
  getFeesFromHexFn: (hexFee: string) => {
    currentCurrencyFee: string | null;
    nativeCurrencyFee: string | null;
    preciseCurrentCurrencyFee: string | null;
    preciseNativeCurrencyFee: string | null;
    preciseNativeFeeInHex: string | null;
  };
}) {
  let minimumFeePerGas = addHexes(
    decGWEIToHexWEI(estimatedBaseFee) ?? HEX_ZERO,
    decimalToHex(priorityFeePerGas),
  );

  const minimumFeePerGasBN = hexToBN(minimumFeePerGas as Hex);

  // `minimumFeePerGas` should never be higher than the `maxFeePerGas`
  if (minimumFeePerGasBN.gt(hexToBN(feePerGas as Hex))) {
    minimumFeePerGas = feePerGas;
  }

  const estimation = multiplyHexes(
    shouldUseEIP1559FeeLogic ? (minimumFeePerGas as Hex) : (gasPrice as Hex),
    gas as Hex,
  );

  const hasLayer1GasFee = Boolean(layer1GasFee);

  if (hasLayer1GasFee && layer1GasFee) {
    const estimatedTotalFeesForL2 = addHexes(estimation, layer1GasFee) as Hex;

    return getFeesFromHexFn(estimatedTotalFeesForL2);
  }

  return getFeesFromHexFn(estimation);
}

export function normalizeGasInput(value: string) {
  return value.replace(',', '.');
}

export function convertGasInputToHexWEI(value: string) {
  const normalizedValue = normalizeGasInput(value);
  return add0x(decGWEIToHexWEI(normalizedValue) as Hex);
}
