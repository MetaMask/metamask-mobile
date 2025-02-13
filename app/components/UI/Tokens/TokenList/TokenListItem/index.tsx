import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Hex } from '@metamask/utils';
import { zeroAddress } from 'ethereumjs-util';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import useTokenBalancesController from '../../../../hooks/useTokenBalancesController/useTokenBalancesController';
import useIsOriginalNativeTokenSymbol from '../../../../hooks/useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import { useTheme } from '../../../../../util/theme';
import { TOKEN_RATE_UNDEFINED } from '../../constants';
import { deriveBalanceFromAssetMarketDetails } from '../../util/deriveBalanceFromAssetMarketDetails';
import {
  selectChainId,
  selectProviderConfig,
  selectTicker,
  selectNetworkConfigurations,
  selectNetworkConfigurationByChainId,
} from '../../../../../selectors/networkController';
import {
  selectContractExchangeRates,
  selectTokenMarketData,
} from '../../../../../selectors/tokenRatesController';
import { selectTokensBalances } from '../../../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import {
  selectConversionRate,
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../../selectors/currencyRateController';
import { RootState } from '../../../../../reducers';
import { safeToChecksumAddress } from '../../../../../util/address';
import {
  getTestNetImageByChainId,
  isLineaMainnetByChainId,
  isMainnetByChainId,
  isTestNet,
  getDefaultNetworkByChainId,
  isPortfolioViewEnabled,
} from '../../../../../util/networks';
import createStyles from '../../styles';
import BadgeWrapper from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import PercentageChange from '../../../../../component-library/components-temp/Price/PercentageChange';
import AssetElement from '../../../AssetElement';
import NetworkMainAssetLogo from '../../../NetworkMainAssetLogo';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import images from 'images/image-icons';
import { TokenI } from '../../types';
import { strings } from '../../../../../../locales/i18n';
import { ScamWarningIcon } from '../ScamWarningIcon';
import { ScamWarningModal } from '../ScamWarningModal';
import { StakeButton } from '../../../Stake/components/StakeButton';
import { useStakingChainByChainId } from '../../../Stake/hooks/useStakingChain';
import {
  PopularList,
  UnpopularNetworkList,
  CustomNetworkImgMapping,
} from '../../../../../util/networks/customNetworks';
import { selectShowFiatInTestnets } from '../../../../../selectors/settings';

interface TokenListItemProps {
  asset: TokenI;
  showScamWarningModal: boolean;
  showRemoveMenu: (arg: TokenI) => void;
  setShowScamWarningModal: (arg: boolean) => void;
  privacyMode: boolean;
  showPercentageChange?: boolean;
  showNetworkBadge?: boolean;
}

