import { ERC1155, ERC721 } from '@metamask/controller-utils';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';

import { getCurrencySymbol } from '../../../../../util/number';
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
  return `${getCurrencySymbol(currentCurrency)} ${formatAmountWithCommas(amt)}`;
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
