import React, { useCallback, useContext, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text as RNText,
  TouchableOpacity,
  InteractionManager,
} from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { fontStyles } from '../../../styles/common';
import ClipboardManager from '../../../core/ClipboardManager';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { IconName as ComponentLibraryIconName } from '../../../component-library/components/Icons/Icon';
import EthereumAddress from '../../UI/EthereumAddress';
import Icon from 'react-native-vector-icons/Feather';
import TokenImage from '../../UI/TokenImage';
import { getDecimalChainId } from '../../../util/networks';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import NotificationManager from '../../../core/NotificationManager';
import AppConstants from '../../../core/AppConstants';
import { Token as TokenType } from '@metamask/assets-controllers';
import {
  balanceToFiat,
  renderFromTokenMinimalUnit,
} from '../../../util/number';
import WarningMessage from '../confirmations/legacy/components/WarningMessage';
import { useTheme } from '../../../util/theme';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Routes from '../../../constants/navigation/Routes';
import { selectNetworkConfigurationByChainId } from '../../../selectors/networkController';
import {
  selectCurrentCurrency,
  selectConversionRateBySymbol,
} from '../../../selectors/currencyRateController';
import { selectAllTokens } from '../../../selectors/tokensController';
import { selectTokenMarketDataByChainId } from '../../../selectors/tokenRatesController';
import { selectTokensBalances } from '../../../selectors/tokenBalancesController';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { RootState } from 'app/reducers';
import { Colors } from '../../../util/theme/models';
import { Hex } from '@metamask/utils';
import { selectLastSelectedEvmAccount } from '../../../selectors/accountsController';
import { TokenI } from '../../UI/Tokens/types';
import { areAddressesEqual } from '../../../util/address';
// Perps Discovery Banner imports
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { usePerpsMarketForAsset } from '../../UI/Perps/hooks/usePerpsMarketForAsset';
import PerpsDiscoveryBanner from '../../UI/Perps/components/PerpsDiscoveryBanner';
import { PerpsEventValues } from '../../UI/Perps/constants/eventNames';
import { isTokenTrustworthyForPerps } from '../../UI/Perps/constants/perpsConfig';
import type { PerpsNavigationParamList } from '../../UI/Perps/types/navigation';

// Inline header styles
const inlineHeaderStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    gap: 16,
  },
  leftButton: {
    marginLeft: 16,
  },
  titleWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  rightPlaceholder: {
    marginRight: 16,
    width: 24,
  },
});

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    container: {
      padding: 16,
      backgroundColor: colors.background.default,
      alignItems: 'flex-start',
    },
    descriptionContainer: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
    },
    tokenImage: { height: 36, width: 36, marginRight: 8 },
    sectionTitleLabel: {
      ...fontStyles.bold,
      fontSize: 16,
      color: colors.text.default,
      marginTop: 32,
    },
    firstSectionTitle: {
      marginTop: 8,
    },
    descriptionLabel: {
      ...fontStyles.normal,
      fontSize: 16,
      color: colors.text.default,
    },
    hideButton: {
      marginTop: 48,
    },
    hideButtonLabel: {
      ...fontStyles.normal,
      fontSize: 16,
      color: colors.error.default,
    },
    addressLinkLabel: {
      ...fontStyles.normal,
      fontSize: 16,
      color: colors.primary.default,
    },
    copyIcon: {
      marginLeft: 4,
      color: colors.primary.default,
    },
    warningBanner: { marginTop: 8 },
    warningBannerDesc: { color: colors.text.default },
    warningBannerLink: { color: colors.primary.default },
  });

interface Props {
  route: {
    params: {
      address: Hex;
      chainId: Hex;
      asset: TokenI;
    };
  };
}

type InnerProps = Props & { token: TokenType };