export const TokenListItem = React.memo(
  ({
    asset,
    showScamWarningModal,
    showRemoveMenu,
    setShowScamWarningModal,
    privacyMode,
    showPercentageChange = true,
    showNetworkBadge = true,
  }: TokenListItemProps) => {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const selectedInternalAccountAddress = useSelector(
      selectSelectedInternalAccountAddress,
    );
    const { data: selectedChainTokenBalance } = useTokenBalancesController();

    const { type } = useSelector(selectProviderConfig);
    const selectedChainId = useSelector(selectChainId);
    const chainId = isPortfolioViewEnabled()
      ? (asset.chainId as Hex)
      : selectedChainId;
    const ticker = useSelector(selectTicker);
    const isOriginalNativeTokenSymbol = useIsOriginalNativeTokenSymbol(
      chainId,
      ticker,
      type,
    );
    const networkConfigurationByChainId = useSelector((state: RootState) =>
      selectNetworkConfigurationByChainId(state, asset.chainId as Hex),
    );
    const primaryCurrency = useSelector(
      (state: RootState) => state.settings.primaryCurrency,
    );
    const currentCurrency = useSelector(selectCurrentCurrency);
    const networkConfigurations = useSelector(selectNetworkConfigurations);
    const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);

    // single chain
    const singleTokenExchangeRates = useSelector(selectContractExchangeRates);
    const singleTokenConversionRate = useSelector(selectConversionRate);

    // multi chain
    const multiChainTokenBalance = useSelector(selectTokensBalances);
    const multiChainMarketData = useSelector(selectTokenMarketData);
    const multiChainCurrencyRates = useSelector(selectCurrencyRates);

    const styles = createStyles(colors);

    const itemAddress = safeToChecksumAddress(asset.address);

    // Choose values based on multichain or legacy
    const exchangeRates = isPortfolioViewEnabled()
      ? multiChainMarketData?.[chainId as Hex]
      : singleTokenExchangeRates;
    const tokenBalances = isPortfolioViewEnabled()
      ? multiChainTokenBalance?.[selectedInternalAccountAddress as Hex]?.[
          chainId as Hex
        ]
      : selectedChainTokenBalance;
    const nativeCurrency =
      networkConfigurations?.[chainId as Hex]?.nativeCurrency;

    const conversionRate = isPortfolioViewEnabled()
      ? multiChainCurrencyRates?.[nativeCurrency]?.conversionRate || 0
      : singleTokenConversionRate;

    const { balanceFiat, balanceValueFormatted } = useMemo(
      () =>
        deriveBalanceFromAssetMarketDetails(
          asset,
          exchangeRates || {},
          tokenBalances || {},
          conversionRate || 0,
          currentCurrency || '',
        ),
      [asset, exchangeRates, tokenBalances, conversionRate, currentCurrency],
    );

    let pricePercentChange1d: number;

    if (isPortfolioViewEnabled()) {
      const tokenPercentageChange = asset.address
        ? multiChainMarketData?.[chainId as Hex]?.[asset.address as Hex]
            ?.pricePercentChange1d
        : 0;

      pricePercentChange1d = asset.isNative
        ? multiChainMarketData?.[chainId as Hex]?.[zeroAddress() as Hex]
            ?.pricePercentChange1d
        : tokenPercentageChange;
    } else {
      pricePercentChange1d = itemAddress
        ? exchangeRates?.[itemAddress as Hex]?.pricePercentChange1d
        : exchangeRates?.[zeroAddress() as Hex]?.pricePercentChange1d;
    }

    // render balances according to primary currency
    let mainBalance;
    let secondaryBalance;
    const shouldNotShowBalanceOnTestnets =
      isTestNet(chainId) && !showFiatOnTestnets;

    // Set main and secondary balances based on the primary currency and asset type.
    if (primaryCurrency === 'ETH') {
      // Default to displaying the formatted balance value and its fiat equivalent.
      mainBalance = balanceValueFormatted;
      secondaryBalance = balanceFiat;
      // For ETH as a native currency, adjust display based on network safety.
      if (asset.isETH) {
        // Main balance always shows the formatted balance value for ETH.
        mainBalance = balanceValueFormatted;
        // Display fiat value as secondary balance only for original native tokens on safe networks.
        if (isPortfolioViewEnabled()) {
          secondaryBalance = shouldNotShowBalanceOnTestnets
            ? undefined
            : balanceFiat;
        } else {
          secondaryBalance = isOriginalNativeTokenSymbol ? balanceFiat : null;
        }
      }
    } else {
      secondaryBalance = balanceValueFormatted;
      if (shouldNotShowBalanceOnTestnets && !balanceFiat) {
        mainBalance = undefined;
      } else {
        mainBalance =
          balanceFiat ?? strings('wallet.unable_to_find_conversion_rate');
      }
    }

    if (asset?.hasBalanceError) {
      mainBalance = asset.symbol;
      secondaryBalance = strings('wallet.unable_to_load');
    }

    if (balanceFiat === TOKEN_RATE_UNDEFINED) {
      mainBalance = balanceValueFormatted;
      secondaryBalance = strings('wallet.unable_to_find_conversion_rate');
    }

    asset = { ...asset, balanceFiat };

    const isMainnet = isMainnetByChainId(chainId);
    const isLineaMainnet = isLineaMainnetByChainId(chainId);

    const { isStakingSupportedChain } = useStakingChainByChainId(chainId);

    const networkBadgeSource = useCallback(
      (currentChainId: Hex) => {
        if (!isPortfolioViewEnabled()) {
          if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);
          if (isMainnet) return images.ETHEREUM;

          if (isLineaMainnet) return images['LINEA-MAINNET'];

          if (CustomNetworkImgMapping[chainId]) {
            return CustomNetworkImgMapping[chainId];
          }

          return ticker ? images[ticker] : undefined;
        }
        if (isTestNet(currentChainId))
          return getTestNetImageByChainId(currentChainId);
        const defaultNetwork = getDefaultNetworkByChainId(currentChainId) as
          | {
              imageSource: string;
            }
          | undefined;

        if (defaultNetwork) {
          return defaultNetwork.imageSource;
        }

        const unpopularNetwork = UnpopularNetworkList.find(
          (networkConfig) => networkConfig.chainId === currentChainId,
        );

        const customNetworkImg = CustomNetworkImgMapping[currentChainId];

        const popularNetwork = PopularList.find(
          (networkConfig) => networkConfig.chainId === currentChainId,
        );

        const network = unpopularNetwork || popularNetwork;
        if (network) {
          return network.rpcPrefs.imageSource;
        }
        if (customNetworkImg) {
          return customNetworkImg;
        }
      },
      [chainId, isLineaMainnet, isMainnet, ticker],
    );

    const onItemPress = (token: TokenI) => {
      // if the asset is staked, navigate to the native asset details
      if (asset.isStaked) {
        return navigation.navigate('Asset', {
          ...token.nativeAsset,
        });
      }
      navigation.navigate('Asset', {
        ...token,
      });
    };

    const renderNetworkAvatar = useCallback(() => {
      if (!isPortfolioViewEnabled() && asset.isETH) {
        return <NetworkMainAssetLogo style={styles.ethLogo} />;
      }

      if (isPortfolioViewEnabled() && asset.isNative) {
        return (
          <NetworkAssetLogo
            chainId={chainId as Hex}
            style={styles.ethLogo}
            ticker={asset.ticker || ''}
            big={false}
            biggest={false}
            testID={'PLACE HOLDER'}
          />
        );
      }

      return (
        <AvatarToken
          name={asset.symbol}
          imageSource={{ uri: asset.image }}
          size={AvatarSize.Md}
        />
      );
    }, [
      asset.ticker,
      asset.isETH,
      asset.image,
      asset.symbol,
      asset.isNative,
      styles.ethLogo,
      chainId,
    ]);

    return (
      <AssetElement
        // assign staked asset a unique key
        key={asset.isStaked ? '0x_staked' : itemAddress || '0x'}
        onPress={onItemPress}
        onLongPress={asset.isETH || asset.isNative ? null : showRemoveMenu}
        asset={asset}
        balance={secondaryBalance}
        mainBalance={mainBalance}
        privacyMode={privacyMode}
      >
        {showNetworkBadge ? (
          <BadgeWrapper
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                imageSource={networkBadgeSource(chainId)}
                name={networkConfigurationByChainId?.name}
              />
            }
          >
            {renderNetworkAvatar()}
          </BadgeWrapper>
        ) : (
          renderNetworkAvatar()
        )}
        <View style={styles.balances}>
          {/*
           * The name of the token must callback to the symbol
           * The reason for this is that the wallet_watchAsset doesn't return the name
           * more info: https://docs.metamask.io/guide/rpc-api.html#wallet-watchasset
           */}
          <View style={styles.assetName}>
            <Text variant={TextVariant.BodyLGMedium}>
              {asset.name || asset.symbol}
            </Text>
            {/** Add button link to Portfolio Stake if token is supported ETH chain and not a staked asset */}
            {asset.isETH && isStakingSupportedChain && !asset.isStaked && (
              <StakeButton asset={asset} />
            )}
          </View>
          {!isTestNet(chainId) && showPercentageChange ? (
            <PercentageChange value={pricePercentChange1d} />
          ) : null}
        </View>
        <ScamWarningIcon
          asset={asset}
          setShowScamWarningModal={setShowScamWarningModal}
        />
        <ScamWarningModal
          showScamWarningModal={showScamWarningModal}
          setShowScamWarningModal={setShowScamWarningModal}
        />
      </AssetElement>
    );
  },
);
