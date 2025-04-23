import { zeroAddress } from 'ethereumjs-util';
import { CaipAssetId, Hex } from '@metamask/utils';
import { RootState } from '../../../../reducers';
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import i18n from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './TokenDetails.styles';
import { safeToChecksumAddress } from '../../../../util/address';
import {
  selectConversionRateBySymbol,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectNativeCurrencyByChainId } from '../../../../selectors/networkController';
import Logger from '../../../../util/Logger';
import TokenDetailsList from './TokenDetailsList';
import MarketDetailsList from './MarketDetailsList';
import { TokenI } from '../../Tokens/types';
import StakingEarnings from '../../Stake/components/StakingEarnings';
import { isSupportedLendingTokenByChainId } from '../../Earn/utils/token';
import EarnEmptyStateCta from '../../Earn/components/EmptyStateCta';
import { parseFloatSafe } from '../../Earn/utils';
import { isStablecoinLendingFeatureEnabled } from '../../Stake/constants';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';
import { selectEvmTokenMarketData } from '../../../../selectors/multichain/evm';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
import { formatWithThreshold } from '../../../../util/assets';

export interface TokenDetails {
  contractAddress: string | null;
  tokenDecimal: number | null;
  tokenList: string | null;
}

export interface MarketDetails {
  marketCap: string | null;
  totalVolume: string | null;
  volumeToMarketCap: string | null;
  circulatingSupply: string | null;
  allTimeHigh: string | null;
  allTimeLow: string | null;
  fullyDiluted: string | null;
}

interface TokenDetailsProps {
  asset: TokenI;
}

const getTokenDetails = (
  asset: TokenI,
  isEvmNetworkSelected: boolean,
  tokenContractAddress: string | undefined,
  tokenMetadata: Record<string, string | number | string[]>,
): TokenDetails => {
  if (!isEvmNetworkSelected) {
    return {
      contractAddress: asset.address || null,
      tokenDecimal: asset.decimals || null,
      tokenList: asset.aggregators.join(', ') || null,
    };
  }

  if (asset.isETH) {
    return {
      contractAddress: zeroAddress(),
      tokenDecimal: 18,
      tokenList: '',
    };
  }

  return {
    contractAddress: tokenContractAddress ?? null,
    tokenDecimal:
      typeof tokenMetadata?.decimals === 'number'
        ? tokenMetadata.decimals
        : null,
    tokenList: Array.isArray(tokenMetadata?.aggregators)
      ? tokenMetadata.aggregators.join(', ')
      : null,
  };
};