const AssetDetails = (props: InnerProps) => {
  const { address, chainId: networkId, asset } = props.route.params;
  const { token } = props;
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { toastRef } = useContext(ToastContext);
  const selectedAccountAddressEvm = useSelector(selectLastSelectedEvmAccount);

  // Perps Discovery Banner
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

  const selectedAccountAddress = selectedAccountAddressEvm?.address;
  const chainId = networkId;

  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, chainId),
  );
  const networkName = networkConfigurationByChainId?.name;
  const conversionRateBySymbol = useSelector((state: RootState) =>
    selectConversionRateBySymbol(
      state,
      networkConfigurationByChainId?.nativeCurrency,
    ),
  );
  const currentCurrency = useSelector(selectCurrentCurrency);
  const primaryCurrency = useSelector(
    (state: RootState) => state.settings.primaryCurrency,
  );

  const tokenExchangeRatesByChainId = useSelector((state: RootState) =>
    selectTokenMarketDataByChainId(state, chainId),
  );
  const allTokenBalances = useSelector(selectTokensBalances);

  const { symbol, decimals, aggregators = [] } = token;

  // Perps Discovery Banner - check if perps market exists for this asset
  const { hasPerpsMarket, marketData } = usePerpsMarketForAsset(
    isPerpsEnabled ? symbol : null,
  );

  // Check if token is trustworthy for showing Perps banner
  const isTokenTrustworthy = isTokenTrustworthyForPerps(token);

  // Handler for perps discovery banner press
  // Analytics (PERPS_SCREEN_VIEWED) tracked by PerpsMarketDetailsView on mount
  const handlePerpsDiscoveryPress = useCallback(() => {
    if (marketData) {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: marketData,
          source: PerpsEventValues.SOURCE.ASSET_DETAIL_SCREEN,
        },
      });
    }
  }, [marketData, navigation]);

  const insets = useSafeAreaInsets();

  const copyAddressToClipboard = async () => {
    await ClipboardManager.setString(address);
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: ComponentLibraryIconName.CheckBold,
      iconColor: colors.accent03.dark,
      backgroundColor: colors.accent03.normal,
      labelOptions: [
        { label: strings('detected_tokens.address_copied_to_clipboard') },
      ],
      hasNoTimeout: false,
    });
  };

  const triggerHideToken = () => {
    const { TokensController } = Engine.context;
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: 'AssetHideConfirmation',
      params: {
        onConfirm: () => {
          navigation.navigate('WalletView');
          InteractionManager.runAfterInteractions(() => {
            const { NetworkController } = Engine.context;
            const networkClientId =
              NetworkController.findNetworkClientIdByChainId(chainId);
            try {
              TokensController.ignoreTokens([address], networkClientId);
              NotificationManager.showSimpleNotification({
                status: `simple_notification`,
                duration: 5000,
                title: strings('wallet.token_toast.token_hidden_title'),
                description: strings('wallet.token_toast.token_hidden_desc', {
                  tokenSymbol: symbol,
                }),
              });
              trackEvent(
                createEventBuilder(MetaMetricsEvents.TOKENS_HIDDEN)
                  .addProperties({
                    location: 'token_details',
                    token_standard: 'ERC20',
                    asset_type: 'token',
                    tokens: [`${symbol} - ${address}`],
                    chain_id: getDecimalChainId(chainId),
                  })
                  .build(),
              );
            } catch (err) {
              Logger.log(err, 'AssetDetails: Failed to hide token!');
            }
          });
        },
      },
    });
  };

  const renderWarningBanner = () => (
    <WarningMessage
      style={styles.warningBanner}
      warningMessage={
        <>
          <RNText style={styles.warningBannerDesc}>
            {strings('asset_overview.were_unable')} {symbol}{' '}
            {strings('asset_overview.balance')}{' '}
            <RNText
              suppressHighlighting
              onPress={() => {
                navigation.navigate('Webview', {
                  screen: 'SimpleWebview',
                  params: {
                    url: AppConstants.URLS.TOKEN_BALANCE,
                    title: strings('asset_overview.troubleshoot'),
                  },
                });
              }}
              style={styles.warningBannerLink}
            >
              {strings('asset_overview.troubleshooting_missing')}{' '}
            </RNText>
            {strings('asset_overview.for_help')}
          </RNText>
        </>
      }
    />
  );

  const renderSectionTitle = (title: string, isFirst?: boolean) => (
    <RNText
      style={[styles.sectionTitleLabel, isFirst && styles.firstSectionTitle]}
    >
      {title}
    </RNText>
  );

  const renderSectionDescription = (description: string) => (
    <RNText style={[styles.descriptionLabel, styles.descriptionContainer]}>
      {description}
    </RNText>
  );

  const renderTokenSymbol = () => (
    <View style={styles.descriptionContainer}>
      <TokenImage
        asset={asset}
        containerStyle={styles.tokenImage}
        iconStyle={styles.tokenImage}
      />
      <RNText style={styles.descriptionLabel}>{symbol}</RNText>
    </View>
  );

  const renderTokenBalance = () => {
    let balanceDisplay = '';
    const tokenExchangeRates = tokenExchangeRatesByChainId;

    const multiChainTokenBalance =
      Object.keys(allTokenBalances).length > 0
        ? allTokenBalances[selectedAccountAddress as Hex]?.[chainId as Hex]?.[
            address as Hex
          ]
        : undefined;

    const tokenBalance = multiChainTokenBalance;

    const conversionRate = conversionRateBySymbol;

    const exchangeRate =
      tokenExchangeRates && address in tokenExchangeRates
        ? tokenExchangeRates[address]?.price
        : undefined;

    const balance = tokenBalance
      ? renderFromTokenMinimalUnit(tokenBalance.toString(), decimals)
      : undefined;

    const balanceFiat = balance
      ? balanceToFiat(balance, conversionRate, exchangeRate, currentCurrency)
      : undefined;

    if (balance === undefined && balanceFiat === undefined) {
      // Couldn't load balance
      return renderWarningBanner();
    }

    if (primaryCurrency === 'ETH') {
      balanceDisplay = balanceFiat
        ? `${balance} (${balanceFiat})`
        : `${balance}`;
    } else {
      balanceDisplay = balanceFiat
        ? `${balanceFiat} (${balance})`
        : `${balance}`;
    }

    return (
      <View style={styles.descriptionContainer}>
        <RNText style={styles.descriptionLabel}>{balanceDisplay}</RNText>
      </View>
    );
  };

  const renderHideButton = () => (
    <TouchableOpacity
      onPress={triggerHideToken}
      hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
      style={styles.hideButton}
    >
      <RNText style={styles.hideButtonLabel}>
        {strings('asset_details.hide_cta')}
      </RNText>
    </TouchableOpacity>
  );

  const renderTokenAddressLink = () => (
    <TouchableOpacity
      hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
      onPress={copyAddressToClipboard}
      style={styles.descriptionContainer}
    >
      <EthereumAddress
        style={styles.addressLinkLabel}
        address={address}
        type={'short'}
      />
      <Icon style={styles.copyIcon} name={'copy'} size={16} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrapper}>
      {/* Inline header for instant rendering */}
      <View
        style={[
          inlineHeaderStyles.container,
          { marginTop: insets.top, backgroundColor: colors.background.default },
        ]}
      >
        <ButtonIcon
          style={inlineHeaderStyles.leftButton}
          onPress={() => navigation.goBack()}
          size={ButtonIconSize.Lg}
          iconName={IconName.ArrowLeft}
        />
        <View style={inlineHeaderStyles.titleWrapper}>
          <Text variant={TextVariant.HeadingSM} numberOfLines={1}>
            {strings('asset_details.options.token_details')}
          </Text>
          {networkName ? (
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Alternative}
              numberOfLines={1}
            >
              {networkName}
            </Text>
          ) : null}
        </View>
        <View style={inlineHeaderStyles.rightPlaceholder} />
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        {renderSectionTitle(strings('asset_details.token'), true)}
        {renderTokenSymbol()}
        {renderSectionTitle(strings('asset_details.amount'))}
        {renderTokenBalance()}
        {/* Perps Discovery Banner - show when perps market exists and token is trustworthy */}
        {isPerpsEnabled &&
          hasPerpsMarket &&
          marketData &&
          isTokenTrustworthy && (
            <>
              {renderSectionTitle(strings('asset_details.perps_trading'))}
              <PerpsDiscoveryBanner
                symbol={marketData.symbol}
                maxLeverage={marketData.maxLeverage}
                onPress={handlePerpsDiscoveryPress}
                testID="perps-discovery-banner"
              />
            </>
          )}
        {renderSectionTitle(strings('asset_details.address'))}
        {renderTokenAddressLink()}
        {renderSectionTitle(strings('asset_details.decimal'))}
        {renderSectionDescription(String(decimals))}
        {renderSectionTitle(strings('asset_details.network'))}
        {renderSectionDescription(networkName)}
        {aggregators.length > 0 && (
          <>
            {renderSectionTitle(strings('asset_details.lists'))}
            {renderSectionDescription(aggregators.join(', '))}
          </>
        )}
        {renderHideButton()}
      </ScrollView>
    </View>
  );
};

