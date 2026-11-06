import { ERC1155, ERC721 } from '@metamask/controller-utils';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';

import {
  getFormatters,
  getLocaleLanguageCode,
} from '../../../../hooks/useFormatters';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { selectShowFiatInTestnets } from '../../../../../selectors/settings';
import { AssetType } from '../../types/token';
import { useSendContext } from '../../context/send-context';
import { isNetworkTestnet } from './useNetworkFilter';
import { formatAmountWithCommas } from '../../utils/format-amount';
import {
  convertCurrency,
  isValidPositiveNumericString,
} from '../../utils/send';

interface ConversionArgs {
  amount?: string;
  asset?: AssetType;
  conversionRate: number;
  currentCurrency?: string;
  decimals?: number;
}

export const getFiatValueFn = ({
  amount,
  conversionRate,
  decimals,
}: ConversionArgs) => {
  if (!amount || !isValidPositiveNumericString(amount)) {
    return '0.00';
  }

  return convertCurrency(
    amount ?? '0',
    conversionRate ?? 1,
    decimals,
    2,
  ).toString();
};

const BIDI_MARKS = /[\u200e\u200f\u061c]/gu;

/**
 * Places the ADR narrow currency symbol before or after an amount input.
 * The keypad keeps the typed digits separate from the symbol, so the symbol
 * and its placement are read from a formatted zero.
 *
 * Hermes has no reliable `Intl.NumberFormat.formatToParts`, so this relies on
 * `format()` only, which every runtime supports.
 */
export function getNarrowCurrencyAffix(
  currency: string | undefined,
  locale: string = getLocaleLanguageCode(),
): { prefix: string; suffix: string } {
  if (!currency) {
    return { prefix: '', suffix: '' };
  }

  const code = currency.toUpperCase();
  let sample: string;
  try {
    sample = getIntlNumberFormatter(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    })
      .format(0)
      .replace(BIDI_MARKS, '');
  } catch {
    return { prefix: '', suffix: code };
  }

  const firstDigit = sample.search(/\d/u);
  if (firstDigit === -1) {
    return { prefix: '', suffix: code };
  }

  let lastDigit = firstDigit;
  for (let index = firstDigit; index < sample.length; index += 1) {
    if (/\d/u.test(sample[index])) {
      lastDigit = index;
    }
  }

  const before = sample.slice(0, firstDigit);
  const after = sample.slice(lastDigit + 1);
  if (before.trim()) {
    return { prefix: before, suffix: '' };
  }
  return { prefix: '', suffix: after.trim() ? after : code };
}

export const getFiatDisplayValueFn = ({
  amount,
  conversionRate,
  currentCurrency,
  decimals,
}: ConversionArgs) => {
  const amt = amount
    ? getFiatValueFn({
        amount: amount ?? '0',
        conversionRate,
        decimals,
      })
    : '0.00';
  const currency = currentCurrency?.toUpperCase();
  if (!currency) {
    return formatAmountWithCommas(amt);
  }

  return getFormatters().formatCurrency(amt, currency, {
    currencyDisplay: 'narrowSymbol',
  });
};

export const getNativeValueFn = ({
  amount,
  conversionRate,
  decimals,
}: ConversionArgs) => {
  // In order to handle the case where the amount is empty string,
  // we return empty string so it allows to go back initial state of the amount input
  if (amount === '') {
    return '';
  }

  if (!amount || !isValidPositiveNumericString(amount)) {
    return '0';
  }

  const rate = conversionRate ?? 1;
  return convertCurrency(
    amount ?? '0',
    rate === 0 ? 0 : 1 / rate,
    2,
    decimals,
  ).toString();
};

export const useCurrencyConversions = () => {
  const { asset } = useSendContext();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);

  // Price of one unit of the asset in the user's selected currency.
  //
  // Every asset reaching the send context carries a complete token -> fiat
  // rate, from either source: the in-flow picker supplies it directly via
  // `selectConfirmationAssetsByAccountGroupId`, and `useRouteParams`
  // normalises the upstream `selectAssetsBySelectedAccountGroup` shape, which
  // stores only the native -> fiat rate, into the same unit.
  //
  // It must therefore not be combined with the `TokenRatesController` exchange
  // rate, which prices the token in the chain's native coin. Multiplying the
  // two counts the token price twice and leaves an uncancelled token/native
  // term, so ERC-20 values collapse toward zero on chains with an expensive
  // native coin and inflate on chains with a cheap one. Native coins are
  // unaffected because their exchange rate is 1.
  const conversionRate = useMemo(() => {
    const assetAddress = asset?.address ?? (asset as AssetType)?.assetId;
    if (!assetAddress) {
      return 0;
    }
    // "Show conversion on test networks" setting: fiat conversion is not
    // available for testnet assets unless the user opted in.
    if (
      !showFiatOnTestnets &&
      asset?.chainId &&
      isNetworkTestnet(String(asset.chainId))
    ) {
      return 0;
    }
    return (asset as AssetType)?.fiat?.conversionRate ?? 0;
  }, [asset, showFiatOnTestnets]);

  const getFiatDisplayValue = useCallback(
    (amount: string) =>
      getFiatDisplayValueFn({
        amount,
        conversionRate,
        currentCurrency,
        decimals: (asset as AssetType)?.decimals,
      }),
    [asset, conversionRate, currentCurrency],
  );

  const getFiatValue = useCallback(
    (amount: string) =>
      getFiatValueFn({
        amount,
        conversionRate,
        decimals: (asset as AssetType)?.decimals,
      }),
    [asset, conversionRate],
  );

  const getNativeValue = useCallback(
    (amount: string) =>
      getNativeValueFn({
        amount,
        conversionRate,
        decimals: (asset as AssetType)?.decimals,
      }),
    [asset, conversionRate],
  );

  return {
    conversionSupportedForAsset:
      conversionRate !== 0 &&
      asset?.standard !== ERC1155 &&
      asset?.standard !== ERC721,
    fiatCurrencySymbol: currentCurrency?.toUpperCase(),
    getFiatDisplayValue,
    getFiatValue,
    getNativeValue,
  };
};
