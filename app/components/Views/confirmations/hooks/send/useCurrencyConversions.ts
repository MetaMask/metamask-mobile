import { CaipAssetType, Hex } from '@metamask/utils';
import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import { useCallback, useMemo } from 'react';
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
import { selectMultichainAssetsRates } from '../../../../../selectors/multichain';
import { AssetType } from '../../types/token';
import { useSendContext } from '../../context/send-context';

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
}: ConversionArgs) =>
  balanceToFiatNumber(amount ?? 0, conversionRate ?? 1, exchangeRate, decimals);

export const getFiatDisplayValueFn = ({
  amount,
  conversionRate,
  currentCurrency,
  exchangeRate,
}: ConversionArgs) => {
  const amt = amount
    ? getFiatValueFn({
        conversionRate,
        exchangeRate,
        amount: amount ?? '0',
        decimals: 2,
      }).toFixed(2)
    : '0.00';
  return `${getCurrencySymbol(currentCurrency)} ${amt}`;
};

export const getNativeValueFn = ({
  amount,
  conversionRate,
  decimals,
  exchangeRate,
}: ConversionArgs) => {
  let amt = amount ? parseFloat(amount) : 0;
  amt = Number.isNaN(amt) ? 0 : amt;
  const nativeValue = amt / ((conversionRate ?? 1) * exchangeRate);
  return limitToMaximumDecimalPlaces(nativeValue, decimals ?? 0);
};

export const getNativeDisplayValueFn = ({
  amount,
  asset,
  conversionRate,
  exchangeRate,
}: ConversionArgs) =>
  `${asset?.symbol} ${getNativeValueFn({
    conversionRate,
    exchangeRate,
    amount: amount ?? '0',
    decimals: 5,
  })}`;

export const useCurrencyConversions = () => {
  const { asset, chainId } = useSendContext();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRateEvm = useSelector((state: RootState) =>
    selectConversionRateByChainId(state, chainId),
  );
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
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
    if (!asset?.address) {
      return 0;
    }
    if (isEvmAddress(asset?.address)) {
      return conversionRateEvm ?? 0;
    }
    return parseFloat(
      multichainAssetsRates[asset?.address as CaipAssetType]?.rate ?? 0,
    );
  }, [asset?.address, conversionRateEvm, multichainAssetsRates]);

  const getFiatDisplayValue = useCallback(
    (amount: string) =>
      getFiatDisplayValueFn({
        conversionRate,
        exchangeRate,
        currentCurrency,
        amount,
      }),
    [conversionRate, exchangeRate, currentCurrency],
  );

  const getNativeDisplayValue = useCallback(
    (amount: string) =>
      getNativeDisplayValueFn({
        asset,
        conversionRate,
        exchangeRate,
        amount,
      }),
    [asset, conversionRate, exchangeRate],
  );

  const getFiatValue = useCallback(
    (amount: string) =>
      getFiatValueFn({
        conversionRate,
        exchangeRate,
        amount,
      }),
    [conversionRate, exchangeRate],
  );

  const getNativeValue = useCallback(
    (amount: string) =>
      getNativeValueFn({
        conversionRate,
        exchangeRate,
        amount,
      }),
    [conversionRate, exchangeRate],
  );

  return {
    fiatCurrencySymbol: getCurrencySymbol(currentCurrency),
    getFiatDisplayValue,
    getFiatValue,
    getNativeDisplayValue,
    getNativeValue,
  };
};
