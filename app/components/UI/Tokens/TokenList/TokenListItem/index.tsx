import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Hex, isCaipChainId } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import useTokenBalancesController from '../../../../hooks/useTokenBalancesController/useTokenBalancesController';
import { useTheme } from '../../../../../util/theme';
import { TOKEN_BALANCE_LOADING, TOKEN_RATE_UNDEFINED } from '../../constants';
import { deriveBalanceFromAssetMarketDetails } from '../../util/deriveBalanceFromAssetMarketDetails';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { selectTokensBalances } from '../../../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../../selectors/currencyRateController';
import { RootState } from '../../../../../reducers';
import { safeToChecksumAddress } from '../../../../../util/address';
import {
  getTestNetImageByChainId,
  isTestNet,
  getDefaultNetworkByChainId,
} from '../../../../../util/networks';
import createStyles from '../../styles';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
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
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import { TokenI } from '../../types';
import I18n, { strings } from '../../../../../../locales/i18n';
import { ScamWarningIcon } from '../ScamWarningIcon';
import { ScamWarningModal } from '../ScamWarningModal';
import { StakeButton } from '../../../Stake/components/StakeButton';
import { useStakingChainByChainId } from '../../../Stake/hooks/useStakingChain';
import {
  PopularList,
  UnpopularNetworkList,
  CustomNetworkImgMapping,
  getNonEvmNetworkImageSourceByChainId,
} from '../../../../../util/networks/customNetworks';
import { selectShowFiatInTestnets } from '../../../../../selectors/settings';
import { selectIsEvmNetworkSelected } from '../../../../../selectors/multichainNetworkController';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { formatWithThreshold } from '../../../../../util/assets';

interface TokenListItemProps {
  asset: TokenI;
  showScamWarningModal: boolean;
  showRemoveMenu: (arg: TokenI) => void;
  setShowScamWarningModal: (arg: boolean) => void;
  privacyMode: boolean;
  showPercentageChange?: boolean;
}

export const TokenListItem = React.memo(
  ({
    asset,
    showScamWarningModal,
    showRemoveMenu,
    setShowScamWarningModal,
    privacyMode,
    showPercentageChange = true,
  }: TokenListItemProps) => {
    const { trackEvent, createEventBuilder } = useMetrics();
    const navigation = useNavigation();
    const { colors } = useTheme();

    useTokenBalancesController();

    const isEvmNetworkSelected = useSelector(selectIsEvmNetworkSelected);
    const selectedInternalAccountAddress = useSelector(
      selectSelectedInternalAccountAddress,
    );

    const chainId = asset.chainId as Hex;
    const primaryCurrency = useSelector(
      (state: RootState) => state.settings.primaryCurrency,
    );
    const currentCurrency = useSelector(selectCurrentCurrency);
    const networkConfigurations = useSelector(selectNetworkConfigurations);
    const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);

    // multi chain
    const multiChainTokenBalance = useSelector(selectTokensBalances);
    const multiChainMarketData = useSelector(selectTokenMarketData);
    const multiChainCurrencyRates = useSelector(selectCurrencyRates);

    const styles = createStyles(colors);

    const itemAddress = safeToChecksumAddress(asset.address);

    // Choose values based on multichain or legacy
    const exchangeRates = multiChainMarketData?.[chainId as Hex];
    const tokenBalances =
      multiChainTokenBalance?.[selectedInternalAccountAddress as Hex]?.[
        chainId as Hex
      ];

    const nativeCurrency =
      networkConfigurations?.[chainId as Hex]?.nativeCurrency;

    const conversionRate =
      multiChainCurrencyRates?.[nativeCurrency]?.conversionRate || 0;

    const oneHundredths = 0.01;
    const oneHundredThousandths = 0.00001;

    const { balanceFiat, balanceValueFormatted } = useMemo(
      () =>
        isEvmNetworkSelected
          ? deriveBalanceFromAssetMarketDetails(
              asset,
              exchangeRates || {},
              tokenBalances || {},
              conversionRate || 0,
              currentCurrency || '',
            )
          : {
              balanceFiat: asset.balanceFiat
                ? formatWithThreshold(
                    parseFloat(asset.balanceFiat),
                    oneHundredths,
                    I18n.locale,
                    { style: 'currency', currency: currentCurrency },
                  )
                : TOKEN_BALANCE_LOADING,
              balanceValueFormatted: asset.balance
                ? formatWithThreshold(
                    parseFloat(asset.balance),
                    oneHundredThousandths,
                    I18n.locale,
                    { minimumFractionDigits: 0, maximumFractionDigits: 5 },
                  )
                : TOKEN_BALANCE_LOADING,
            },
      [
        isEvmNetworkSelected,
        asset,
        exchangeRates,
        tokenBalances,
        conversionRate,
        currentCurrency,
      ],
    );

    const tokenPercentageChange = asset.address
      ? multiChainMarketData?.[chainId as Hex]?.[asset.address as Hex]
          ?.pricePercentChange1d
      : undefined;

    const pricePercentChange1d = asset.isNative
      ? multiChainMarketData?.[chainId as Hex]?.[
          getNativeTokenAddress(chainId as Hex) as Hex
        ]?.pricePercentChange1d
      : tokenPercentageChange;

    // render balances according to primary currency
    let mainBalance;
    let secondaryBalance;
    const shouldNotShowBalanceOnTestnets =
      isTestNet(chainId) && !showFiatOnTestnets;

    // Set main and secondary balances based on the primary currency and asset type.
    if (primaryCurrency === 'ETH') {
      // TECH_DEBT: this should not be primary currency for multichain, not ETH
      // Default to displaying the formatted balance value and its fiat equivalent.
      mainBalance = balanceValueFormatted?.toUpperCase();
      secondaryBalance = balanceFiat?.toUpperCase();
      // For ETH as a native currency, adjust display based on network safety.
      if (asset.isETH) {
        // Main balance always shows the formatted balance value for ETH.
        mainBalance = balanceValueFormatted?.toUpperCase();
        // Display fiat value as secondary balance only for original native tokens on safe networks.
        secondaryBalance = shouldNotShowBalanceOnTestnets
          ? undefined
          : balanceFiat?.toUpperCase();
      }
    } else {
      secondaryBalance = balanceValueFormatted?.toUpperCase();
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

    const { isStakingSupportedChain } = useStakingChainByChainId(chainId);

    const networkBadgeSource = useCallback(
      (currentChainId: Hex) => {
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
        if (isCaipChainId(chainId)) {
          return getNonEvmNetworkImageSourceByChainId(chainId);
        }
        if (customNetworkImg) {
          return customNetworkImg;
        }
      },
      [chainId],
    );

    const onItemPress = (token: TokenI) => {
      // Track the event
      trackEvent(
        createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_OPENED)
          .addProperties({
            source: 'mobile-token-list',
            chain_id: token.chainId,
            token_symbol: token.symbol,
          })
          .build(),
      );

      // token details only currently supported for evm
      // TODO: Remove this when shipping multichain token details feature
      // if (!isEvmNetworkSelected) {
      //   return;
      // }

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
      if (asset.isNative) {
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
        balance={mainBalance}
        secondaryBalance={secondaryBalance}
        privacyMode={privacyMode}
      >
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkBadgeSource(chainId as Hex)}
            />
          }
        >
          {renderNetworkAvatar()}
        </BadgeWrapper>
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
