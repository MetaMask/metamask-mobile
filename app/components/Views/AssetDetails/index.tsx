import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  InteractionManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getNetworkNavbarOptions } from '../../UI/Navbar';
import { fontStyles } from '../../../styles/common';
import ClipboardManager from '../../../core/ClipboardManager';
import { showAlert } from '../../../actions/alert';
import { strings } from '../../../../locales/i18n';
import { useDispatch, useSelector } from 'react-redux';
import EthereumAddress from '../../UI/EthereumAddress';
import Icon from 'react-native-vector-icons/Feather';
import TokenImage from '../../UI/TokenImage';
import Networks, {
  getDecimalChainId,
  isPortfolioViewEnabled,
} from '../../../util/networks';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import NotificationManager from '../../../core/NotificationManager';
import AppConstants from '../../../core/AppConstants';
import { Token as TokenType } from '@metamask/assets-controllers';
import {
  balanceToFiat,
  renderFromTokenMinimalUnit,
} from '../../../util/number';
import WarningMessage from '../confirmations/legacy/SendFlow/WarningMessage';
import { useTheme } from '../../../util/theme';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Routes from '../../../constants/navigation/Routes';
import {
  selectProviderConfig,
  selectNetworkConfigurationByChainId,
  selectIsAllNetworks,
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../selectors/networkController';
import {
  selectConversionRate,
  selectCurrentCurrency,
  selectConversionRateBySymbol,
} from '../../../selectors/currencyRateController';
import {
  selectAllTokens,
  selectTokens,
} from '../../../selectors/tokensController';
import {
  selectContractExchangeRates,
  selectTokenMarketDataByChainId,
} from '../../../selectors/tokenRatesController';
import {
  selectContractBalances,
  selectTokensBalances,
} from '../../../selectors/tokenBalancesController';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { RootState } from 'app/reducers';
import { Colors } from '../../../util/theme/models';
import { Hex } from '@metamask/utils';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../util/navigation/types';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
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

type AssetDetailsProps = StackScreenProps<RootParamList, 'AssetDetails'>;

const AssetDetails = ({ route }: AssetDetailsProps) => {
  const { address, chainId: networkId, asset } = route.params;
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const providerConfig = useSelector(selectProviderConfig);
  const allTokens = useSelector(selectAllTokens);
  const selectedAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );
  const selectedChainId = useSelector(selectEvmChainId);
  const chainId = isPortfolioViewEnabled() ? networkId : selectedChainId;
  const tokens = useSelector(selectTokens);

  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const isAllNetworks = useSelector(selectIsAllNetworks);

  const tokenNetworkConfig = networkConfigurations[networkId]?.name;

  const tokensByChain = useMemo(
    () => allTokens?.[chainId as Hex]?.[selectedAccountAddress as Hex] ?? [],
    [allTokens, chainId, selectedAccountAddress],
  );

  const conversionRateLegacy = useSelector(selectConversionRate);
  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, chainId),
  );
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
  const tokenExchangeRatesLegacy = useSelector(selectContractExchangeRates);
  const tokenExchangeRatesByChainId = useSelector((state: RootState) =>
    selectTokenMarketDataByChainId(state, chainId),
  );
  const tokenBalancesLegacy = useSelector(selectContractBalances);
  const allTokenBalances = useSelector(selectTokensBalances);

  const portfolioToken = useMemo(
    () => tokensByChain.find((rawToken) => rawToken.address === address),
    [tokensByChain, address],
  );

  const legacyToken = useMemo(
    () => tokens.find((rawToken) => rawToken.address === address),
    [tokens, address],
  );

  const token: TokenType | undefined = isPortfolioViewEnabled()
    ? portfolioToken
    : legacyToken;

  const { symbol, decimals, aggregators = [] } = token as TokenType;

  const getNetworkName = useCallback(() => {
    let name = '';
    if (isPortfolioViewEnabled() && isAllNetworks) {
      name = tokenNetworkConfig;
    } else if (providerConfig.nickname) {
      name = providerConfig.nickname;
    } else {
      name =
        (Networks as Record<string, { name: string }>)[providerConfig.type]
          ?.name || { ...Networks.rpc, color: null }.name;
    }
    return name;
  }, [isAllNetworks, tokenNetworkConfig, providerConfig]);

  useEffect(() => {
    const networkName = getNetworkName();
    navigation.setOptions(
      getNetworkNavbarOptions(
        'Token Details',
        false,
        navigation,
        colors,
        undefined,
        true,
        undefined,
        networkName,
      ),
    );
  }, [navigation, colors, getNetworkName]);

  const copyAddressToClipboard = async () => {
    await ClipboardManager.setString(address);
    dispatch(
      showAlert({
        isVisible: true,
        autodismiss: 1500,
        content: 'clipboard-alert',
        data: { msg: strings('detected_tokens.address_copied_to_clipboard') },
      }),
    );
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
          <Text style={styles.warningBannerDesc}>
            {strings('asset_overview.were_unable')} {symbol}{' '}
            {strings('asset_overview.balance')}{' '}
            <Text
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
            </Text>
            {strings('asset_overview.for_help')}
          </Text>
        </>
      }
    />
  );

  const renderSectionTitle = (title: string, isFirst?: boolean) => (
    <Text
      style={[styles.sectionTitleLabel, isFirst && styles.firstSectionTitle]}
    >
      {title}
    </Text>
  );

  const renderSectionDescription = (description: string) => (
    <Text style={[styles.descriptionLabel, styles.descriptionContainer]}>
      {description}
    </Text>
  );

  const renderTokenSymbol = () => (
    <View style={styles.descriptionContainer}>
      <TokenImage
        asset={asset}
        containerStyle={styles.tokenImage}
        iconStyle={styles.tokenImage}
      />
      <Text style={styles.descriptionLabel}>{symbol}</Text>
    </View>
  );

  const renderTokenBalance = () => {
    let balanceDisplay = '';
    const tokenExchangeRates = isPortfolioViewEnabled()
      ? tokenExchangeRatesByChainId
      : tokenExchangeRatesLegacy;
    const tokenBalances = isPortfolioViewEnabled()
      ? allTokenBalances
      : tokenBalancesLegacy;

    const multiChainTokenBalance =
      Object.keys(allTokenBalances).length > 0
        ? allTokenBalances[selectedAccountAddress as Hex]?.[chainId as Hex]?.[
            address as Hex
          ]
        : undefined;

    const tokenBalance = isPortfolioViewEnabled()
      ? multiChainTokenBalance
      : tokenBalancesLegacy[address];

    const conversionRate = isPortfolioViewEnabled()
      ? conversionRateBySymbol
      : conversionRateLegacy;

    const exchangeRate =
      tokenExchangeRates && address in tokenExchangeRates
        ? tokenExchangeRates[address]?.price
        : undefined;

    const balance = tokenBalance
      ? address in tokenBalances || isPortfolioViewEnabled() || !tokenBalance
        ? renderFromTokenMinimalUnit(tokenBalance.toString(), decimals)
        : undefined
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
        <Text style={styles.descriptionLabel}>{balanceDisplay}</Text>
      </View>
    );
  };

  const renderHideButton = () => (
    <TouchableOpacity
      onPress={triggerHideToken}
      hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
      style={styles.hideButton}
    >
      <Text style={styles.hideButtonLabel}>
        {strings('asset_details.hide_cta')}
      </Text>
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
    <ScrollView contentContainerStyle={styles.container}>
      {renderSectionTitle(strings('asset_details.token'), true)}
      {renderTokenSymbol()}
      {renderSectionTitle(strings('asset_details.amount'))}
      {renderTokenBalance()}
      {renderSectionTitle(strings('asset_details.address'))}
      {renderTokenAddressLink()}
      {renderSectionTitle(strings('asset_details.decimal'))}
      {renderSectionDescription(String(decimals))}
      {renderSectionTitle(strings('asset_details.network'))}
      {renderSectionDescription(getNetworkName())}
      {renderSectionTitle(strings('asset_details.lists'))}
      {renderSectionDescription(aggregators.join(', '))}
      {renderHideButton()}
    </ScrollView>
  );
};

export default AssetDetails;
