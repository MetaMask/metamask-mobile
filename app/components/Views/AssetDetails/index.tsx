import React, { useEffect, useMemo } from 'react';
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
import Networks, { getDecimalChainId } from '../../../util/networks';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import NotificationManager from '../../../core/NotificationManager';
import AppConstants from '../../../core/AppConstants';
import { Token as TokenType } from '@metamask/assets-controllers';
import {
  balanceToFiat,
  renderFromTokenMinimalUnit,
} from '../../../util/number';
import WarningMessage from '../SendFlow/WarningMessage';
import { useTheme } from '../../../util/theme';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import Routes from '../../../constants/navigation/Routes';

const createStyles = (colors: any) =>
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
      ...(fontStyles.bold as any),
      fontSize: 16,
      color: colors.text.default,
      marginTop: 32,
    },
    firstSectionTitle: {
      marginTop: 8,
    },
    descriptionLabel: {
      ...(fontStyles.normal as any),
      fontSize: 16,
      color: colors.text.default,
    },
    hideButton: {
      marginTop: 48,
    },
    hideButtonLabel: {
      ...(fontStyles.normal as any),
      fontSize: 16,
      color: colors.error.default,
    },
    addressLinkLabel: {
      ...(fontStyles.normal as any),
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
      address: string;
    };
  };
}

const AssetDetails = (props: Props) => {
  const { address } = props.route.params;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const network = useSelector(
    (state: any) => state.engine.backgroundState.NetworkController,
  );
  const tokens = useSelector(
    (state: any) =>
      state.engine.backgroundState.TokensController.tokens as TokenType[],
  );
  const conversionRate = useSelector(
    (state: any) =>
      state.engine.backgroundState.CurrencyRateController.conversionRate,
  );
  const currentCurrency = useSelector(
    (state: any) =>
      state.engine.backgroundState.CurrencyRateController.currentCurrency,
  );
  const primaryCurrency = useSelector(
    (state: any) => state.settings.primaryCurrency,
  );
  const tokenBalances = useSelector(
    (state: any) =>
      state.engine.backgroundState.TokenBalancesController.contractBalances,
  );
  const tokenExchangeRates = useSelector(
    (state: any) =>
      state.engine.backgroundState.TokenRatesController.contractExchangeRates,
  );
  const token = useMemo(
    () => tokens.find((rawToken) => rawToken.address === address),
    [tokens, address],
  );
  const { symbol, decimals, aggregators = [] } = token as TokenType;

  const getNetworkName = () => {
    let name = '';
    if (network.provider.nickname) {
      name = network.provider.nickname;
    } else {
      name =
        (Networks as any)[network.provider.type]?.name ||
        { ...Networks.rpc, color: null }.name;
    }
    return name;
  };

  useEffect(() => {
    navigation.setOptions(
      getNetworkNavbarOptions(
        'Token Details',
        false,
        navigation,
        colors,
        undefined,
        true,
      ),
    );
  }, [navigation, colors]);

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
    const { TokensController, NetworkController } = Engine.context as any;
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: 'AssetHideConfirmation',
      params: {
        onConfirm: () => {
          navigation.navigate('WalletView');
          InteractionManager.runAfterInteractions(async () => {
            try {
              await TokensController.ignoreTokens([address]);
              NotificationManager.showSimpleNotification({
                status: `simple_notification`,
                duration: 5000,
                title: strings('wallet.token_toast.token_hidden_title'),
                description: strings('wallet.token_toast.token_hidden_desc', {
                  tokenSymbol: symbol,
                }),
              });
              AnalyticsV2.trackEvent(MetaMetricsEvents.TOKENS_HIDDEN, {
                location: 'token_details',
                token_standard: 'ERC20',
                asset_type: 'token',
                tokens: [`${symbol} - ${address}`],
                chain_id: getDecimalChainId(
                  NetworkController?.state?.provider?.chainId,
                ),
              });
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
        asset={{ address }}
        containerStyle={styles.tokenImage}
        iconStyle={styles.tokenImage}
      />
      <Text style={styles.descriptionLabel}>{symbol}</Text>
    </View>
  );

  const renderTokenBalance = () => {
    let balanceDisplay = '';
    const exchangeRate =
      address in tokenExchangeRates ? tokenExchangeRates[address] : undefined;
    const balance =
      address in tokenBalances
        ? renderFromTokenMinimalUnit(tokenBalances[address], decimals)
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
