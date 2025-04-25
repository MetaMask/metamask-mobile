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
import { isStablecoinLendingFeatureEnabled } from '../../Stake/constants';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';
import { selectEvmTokenMarketData } from '../../../../selectors/multichain/evm';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
///: END:ONLY_INCLUDE_IF
import { MarketDataDetails } from '@metamask/assets-controllers';
import { formatMarketDetails } from '../utils/marketDetails';
import { getTokenDetails } from '../utils/getTokenDetails';

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
    isEvmNetworkSelected
      ? selectEvmTokenMarketData(state, {
          chainId: asset.chainId as Hex,
          tokenAddress: asset.address,
        })
      : null,
  ) as EvmMarketData | null;

  const evmConversionRate = isAssetFromSearch(asset)
    ? 1
    : conversionRateBySymbol;

  const conversionRate = isEvmNetworkSelected
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
    tokenMetadata = isEvmNetworkSelected ? evmMarketData?.metadata : null;
    marketData = isEvmNetworkSelected
      ? evmMarketData?.marketData
      : nonEvmMarketData;
  }
  const tokenDetails = useMemo(
    () =>
      getTokenDetails(
        asset,
        isEvmNetworkSelected,
        tokenContractAddress,
        tokenMetadata as Record<string, string | number | string[]>,
      ),
    [asset, isEvmNetworkSelected, tokenContractAddress, tokenMetadata],
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
        isEvmNetworkSelected,
        conversionRate,
      },
    );
  }, [marketData, currentCurrency, isEvmNetworkSelected, conversionRate]);

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
      {marketData && marketDetails && (
        <MarketDetailsList marketDetails={marketDetails} />
      )}
    </View>
  );
};

export default TokenDetails;
