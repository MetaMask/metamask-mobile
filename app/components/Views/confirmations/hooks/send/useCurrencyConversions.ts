import { Hex } from '@metamask/utils';
import { ERC1155, ERC721 } from '@metamask/controller-utils';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../../../../../reducers';
import { getCurrencySymbol } from '../../../../../util/number/legacy';
import { selectContractExchangeRatesByChainId } from '../../../../../selectors/tokenRatesController';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { AssetType } from '../../types/token';
import { useSendContext } from '../../context/send-context';
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
  exchangeRate: number;
}

export const getFiatValueFn = ({
  amount,
  conversionRate,
  decimals,
  exchangeRate,
}: ConversionArgs) => {
  if (!amount || !isValidPositiveNumericString(amount)) {
    return '0.00';
  }

  return convertCurrency(
    amount ?? '0',
    (conversionRate ?? 1) * (exchangeRate ?? 1),
    decimals,
    2,
  ).toString();
};

export const getFiatDisplayValueFn = ({
  amount,
  conversionRate,
  currentCurrency,
  exchangeRate,
  decimals,
}: ConversionArgs) => {
  const amt = amount
    ? getFiatValueFn({
        amount: amount ?? '0',
        conversionRate,
        decimals,
        exchangeRate,
      })
    : '0.00';
  return `${getCurrencySymbol(currentCurrency)} ${amt}`;
};

export const getNativeValueFn = ({
  amount,
  conversionRate,
  decimals,
  exchangeRate,
}: ConversionArgs) => {
  if (!amount || !isValidPositiveNumericString(amount)) {
    return '0';
  }

  const rate = (conversionRate ?? 1) * (exchangeRate ?? 1);
  return convertCurrency(
    amount ?? '0',
    rate === 0 ? 0 : 1 / rate,
    2,
    decimals,
  ).toString();
};

export const useCurrencyConversions = () => {
  const { asset, chainId } = useSendContext();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const contractExchangeRates = useSelector((state: RootState) =>
    selectContractExchangeRatesByChainId(state, chainId as Hex),
  );
  const exchangeRate = useMemo(
    () =>
      asset?.address
        ? contractExchangeRates?.[asset?.address as Hex]?.price ?? 1
        : 1,
    [asset?.address, contractExchangeRates],
  );

  const conversionRate = useMemo(() => {
    const assetAddress = asset?.address ?? (asset as AssetType)?.assetId;
    if (!assetAddress) {
      return 0;
    }
    return (asset as AssetType)?.fiat?.conversionRate ?? 0;
  }, [asset]);

  const getFiatDisplayValue = useCallback(
    (amount: string) =>
      getFiatDisplayValueFn({
        amount,
        conversionRate,
        currentCurrency,
        decimals: (asset as AssetType)?.decimals,
        exchangeRate,
      }),
    [asset, conversionRate, exchangeRate, currentCurrency],
  );

  const getFiatValue = useCallback(
    (amount: string) =>
      getFiatValueFn({
        amount,
        conversionRate,
        decimals: (asset as AssetType)?.decimals,
        exchangeRate,
      }),
    [asset, conversionRate, exchangeRate],
  );

  const getNativeValue = useCallback(
    (amount: string) =>
      getNativeValueFn({
        amount,
        conversionRate,
        decimals: (asset as AssetType)?.decimals,
        exchangeRate,
      }),
    [asset, conversionRate, exchangeRate],
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
