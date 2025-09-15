import { CaipAssetType, Hex } from '@metamask/utils';
import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../../../../../reducers';
import { getCurrencySymbol, isDecimal } from '../../../../../util/number';
import { selectContractExchangeRatesByChainId } from '../../../../../selectors/tokenRatesController';
import {
  selectConversionRateByChainId,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectMultichainAssetsRates } from '../../../../../selectors/multichain';
import { AssetType } from '../../types/token';
import { useSendContext } from '../../context/send-context';
import { convertCurrency } from '../../utils/send';

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
  if (!amount || !isDecimal(amount)) {
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
  if (!amount || !isDecimal(amount)) {
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
    const assetAddress = asset?.address ?? (asset as AssetType)?.assetId;
    if (!assetAddress) {
      return 0;
    }
    if ((asset as AssetType)?.fiat?.conversionRate) {
      return (asset as AssetType)?.fiat?.conversionRate ?? 0;
    }
    if (isEvmAddress(assetAddress)) {
      return conversionRateEvm ?? 0;
    }
    return parseFloat(
      multichainAssetsRates[assetAddress as CaipAssetType]?.rate ?? 0,
    );
  }, [asset, conversionRateEvm, multichainAssetsRates]);

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
    conversionSupportedForAsset: conversionRate * (exchangeRate ?? 0) !== 0,
    fiatCurrencySymbol: currentCurrency?.toUpperCase(),
    getFiatDisplayValue,
    getFiatValue,
    getNativeValue,
  };
};