const TokenDetails: React.FC<TokenDetailsProps> = ({ asset }) => {
  const { styles } = useStyles(styleSheet, {});
  const nativeCurrency = useSelector((state: RootState) =>
    selectNativeCurrencyByChainId(state, asset.chainId as Hex),
  );
  const conversionRateBySymbol = useSelector((state: RootState) =>
    selectConversionRateBySymbol(state, nativeCurrency),
  );
  const currentCurrency = useSelector(selectCurrentCurrency);

  const isEvmNetworkSelected = useSelector(selectIsEvmNetworkSelected);

  const tokenContractAddress = isEvmNetworkSelected
    ? safeToChecksumAddress(asset.address)
    : asset.address;

  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);

  const multichainAssetRates =
    multichainAssetsRates[asset.address as CaipAssetId];

  const nonEvmMarketData = multichainAssetRates?.marketData;
  const nonEvmMetadata = {
    rate: Number(multichainAssetRates?.rate),
    conversionTime: Number(multichainAssetRates?.conversionTime),
  };

  const evmMarketData = useSelector((state: RootState) =>
    isEvmNetworkSelected
      ? selectEvmTokenMarketData(state, {
          chainId: asset.chainId as Hex,
          tokenAddress: asset.address,
        })
      : null,
  );

  const conversionRate = isEvmNetworkSelected
    ? conversionRateBySymbol
    : nonEvmMetadata.rate;

  const localizeMarketDetails = useCallback(
    (value: number | undefined, shouldConvert: boolean): number | undefined => {
      if (!value || value <= 0) return undefined;
      return shouldConvert ? value * conversionRate : value;
    },
    [conversionRate],
  );

  const tokenMetadata = isEvmNetworkSelected ? evmMarketData?.metadata : null;
  const marketData = isEvmNetworkSelected
    ? evmMarketData?.marketData
    : nonEvmMarketData;

  const tokenDetails: TokenDetails = getTokenDetails(
    asset,
    isEvmNetworkSelected,
    tokenContractAddress,
    tokenMetadata,
  );

  if (!conversionRate || conversionRate < 0) {
    Logger.log('invalid conversion rate');
    return null;
  }

  const marketDetails: MarketDetails = {
    marketCap:
      marketData?.marketCap > 0
        ? formatWithThreshold(
            localizeMarketDetails(
              Number(marketData.marketCap),
              isEvmNetworkSelected,
            ) ?? 0,
            0.01,
            i18n.locale,
            {
              style: 'currency',
              notation: 'compact',
              currency: currentCurrency,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
          )
        : null,
    totalVolume:
      marketData?.totalVolume > 0
        ? formatWithThreshold(
            localizeMarketDetails(
              Number(marketData.totalVolume),
              isEvmNetworkSelected,
            ) ?? 0,
            0.01,
            i18n.locale,
            {
              style: 'currency',
              notation: 'compact',
              currency: currentCurrency,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
          )
        : null,
    volumeToMarketCap:
      marketData?.marketCap > 0
        ? formatWithThreshold(
            Number(marketData.totalVolume) / Number(marketData.marketCap),
            0.0001,
            i18n.locale,
            {
              style: 'percent',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
          )
        : null,
    circulatingSupply:
      marketData?.circulatingSupply && marketData?.circulatingSupply > 0
        ? formatWithThreshold(
            Number(marketData.circulatingSupply),
            0.01,
            i18n.locale,
            {
              style: 'decimal',
              notation: 'compact',
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            },
          )
        : null,
    allTimeHigh:
      marketData?.allTimeHigh > 0
        ? formatWithThreshold(
            localizeMarketDetails(
              Number(marketData.allTimeHigh),
              isEvmNetworkSelected,
            ) ?? 0,
            0.01,
            i18n.locale,
            {
              style: 'currency',
              currency: currentCurrency,
            },
          )
        : null,
    allTimeLow:
      marketData?.allTimeLow > 0
        ? formatWithThreshold(
            localizeMarketDetails(
              Number(marketData.allTimeLow),
              isEvmNetworkSelected,
            ) ?? 0,
            0.01,
            i18n.locale,
            {
              style: 'currency',
              currency: currentCurrency,
            },
          )
        : null,
    fullyDiluted:
      marketData?.dilutedMarketCap && marketData?.dilutedMarketCap > 0
        ? formatWithThreshold(
            Number(marketData.dilutedMarketCap),
            0.01,
            i18n.locale,
            {
              style: 'currency',
              notation: 'compact',
              currency: currentCurrency,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
          )
        : null,
  };

  const hasAssetBalance =
    asset.balanceFiat && parseFloatSafe(asset.balanceFiat) > 0;

  return (
    <View style={styles.tokenDetailsContainer}>
      {asset.isETH && <StakingEarnings asset={asset} />}
      {isStablecoinLendingFeatureEnabled() &&
        isSupportedLendingTokenByChainId(asset.symbol, asset.chainId ?? '') &&
        hasAssetBalance && <EarnEmptyStateCta token={asset} />}
      {(asset.isETH || tokenMetadata || !isEvmNetworkSelected) && (
        <TokenDetailsList tokenDetails={tokenDetails} />
      )}
      {marketData && <MarketDetailsList marketDetails={marketDetails} />}
    </View>
  );
};

export default TokenDetails;
