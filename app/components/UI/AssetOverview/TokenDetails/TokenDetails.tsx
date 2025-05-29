import {
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  CaipAssetId,
  ///: END:ONLY_INCLUDE_IF
  Hex,
} from '@metamask/utils';
import { RootState } from '../../../../reducers';
import React, { useMemo } from 'react';
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
import {
  isAssetFromSearch,
  selectTokenDisplayData,
} from '../../../../selectors/tokenSearchDiscoveryDataController';
import { isSupportedLendingTokenByChainId } from '../../Earn/utils/token';
import EarnEmptyStateCta from '../../Earn/components/EmptyStateCta';
import { parseFloatSafe } from '../../Earn/utils';
import { selectStablecoinLendingEnabledFlag } from '../../Earn/selectors/featureFlags';
import { selectEvmTokenMarketData } from '../../../../selectors/multichain/evm';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
///: END:ONLY_INCLUDE_IF
import { MarketDataDetails } from '@metamask/assets-controllers';
import { formatMarketDetails } from '../utils/marketDetails';
import { getTokenDetails } from '../utils/getTokenDetails';
import { formatChainIdToCaip } from '@metamask/bridge-controller';

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
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

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
  const nonEvmMetadata = {
    rate: Number(multichainAssetRates?.rate),
    conversionTime: Number(multichainAssetRates?.conversionTime),
  };
  ///: END:ONLY_INCLUDE_IF

  const evmMarketData = useSelector((state: RootState) =>
    !isNonEvmAsset
      ? selectEvmTokenMarketData(state, {
          chainId: asset.chainId as Hex,
          tokenAddress: asset.address,
        })
      : null,
  ) as EvmMarketData | null;

  const evmConversionRate = isAssetFromSearch(asset)
    ? 1
    : conversionRateBySymbol;

  const conversionRate = !isNonEvmAsset
    ? evmConversionRate
    : nonEvmMetadata.rate;

  let marketData;
  let tokenMetadata;

  if (
    isAssetFromSearch(asset) &&
    tokenSearchResult?.found &&
    tokenSearchResult.price
  ) {
    marketData = tokenSearchResult.price;
    tokenMetadata = tokenSearchResult.token;
  } else {
    tokenMetadata = !isNonEvmAsset ? evmMarketData?.metadata : null;
    marketData = !isNonEvmAsset
      ? evmMarketData?.marketData
      : nonEvmMarketData;
  }
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

    if (!conversionRate || conversionRate < 0) {
      Logger.log('invalid conversion rate');
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
        isEvmAssetSelected: !isNonEvmAsset,
        conversionRate,
      },
    );
  }, [marketData, currentCurrency, isNonEvmAsset, conversionRate]);

  const hasAssetBalance =
    asset.balanceFiat && parseFloatSafe(asset.balanceFiat) > 0;

  return (
    <View style={styles.tokenDetailsContainer}>
      {asset.isETH && <StakingEarnings asset={asset} />}
      {isStablecoinLendingEnabled &&
        isSupportedLendingTokenByChainId(asset.symbol, asset.chainId ?? '') &&
        hasAssetBalance && <EarnEmptyStateCta token={asset} />}
      {(asset.isETH || tokenMetadata || isNonEvmAsset) && (
        <TokenDetailsList tokenDetails={tokenDetails} />
      )}
      {marketData && marketDetails && (
        <MarketDetailsList marketDetails={marketDetails} />
      )}
    </View>
  );
};

export default TokenDetails;
