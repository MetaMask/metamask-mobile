import { ETH, GWEI, WEI } from './custom-gas/index.js';
import {
  conversionUtil,
  addCurrencies,
  subtractCurrencies,
} from './conversion/index.js';
import { formatCurrency } from './confirm-tx.js';

export function hexToDecimal(hexValue: string): string {
  return conversionUtil(hexValue, {
    fromNumericBase: 'hex',
    toNumericBase: 'dec',
  }) as string;
}

export function decimalToHex(decimal: number): string {
  return conversionUtil(decimal, {
    fromNumericBase: 'dec',
    toNumericBase: 'hex',
  }) as string;
}

interface EthConversionParams {
  value: string;
  fromCurrency?: string;
  conversionRate: number;
  numberOfDecimals?: number;
}

export function getEthConversionFromWeiHex({
  value,
  fromCurrency = ETH,
  conversionRate,
  numberOfDecimals = 6,
}: EthConversionParams): string {
  const denominations = [fromCurrency, GWEI, WEI];

  let nonZeroDenomination: string;

  for (let i = 0; i < denominations.length; i++) {
    const convertedValue = getValueFromWeiHex({
      value,
      conversionRate,
      fromCurrency,
      toCurrency: fromCurrency,
      numberOfDecimals,
      toDenomination: denominations[i],
    });

    if (convertedValue !== '0' || i === denominations.length - 1) {
      nonZeroDenomination = `${convertedValue} ${denominations[i]}`;
      break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return nonZeroDenomination!;
}

interface ValueFromWeiHexParams {
  value: string;
  fromCurrency?: string;
  toCurrency: string;
  conversionRate?: number;
  numberOfDecimals: number;
  toDenomination?: string;
}

export function getValueFromWeiHex({
  value,
  fromCurrency = ETH,
  toCurrency,
  conversionRate,
  numberOfDecimals,
  toDenomination,
}: ValueFromWeiHexParams): string {
  return conversionUtil(value, {
    fromNumericBase: 'hex',
    toNumericBase: 'dec',
    fromCurrency,
    toCurrency,
    numberOfDecimals,
    fromDenomination: WEI,
    toDenomination,
    conversionRate,
  }) as string;
}

interface WeiHexFromDecimalValueParams {
  value: string;
  fromCurrency: string;
  conversionRate: number;
  fromDenomination: string;
  invertConversionRate: boolean;
}

export function getWeiHexFromDecimalValue({
  value,
  fromCurrency,
  conversionRate,
  fromDenomination,
  invertConversionRate,
}: WeiHexFromDecimalValueParams): string {
  return conversionUtil(value, {
    fromNumericBase: 'dec',
    toNumericBase: 'hex',
    toCurrency: ETH,
    fromCurrency,
    conversionRate,
    invertConversionRate,
    fromDenomination,
    toDenomination: WEI,
  }) as string;
}

export function addHexWEIsToDec(aHexWEI: string, bHexWEI: string): string {
  return addCurrencies(aHexWEI, bHexWEI, {
    aBase: 16,
    bBase: 16,
    fromDenomination: 'WEI',
    numberOfDecimals: 6,
  }) as string;
}

export function subtractHexWEIsToDec(aHexWEI: string, bHexWEI: string): string {
  return subtractCurrencies(aHexWEI, bHexWEI, {
    aBase: 16,
    bBase: 16,
    fromDenomination: 'WEI',
    numberOfDecimals: 6,
  }) as string;
}

export function decEthToConvertedCurrency(
  ethTotal: string,
  convertedCurrency: string,
  conversionRate: number,
): string {
  return conversionUtil(ethTotal, {
    fromNumericBase: 'dec',
    toNumericBase: 'dec',
    fromCurrency: 'ETH',
    toCurrency: convertedCurrency,
    numberOfDecimals: 2,
    conversionRate,
  }) as string;
}

export function decGWEIToHexWEI(decGWEI: string): string {
  return conversionUtil(decGWEI, {
    fromNumericBase: 'dec',
    toNumericBase: 'hex',
    fromDenomination: 'GWEI',
    toDenomination: 'WEI',
  }) as string;
}

export function hexGWEIToHexWEI(hexGWEI: string): string {
  return conversionUtil(hexGWEI, {
    fromNumericBase: 'hex',
    toNumericBase: 'hex',
    fromDenomination: 'GWEI',
    toDenomination: 'WEI',
  }) as string;
}

export function hexWEIToDecGWEI(hexWEI: string): string {
  return conversionUtil(hexWEI, {
    fromNumericBase: 'hex',
    toNumericBase: 'dec',
    fromDenomination: 'WEI',
    toDenomination: 'GWEI',
  }) as string;
}

export function decETHToDecWEI(decEth: string): string {
  return conversionUtil(decEth, {
    fromNumericBase: 'dec',
    toNumericBase: 'dec',
    fromDenomination: 'ETH',
    toDenomination: 'WEI',
  }) as string;
}

export function hexWEIToDecETH(hexWEI: string): string {
  return conversionUtil(hexWEI, {
    fromNumericBase: 'hex',
    toNumericBase: 'dec',
    fromDenomination: 'WEI',
    toDenomination: 'ETH',
  }) as string;
}

export function addHexes(aHexWEI: string, bHexWEI: string): string {
  return addCurrencies(aHexWEI, bHexWEI, {
    aBase: 16,
    bBase: 16,
    toNumericBase: 'hex',
    numberOfDecimals: 6,
  }) as string;
}

export function sumHexWEIs(hexWEIs: string[]): string {
  return hexWEIs.filter(Boolean).reduce(addHexes);
}

export function sumHexWEIsToUnformattedFiat(
  hexWEIs: string[],
  convertedCurrency: string,
  conversionRate: number,
): string {
  const hexWEIsSum = sumHexWEIs(hexWEIs);
  const convertedTotal = decEthToConvertedCurrency(
    getValueFromWeiHex({
      value: hexWEIsSum,
      toCurrency: 'ETH',
      numberOfDecimals: 4,
      conversionRate: 1,
    }),
    convertedCurrency,
    conversionRate,
  );
  return convertedTotal;
}

export function sumHexWEIsToRenderableFiat(
  hexWEIs: string[],
  convertedCurrency: string,
  conversionRate: number,
): string {
  const convertedTotal = sumHexWEIsToUnformattedFiat(
    hexWEIs,
    convertedCurrency,
    conversionRate,
  );
  return formatCurrency(convertedTotal, convertedCurrency);
}

export function formatETHFee(
  ethFee: string,
  currencySymbol: string = 'ETH',
  showLessThan?: boolean,
): string {
  if (showLessThan && ethFee === '0') return `< 0.000001 ${currencySymbol}`;
  return `${ethFee} ${currencySymbol}`;
}

export function sumHexWEIsToRenderableEth(hexWEIs: string[]): string {
  const hexWEIsSum = hexWEIs.filter(Boolean).reduce(addHexes);
  return formatETHFee(
    getValueFromWeiHex({
      value: hexWEIsSum,
      toCurrency: 'ETH',
      numberOfDecimals: 6,
    }),
  );
}
