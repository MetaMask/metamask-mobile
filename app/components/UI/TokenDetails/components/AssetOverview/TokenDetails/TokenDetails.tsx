import {
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  CaipAssetId,
  ///: END:ONLY_INCLUDE_IF
  Hex,
  isCaipAssetType,
  parseCaipAssetType,
} from '@metamask/utils';
import { RootState } from '../../../../../../reducers';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import i18n from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './TokenDetails.styles';
import { safeToChecksumAddress } from '../../../../../../util/address';
import {
  selectConversionRateBySymbol,
  selectCurrentCurrency,
} from '../../../../../../selectors/currencyRateController';
import { selectNativeCurrencyByChainId } from '../../../../../../selectors/networkController';
import Logger from '../../../../../../util/Logger';
import TokenDetailsList from './TokenDetailsList';
import MarketDetailsList from './MarketDetailsList';
import { TokenI } from '../../../../Tokens/types';
import {
  isAssetFromSearch,
  selectTokenDisplayData,
} from '../../../../../../selectors/tokenSearchDiscoveryDataController';
import { selectEvmTokenMarketData } from '../../../../../../selectors/multichain/evm';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainAssetsRates } from '../../../../../../selectors/multichain';
///: END:ONLY_INCLUDE_IF
import { MarketDataDetails } from '@metamask/assets-controllers';
import { formatMarketDetails } from '../utils/marketDetails';
import { getTokenDetails } from '../utils/getTokenDetails';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { handleFetch } from '@metamask/controller-utils';
import { isNonEvmChainId } from '../../../../../../core/Multichain/utils';
import { toAssetId } from '../../../../Bridge/hooks/useAssetMetadata/utils';

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

interface EvmMarketData {
  metadata?: Record<string, string | number | string[]>;
  marketData?: MarketDataDetails;
}

