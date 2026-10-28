import { MULTICHAIN_NETWORK_DECIMAL_PLACES } from '@metamask/multichain-network-controller';
import type { CaipChainId } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import { formatCompactNumber } from '../../../../../UI/TokenDetails/utils/statBarFormat';
import { getLocaleLanguageCode } from '../../../../../hooks/useFormatters';
import I18n from '../../../../../../../locales/i18n';
import { formatWithThreshold } from '../../../../../../util/assets';

const AMOUNT_DUST = 0.00001;
const FIAT_DUST = 0.01;
const COMPACT_FROM = new BigNumber('1000000');

/** Same placeholder the wallet token list uses when fiat is missing. */
export const MISSING_FIAT = '—';

const chainFractionDigits = (chainId: string): number =>
  MULTICHAIN_NETWORK_DECIMAL_PLACES[chainId as CaipChainId] || 5;

/**
 * Readable amount, then the wallet list's `formatWithThreshold`.
 * Magnitudes at or above one million use the Hermes-safe compact helper
 * from token details (`formatCompactNumber`) instead of `toFixed` suffixes.
 */
export const formatOwnedTokenAmount = (
  readableAmount: string,
  chainId: string,
): string => {
  const value = new BigNumber(readableAmount);
  if (!value.isFinite()) {
    return '';
  }
  if (value.abs().gte(COMPACT_FROM)) {
    const compact = formatCompactNumber(value.toNumber());
    return compact ?? '';
  }
  return formatWithThreshold(value.toNumber(), AMOUNT_DUST, I18n.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: chainFractionDigits(chainId),
  });
};

/**
 * Readable amount × price, in BigNumber, then the wallet list's currency
 * `formatWithThreshold`. Missing price or a missing conversion rate is `—`.
 */
export const formatOwnedTokenFiat = (
  fiatValue: string | null,
  currency: string,
): string => {
  if (fiatValue == null) {
    return MISSING_FIAT;
  }
  const value = new BigNumber(fiatValue);
  if (!value.isFinite()) {
    return MISSING_FIAT;
  }
  return formatWithThreshold(
    value.toNumber(),
    FIAT_DUST,
    getLocaleLanguageCode(),
    {
      style: 'currency',
      currency: currency.toUpperCase(),
    },
  );
};

/**
 * When the API price is already in the selected currency, the multiplier is 1.
 * When the selected currency is not a v6 quote currency, price is USD and
 * CurrencyRateController supplies `conversionRate / usdConversionRate`.
 */
export const fiatMultiplierFromRates = (
  needsUsdConversion: boolean,
  conversionRate: number | undefined,
  usdConversionRate: number | undefined,
): BigNumber | null => {
  if (!needsUsdConversion) {
    return new BigNumber(1);
  }
  if (
    conversionRate == null ||
    usdConversionRate == null ||
    !Number.isFinite(conversionRate) ||
    !Number.isFinite(usdConversionRate) ||
    usdConversionRate === 0
  ) {
    return null;
  }
  const multiplier = new BigNumber(conversionRate).dividedBy(usdConversionRate);
  return multiplier.isFinite() ? multiplier : null;
};

export const computeFiatValue = (
  readable: BigNumber,
  price: string | undefined,
  multiplier: BigNumber | null,
): string | null => {
  if (!price || !multiplier) {
    return null;
  }
  const priceValue = new BigNumber(price);
  if (!priceValue.isFinite()) {
    return null;
  }
  const fiat = readable.multipliedBy(priceValue).multipliedBy(multiplier);
  return fiat.isFinite() ? fiat.toString() : null;
};
