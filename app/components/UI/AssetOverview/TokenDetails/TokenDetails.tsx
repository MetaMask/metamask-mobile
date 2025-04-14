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
import { isSupportedLendingTokenByChainId } from '../../Earn/utils/token';
import EarnEmptyStateCta from '../../Earn/components/EmptyStateCta';
import { parseFloatSafe } from '../../Earn/utils';
import { isStablecoinLendingFeatureEnabled } from '../../Stake/constants';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';
import { selectEvmTokenMarketData } from '../../../../selectors/multichain/evm';
import { selectNonEvmMarketData } from '../../../../selectors/multichain';

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
  const conversionRateBySymbol = useSelector((state: RootState) =>
    selectConversionRateBySymbol(state, nativeCurrency),
  );
  const currentCurrency = useSelector(selectCurrentCurrency);
  const tokenContractAddress = safeToChecksumAddress(asset.address);
  // const tokenList = useSelector(selectTokenList);

  const isEvmNetworkSelected = useSelector(selectIsEvmNetworkSelected);
  const nonEvmMarketData = useSelector(selectNonEvmMarketData);

  const evmMarketData = useSelector((state: RootState) =>
    selectEvmTokenMarketData(state, {
      chainId: asset.chainId as Hex,
      tokenAddress: asset.address,
    }),
  );

  const conversionRate = conversionRateBySymbol;

  let tokenMetadata;
  let marketData;

  if (isEvmNetworkSelected) {
    marketData = nonEvmMarketData;
  } else {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    tokenMetadata = evmMarketData?.metadata;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    marketData = evmMarketData?.marketData;
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
        tokenList: tokenMetadata?.aggregators.join(', ') || null,
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

  console.log('marketData', marketData);

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