const TokenDetails: React.FC<TokenDetailsProps> = ({ asset }) => {
  // For non evm assets, the resultChainId is equal to the asset.chainId; while for evm assets; the resultChainId === "eip155:1" !== asset.chainId
  const resultChainId = formatChainIdToCaip(asset.chainId as Hex);
  const isNonEvmAsset = resultChainId === asset.chainId;
  const { styles } = useStyles(styleSheet, {});

  const nativeCurrency = useSelector((state: RootState) =>
    selectNativeCurrencyByChainId(state, asset.chainId as Hex),
  );
  const conversionRateBySymbol = useSelector((state: RootState) =>
    selectConversionRateBySymbol(state, nativeCurrency),
  );
  const currentCurrency = useSelector(selectCurrentCurrency);

  const tokenContractAddress = !isNonEvmAsset
    ? safeToChecksumAddress(asset.address)
    : asset.address;

  const tokenSearchResult = useSelector((state: RootState) =>
    selectTokenDisplayData(state, asset.chainId as Hex, asset.address as Hex),
  );

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const allMultichainAssetsRates = useSelector(selectMultichainAssetsRates);

  const multichainAssetRates =
    allMultichainAssetsRates[asset.address as CaipAssetId];

  const nonEvmMarketData = multichainAssetRates?.marketData;
  ///: END:ONLY_INCLUDE_IF

  const evmMarketData = useSelector((state: RootState) =>
    !isNonEvmAsset
      ? selectEvmTokenMarketData(state, {
          chainId: asset.chainId as Hex,
          tokenAddress: asset.address,
        })
      : null,
  ) as EvmMarketData | null;

  const conversionRate = isAssetFromSearch(asset) ? 1 : conversionRateBySymbol;

  let tokenMetadata;
  let cachedMarketData: MarketDataDetails | undefined;

  if (
    isAssetFromSearch(asset) &&
    tokenSearchResult?.found &&
    tokenSearchResult.price
  ) {
    // Search results have market data
    cachedMarketData = tokenSearchResult.price;
    tokenMetadata = tokenSearchResult.token;
  } else {
    tokenMetadata = !isNonEvmAsset ? evmMarketData?.metadata : null;
    cachedMarketData = !isNonEvmAsset
      ? evmMarketData?.marketData
      : (nonEvmMarketData as MarketDataDetails | undefined);
  }

  // Fetch market data from API if not in cache
  const [fetchedMarketData, setFetchedMarketData] = useState<
    Record<string, unknown> | undefined
  >();

  useEffect(() => {
    if (cachedMarketData) return;

    const plainTokenAddress = isCaipAssetType(asset.address)
      ? parseCaipAssetType(asset.address).assetReference
      : asset.address;

    if (!plainTokenAddress || !asset.chainId) return;

    const fetchData = async () => {
      try {
        const isNonEvm = isNonEvmChainId(asset.chainId as string);

        // Convert chainId to CAIP format for both EVM and non-EVM chains
        const caipChainId = isNonEvm
          ? (asset.chainId as `${string}:${string}`)
          : formatChainIdToCaip(asset.chainId as Hex);

        const assetId = toAssetId(plainTokenAddress, caipChainId);
        if (!assetId) return;

        // Use v3 API for all chains
        const url = `https://price.api.cx.metamask.io/v3/spot-prices?${new URLSearchParams(
          {
            assetIds: assetId,
            includeMarketData: 'true',
            vsCurrency: currentCurrency.toLowerCase(),
          },
        )}`;
        const response = (await handleFetch(url)) as Record<
          string,
          Record<string, unknown>
        >;
        setFetchedMarketData(response?.[assetId]);
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      }
    };

    fetchData();
  }, [asset.address, asset.chainId, cachedMarketData, currentCurrency]);

  const marketData = cachedMarketData ?? fetchedMarketData;

  // Determine if we're using cached data (which is in native units for ALL EVM assets)
  const isUsingCachedData = Boolean(cachedMarketData);

  // ALL cached EVM data (native AND ERC20) is in native units and needs conversion
  // API-fetched data (with vsCurrency param) is already in fiat
  const needsConversion = isUsingCachedData && !isNonEvmAsset;

  const tokenDetails = useMemo(
    () =>
      getTokenDetails(
        asset,
        isNonEvmAsset,
        tokenContractAddress,
        tokenMetadata as Record<string, string | number | string[]>,
      ),
    [asset, isNonEvmAsset, tokenContractAddress, tokenMetadata],
  );

  const marketDetails = useMemo(() => {
    if (!marketData) return;

    // For cached EVM data, we need a valid conversion rate
    if (needsConversion && (!conversionRate || conversionRate < 0)) {
      Logger.log('invalid conversion rate for cached EVM data');
      return;
    }

    return formatMarketDetails(
      {
        marketCap: marketData.marketCap
          ? Number(marketData.marketCap)
          : undefined,
        totalVolume: marketData.totalVolume
          ? Number(marketData.totalVolume)
          : undefined,
        circulatingSupply: marketData.circulatingSupply
          ? Number(marketData.circulatingSupply)
          : undefined,
        allTimeHigh: marketData.allTimeHigh
          ? Number(marketData.allTimeHigh)
          : undefined,
        allTimeLow: marketData.allTimeLow
          ? Number(marketData.allTimeLow)
          : undefined,
        dilutedMarketCap: (marketData as MarketDataDetails)?.dilutedMarketCap
          ? Number((marketData as MarketDataDetails).dilutedMarketCap)
          : undefined,
      },
      {
        locale: i18n.locale,
        currentCurrency,
        needsConversion,
        conversionRate: conversionRate ?? undefined,
      },
    );
  }, [marketData, currentCurrency, needsConversion, conversionRate]);

  const hasAddressAndDecimals =
    tokenDetails.contractAddress && tokenDetails.tokenDecimal;
  return (
    <View style={styles.tokenDetailsContainer}>
      {(asset.isETH ||
        tokenMetadata ||
        isNonEvmAsset ||
        hasAddressAndDecimals) && (
        <TokenDetailsList tokenDetails={tokenDetails} />
      )}
      {marketData && marketDetails && (
        <MarketDetailsList marketDetails={marketDetails} />
      )}
    </View>
  );
};

export default TokenDetails;
