import { Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../../../../../reducers';
import {
  balanceToFiatNumber,
  getCurrencySymbol,
  limitToMaximumDecimalPlaces,
} from '../../../../../util/number';
import { selectContractExchangeRatesByChainId } from '../../../../../selectors/tokenRatesController';
import {
  selectConversionRateByChainId,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { AssetType } from '../../types/token';
import { useSendContext } from '../../context/send-context';

export const getFiatValueFn = ({
  asset,
  conversionRate,
  contractExchangeRates,
  amount,
  decimals,
}: {
  asset?: AssetType;
  conversionRate?: number | null;
  contractExchangeRates: Record<Hex, { price: number }>;
  amount?: string;
  decimals?: number;
}) => {
  const exchangeRate = asset?.address
    ? contractExchangeRates?.[asset?.address as Hex]?.price ?? 1
    : 1;
  return balanceToFiatNumber(
    amount ?? 0,
    conversionRate ?? 1,
    exchangeRate,
    decimals,
  );
};

export const getFiatDisplayValueFn = ({
  asset,
  conversionRate,
  contractExchangeRates,
  currentCurrency,
  amount,
}: {
  asset?: AssetType;
  conversionRate?: number | null;
  contractExchangeRates: Record<Hex, { price: number }>;
  currentCurrency: string;
  amount?: string;
}) =>
  `${getCurrencySymbol(currentCurrency)} ${getFiatValueFn({
    asset,
    conversionRate,
    contractExchangeRates,
    amount: amount ?? '0',
    decimals: 2,
  })}`;

export const getNativeValueFn = ({
  asset,
  conversionRate,
  contractExchangeRates,
  amount,
  decimals,
}: {
  asset?: AssetType;
  conversionRate?: number | null;
  contractExchangeRates: Record<Hex, { price: number }>;
  amount?: string;
  decimals?: number;
}) => {
  const exchangeRate = asset?.address
    ? contractExchangeRates?.[asset?.address as Hex]?.price ?? 1
    : 1;
  let amt = amount ? parseFloat(amount) : 0;
  amt = Number.isNaN(amt) ? 0 : amt;
  const nativeValue = amt / ((conversionRate ?? 1) * exchangeRate);
  return limitToMaximumDecimalPlaces(nativeValue, decimals ?? 0);
};

export const getNativeDisplayValueFn = ({
  asset,
  conversionRate,
  contractExchangeRates,
  amount,
}: {
  asset?: AssetType;
  conversionRate?: number | null;
  contractExchangeRates: Record<Hex, { price: number }>;
  amount?: string;
}) =>
  `${asset?.symbol} ${getNativeValueFn({
    asset,
    conversionRate,
    contractExchangeRates,
    amount: amount ?? '0',
    decimals: 5,
  })}`;

export const useCurrencyConversions = () => {
  const { asset, chainId } = useSendContext();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector((state: RootState) =>
    selectConversionRateByChainId(state, chainId),
  );
  const contractExchangeRates = useSelector((state: RootState) =>
    selectContractExchangeRatesByChainId(state, chainId as Hex),
  );

  const getFiatDisplayValue = useCallback(
    (amount: string) =>
      getFiatDisplayValueFn({
        asset,
        conversionRate,
        contractExchangeRates,
        currentCurrency,
        amount,
      }),
    [asset, conversionRate, contractExchangeRates, currentCurrency],
  );

  const getNativeDisplayValue = useCallback(
    (amount: string) =>
      getNativeDisplayValueFn({
        asset,
        conversionRate,
        contractExchangeRates,
        amount,
      }),
    [asset, conversionRate, contractExchangeRates],
  );

  const getFiatValue = useCallback(
    (amount: string) =>
      getFiatValueFn({
        asset,
        conversionRate,
        contractExchangeRates,
        amount,
      }),
    [asset, conversionRate, contractExchangeRates],
  );

  const getNativeValue = useCallback(
    (amount: string) =>
      getNativeValueFn({
        asset,
        conversionRate,
        contractExchangeRates,
        amount,
      }),
    [asset, conversionRate, contractExchangeRates],
  );

  return {
    getFiatDisplayValue,
    getFiatValue,
    getNativeDisplayValue,
    getNativeValue,
  };
};