const AssetDetailsContainer = (props: Props) => {
  const { address, chainId: networkId, asset } = props.route.params;

  const allTokens = useSelector(selectAllTokens);
  const selectedAccountAddressEvm = useSelector(selectLastSelectedEvmAccount);

  const selectedAccountAddress = selectedAccountAddressEvm?.address;

  const tokensByChain = useMemo(
    () => allTokens?.[networkId as Hex]?.[selectedAccountAddress as Hex] ?? [],
    [allTokens, networkId, selectedAccountAddress],
  );

  const portfolioToken = useMemo(
    () =>
      tokensByChain.find((rawToken) =>
        areAddressesEqual(rawToken.address, address),
      ),
    [tokensByChain, address],
  );

  // If token not found in portfolio, create a token object from the asset prop
  // This handles cases where the token is viewed from trending/search but not in user's list
  const token: TokenType | undefined = useMemo(() => {
    if (portfolioToken) {
      return portfolioToken;
    }

    // Create a token object from the asset prop when token isn't in portfolio
    if (asset) {
      return {
        address: asset.address,
        symbol: asset.symbol,
        decimals: asset.decimals,
        aggregators: asset.aggregators || [],
        name: asset.name,
        image: asset.image,
        // Add other required fields with defaults
        isERC721: false,
      } as TokenType;
    }

    return undefined;
  }, [portfolioToken, asset]);

  if (!token) {
    return null;
  }

  return <AssetDetails {...props} token={token} />;
};

export default AssetDetailsContainer;
