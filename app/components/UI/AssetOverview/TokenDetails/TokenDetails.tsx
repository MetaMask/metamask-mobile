import { zeroAddress } from 'ethereumjs-util';
import { Hex } from '@metamask/utils';
import { RootState } from '../../../../reducers';
import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import i18n from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './TokenDetails.styles';
import { safeToChecksumAddress } from '../../../../util/address';
import { selectTokenList } from '../../../../selectors/tokenListController';
import {
  selectTokenMarketDataByChainId,
  selectContractExchangeRates,
} from '../../../../selectors/tokenRatesController';
import {
  selectConversionRateBySymbol,
  selectCurrentCurrency,
  selectConversionRate,
} from '../../../../selectors/currencyRateController';
import { selectNativeCurrencyByChainId } from '../../../../selectors/networkController';
import {
  convertDecimalToPercentage,
  localizeLargeNumber,
} from '../../../../util/number';
import { formatCurrency } from '../../../../util/confirm-tx';
import Logger from '../../../../util/Logger';
import TokenDetailsList from './TokenDetailsList';
import MarketDetailsList from './MarketDetailsList';
import { TokenI } from '../../Tokens/types';
import StakingEarnings from '../../Stake/components/StakingEarnings';
import { isPortfolioViewEnabled } from '../../../../util/networks';
import { isAssetFromSearch, selectTokenDisplayData } from '../../../../selectors/tokenSearchDiscoveryDataController';
import { isSupportedLendingTokenByChainId } from '../../Earn/utils/token';
import EarnEmptyStateCta from '../../Earn/components/EmptyStateCta';
import { parseFloatSafe } from '../../Earn/utils';
import { isStablecoinLendingFeatureEnabled } from '../../Stake/constants';

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

const TokenDetails: React.FC<TokenDetailsProps> = ({ asset }) => {
  const { styles } = useStyles(styleSheet, {});
  const tokenExchangeRatesByChainId = useSelector((state: RootState) =>
    selectTokenMarketDataByChainId(state, asset.chainId as Hex),
  );
  const nativeCurrency = useSelector((state: RootState) =>
    selectNativeCurrencyByChainId(state, asset.chainId as Hex),
  );
  const tokenExchangeRatesLegacy = useSelector(selectContractExchangeRates);
  const conversionRateLegacy = useSelector(selectConversionRate);
  const conversionRateBySymbol = useSelector((state: RootState) =>
    selectConversionRateBySymbol(state, nativeCurrency),
  );
  const currentCurrency = useSelector(selectCurrentCurrency);
  const tokenContractAddress = safeToChecksumAddress(asset.address);
  const tokenList = useSelector(selectTokenList);

  let conversionRate;
  if (isAssetFromSearch(asset)) {
    conversionRate = 1;
  } else if (isPortfolioViewEnabled()) {
    conversionRate = conversionRateBySymbol;
  } else {
    conversionRate = conversionRateLegacy;
  }
  const tokenExchangeRates = isPortfolioViewEnabled()
    ? tokenExchangeRatesByChainId
    : tokenExchangeRatesLegacy;

  let tokenMetadata;
  let marketData;

  const tokenResult = useSelector((state: RootState) => selectTokenDisplayData(state, asset.chainId as Hex, asset.address as Hex));

  if (isAssetFromSearch(asset) && tokenResult?.found && tokenResult.price) {
    marketData = tokenResult.price;
    tokenMetadata = tokenResult.token;
  } else if (asset.isETH) {
    marketData = tokenExchangeRates?.[zeroAddress() as Hex];
  } else if (tokenContractAddress) {
    tokenMetadata = tokenList?.[tokenContractAddress.toLowerCase()];
    marketData = tokenExchangeRates?.[tokenContractAddress as Hex];
  } else {
    Logger.log('cannot find contract address');
    return null;
  }

  if (!conversionRate || conversionRate < 0) {
    Logger.log('invalid conversion rate');
    return null;
  }

  const tokenDetails: TokenDetails = asset.isETH
    ? {
        contractAddress: zeroAddress(),
        tokenDecimal: 18,
        tokenList: '',
      }
    : {
        contractAddress: tokenContractAddress || null,
        tokenDecimal: tokenMetadata?.decimals || null,
        tokenList: tokenMetadata?.aggregators?.join(', ') || null,
      };

  const marketDetails: MarketDetails = {
    marketCap:
      marketData?.marketCap > 0
        ? localizeLargeNumber(i18n, conversionRate * marketData.marketCap)
        : null,
    totalVolume:
      marketData?.totalVolume > 0
        ? localizeLargeNumber(i18n, conversionRate * marketData.totalVolume)
        : null,
    volumeToMarketCap:
      marketData?.marketCap > 0
        ? convertDecimalToPercentage(
            marketData.totalVolume / marketData.marketCap,
          )
        : null,
    circulatingSupply:
      marketData?.circulatingSupply > 0
        ? localizeLargeNumber(i18n, marketData.circulatingSupply)
        : null,
    allTimeHigh:
      marketData?.allTimeHigh > 0
        ? formatCurrency(
            conversionRate * marketData.allTimeHigh,
            currentCurrency,
          )
        : null,
    allTimeLow:
      marketData?.allTimeLow > 0
        ? formatCurrency(
            conversionRate * marketData.allTimeLow,
            currentCurrency,
          )
        : null,
    fullyDiluted:
      marketData?.dilutedMarketCap > 0
        ? localizeLargeNumber(i18n, marketData.dilutedMarketCap)
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
      {(asset.isETH || tokenMetadata) && (
        <TokenDetailsList tokenDetails={tokenDetails} />
      )}
      {marketData && <MarketDetailsList marketDetails={marketDetails} />}
    </View>
  );
};

export default TokenDetails;
