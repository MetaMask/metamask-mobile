import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  InteractionManager,
  Platform,
} from 'react-native';
import { connect } from 'react-redux';
import ActionSheet from 'react-native-actionsheet';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  renderFromTokenMinimalUnit,
  balanceToFiat,
  addCurrencySymbol,
} from '../../../util/number';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import AssetElement from '../AssetElement';
import { safeToChecksumAddress } from '../../../util/address';
import { trackEvent, trackLegacyEvent } from '../../../util/analyticsV2';
import NetworkMainAssetLogo from '../NetworkMainAssetLogo';
import { getTokenList } from '../../../reducers/tokens';
import { isZero } from '../../../util/lodash';
import { ThemeContext, mockTheme } from '../../../util/theme';

import NotificationManager from '../../../core/NotificationManager';
import { getDecimalChainId, isMainnetByChainId } from '../../../util/networks';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  IMPORT_TOKEN_BUTTON_ID,
  MAIN_WALLET_VIEW_VIA_TOKENS_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import {
  selectChainId,
  selectProviderType,
  selectTicker,
} from '../../../selectors/networkController';
import { createDetectedTokensNavDetails } from '../../Views/DetectedTokens';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import { BadgeVariants } from '../../../component-library/components/Badges/Badge/Badge.types';
import images from 'images/image-icons';
import {
  AvatarSize,
  AvatarVariants,
} from '../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      minHeight: 500,
    },
    emptyView: {
      backgroundColor: colors.background.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 50,
    },
    text: {
      fontSize: 20,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    add: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addText: {
      fontSize: 14,
      color: colors.primary.default,
      ...fontStyles.normal,
    },
    tokensDetectedButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
    },
    tokensDetectedText: {
      fontSize: 14,
      color: colors.primary.default,
      ...fontStyles.normal,
    },
    footer: {
      flex: 1,
      paddingBottom: 30,
      alignItems: 'center',
      marginTop: 24,
    },
    balances: {
      flex: 1,
      justifyContent: 'center',
      marginLeft: 20,
    },
    balanceFiat: {
      color: colors.text.alternative,
      ...fontStyles.normal,
      textTransform: 'uppercase',
    },
    balanceFiatTokenError: {
      textTransform: 'capitalize',
    },
    ethLogo: {
      width: 24,
      height: 24,
      borderRadius: 12,
      overflow: 'hidden',
    },
    emptyText: {
      color: colors.text.alternative,
      marginBottom: 8,
      fontSize: 14,
    },
  });

/**
 * View that renders a list of ERC-20 Tokens
 */
class Tokens extends PureComponent {
  static propTypes = {
    /**
     * Navigation object required to push
     * the Asset detail view
     */
    navigation: PropTypes.object,
    /**
     * Array of assets (in this case ERC20 tokens)
     */
    tokens: PropTypes.array,
    /**
     * Network provider chain id
     */
    chainId: PropTypes.string,
    /**
     * ETH to current currency conversion rate
     */
    conversionRate: PropTypes.number,
    /**
     * Currency code of the currently-active currency
     */
    currentCurrency: PropTypes.string,
    /**
     * Object containing token balances in the format address => balance
     */
    tokenBalances: PropTypes.object,
    /**
     * Object containing token exchange rates in the format address => exchangeRate
     */
    tokenExchangeRates: PropTypes.object,
    /**
     * Array of transactions
     */
    transactions: PropTypes.array,
    /**
     * Primary currency, either ETH or Fiat
     */
    primaryCurrency: PropTypes.string,
    /**
     * A bool that represents if the user wants to hide zero balance token
     */
    hideZeroBalanceTokens: PropTypes.bool,
    /**
     * List of tokens from TokenListController
     */
    tokenList: PropTypes.object,
    /**
     * List of detected tokens from TokensController
     */
    detectedTokens: PropTypes.array,
    /**
     * Boolean that indicates if token detection is enabled
     */
    isTokenDetectionEnabled: PropTypes.bool,
    /**
     * Current provider ticker
     */
    ticker: PropTypes.string,
    /**
     * Current provider type
     */
    providerType: PropTypes.string,
  };

  actionSheet = null;

  tokenToRemove = null;

  state = {
    isAddTokenEnabled: true,
  };

  getStyles = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    return styles;
  };

  renderEmpty = () => {
    const styles = this.getStyles();

    return (
      <View style={styles.emptyView}>
        <Text style={styles.text}>{strings('wallet.no_tokens')}</Text>
      </View>
    );
  };

  onItemPress = (token) => {
    this.props.navigation.navigate('Asset', {
      ...token,
      transactions: this.props.transactions,
    });
  };

  renderFooter = () => {
    const styles = this.getStyles();

    return (
      <View style={styles.footer} key={'tokens-footer'}>
        <Text style={styles.emptyText}>
          {strings('wallet.no_available_tokens')}
        </Text>
        <TouchableOpacity
          style={styles.add}
          onPress={this.goToAddToken}
          disabled={!this.state.isAddTokenEnabled}
          {...generateTestId(Platform, IMPORT_TOKEN_BUTTON_ID)}
        >
          <Text style={styles.addText}>{strings('wallet.add_tokens')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  handleBalance = ({
    asset,
    tokenExchangeRates,
    conversionRate,
    currentCurrency,
    tokenBalances,
  }) => {
    const itemAddress = safeToChecksumAddress(asset.address);

    const exchangeRate =
      itemAddress in tokenExchangeRates
        ? tokenExchangeRates[itemAddress]
        : undefined;
    const balance =
      asset.balance ||
      (itemAddress in tokenBalances
        ? renderFromTokenMinimalUnit(tokenBalances[itemAddress], asset.decimals)
        : 0);

    const balanceValueFormatted = !balance ? ' ' : `${balance} ${asset.symbol}`;

    const balanceFiatCalculation =
      asset.balanceFiat ||
      balanceToFiat(balance, conversionRate, exchangeRate, currentCurrency);

    const zeroBalance = addCurrencySymbol('0', currentCurrency);

    const balanceFiat = !balanceFiatCalculation?.includes(zeroBalance)
      ? balanceFiatCalculation
      : ' ';

    return { balanceFiat, balanceValueFormatted, balance };
  };

  renderItem = (asset) => {
    const {
      conversionRate,
      currentCurrency,
      tokenBalances,
      tokenExchangeRates,
      primaryCurrency,
      tokenList,
      chainId,
      ticker,
      providerType,
    } = this.props;
    const styles = this.getStyles();
    const itemAddress = safeToChecksumAddress(asset.address);
    const logo = tokenList?.[itemAddress?.toLowerCase?.()]?.iconUrl;

    const { balanceFiat, balanceValueFormatted, balance } = this.handleBalance({
      asset,
      tokenExchangeRates,
      conversionRate,
      currentCurrency,
      tokenBalances,
    });

    // render balances according to primary currency
    let mainBalance, secondaryBalance;
    if (primaryCurrency === 'ETH') {
      mainBalance = balanceValueFormatted;
      secondaryBalance = balanceFiat;
    } else {
      mainBalance = !balanceFiat ? balanceValueFormatted : balanceFiat;
      secondaryBalance = !balanceFiat ? balanceFiat : balanceValueFormatted;
    }

    if (asset?.balanceError) {
      mainBalance = asset.symbol;
      secondaryBalance = strings('wallet.unable_to_load');
    }

    asset = { logo, ...asset, balance, balanceFiat };

    const NetworkBadgeSource =
      images[isMainnetByChainId(chainId) ? 'ETHEREUM' : ticker];

    return (
      <AssetElement
        key={itemAddress || '0x'}
        testID={'asset'}
        onPress={this.onItemPress}
        onLongPress={asset.isETH ? null : this.showRemoveMenu}
        asset={asset}
        balance={secondaryBalance}
      >
        <BadgeWrapper
          badgeProps={{
            variant: BadgeVariants.Network,
            name: isMainnetByChainId(chainId) ? providerType : ticker,
            imageSource: NetworkBadgeSource,
          }}
        >
          {asset.isETH ? (
            <NetworkMainAssetLogo style={styles.ethLogo} testID={'eth-logo'} />
          ) : (
            <AvatarToken
              variant={AvatarVariants.Token}
              name={asset.symbol}
              imageSource={{ uri: asset.logo }}
              size={AvatarSize.Sm}
            />
          )}
        </BadgeWrapper>

        <View style={styles.balances} testID={'balance'}>
          <Text variant={TextVariant.BodyLGMedium}>{asset.name}</Text>

          <Text variant={TextVariant.BodyMD} style={styles.balanceFiat}>
            {mainBalance}
          </Text>
        </View>
      </AssetElement>
    );
  };

  goToBuy = () => {
    this.props.navigation.navigate('FiatOnRampAggregator');
    InteractionManager.runAfterInteractions(() => {
      trackLegacyEvent(MetaMetricsEvents.BUY_BUTTON_CLICKED, {
        text: 'Buy Native Token',
        location: 'Home Screen',
        chain_id_destination: this.props.chainId,
      });
    });
  };

  showDetectedTokens = () => {
    const { NetworkController } = Engine.context;
    const { detectedTokens } = this.props;
    this.props.navigation.navigate(...createDetectedTokensNavDetails());
    InteractionManager.runAfterInteractions(() => {
      trackEvent(MetaMetricsEvents.TOKEN_IMPORT_CLICKED, {
        source: 'detected',
        chain_id: getDecimalChainId(
          NetworkController?.state?.providerConfig?.chainId,
        ),
        tokens: detectedTokens.map(
          (token) => `${token.symbol} - ${token.address}`,
        ),
      });
      this.setState({ isAddTokenEnabled: true });
    });
  };

  renderTokensDetectedSection = () => {
    const { isTokenDetectionEnabled, detectedTokens } = this.props;
    const styles = this.getStyles();

    if (!isTokenDetectionEnabled || !detectedTokens?.length) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.tokensDetectedButton}
        onPress={this.showDetectedTokens}
      >
        <Text style={styles.tokensDetectedText}>
          {strings('wallet.tokens_detected_in_account', {
            tokenCount: detectedTokens.length,
            tokensLabel: detectedTokens.length > 1 ? 'tokens' : 'token',
          })}
        </Text>
      </TouchableOpacity>
    );
  };

  renderList() {
    const { tokens, hideZeroBalanceTokens, tokenBalances } = this.props;
    const tokensToDisplay = hideZeroBalanceTokens
      ? tokens.filter((token) => {
          const { address, isETH } = token;
          return !isZero(tokenBalances[address]) || isETH;
          // eslint-disable-next-line no-mixed-spaces-and-tabs
        })
      : tokens;

    return (
      <View>
        {tokensToDisplay.map((item) => this.renderItem(item))}
        {this.renderTokensDetectedSection()}
        {this.renderFooter()}
      </View>
    );
  }

  goToAddToken = () => {
    const { NetworkController } = Engine.context;
    this.setState({ isAddTokenEnabled: false });
    this.props.navigation.push('AddAsset', { assetType: 'token' });
    InteractionManager.runAfterInteractions(() => {
      trackEvent(MetaMetricsEvents.TOKEN_IMPORT_CLICKED, {
        source: 'manual',
        chain_id: getDecimalChainId(
          NetworkController?.state?.providerConfig?.chainId,
        ),
      });
      this.setState({ isAddTokenEnabled: true });
    });
  };

  showRemoveMenu = (token) => {
    this.tokenToRemove = token;
    this.actionSheet.show();
  };

  removeToken = async () => {
    const { TokensController, NetworkController } = Engine.context;
    const tokenAddress = this.tokenToRemove?.address;
    const symbol = this.tokenToRemove?.symbol;
    try {
      await TokensController.ignoreTokens([tokenAddress]);
      NotificationManager.showSimpleNotification({
        status: `simple_notification`,
        duration: 5000,
        title: strings('wallet.token_toast.token_hidden_title'),
        description: strings('wallet.token_toast.token_hidden_desc', {
          tokenSymbol: symbol,
        }),
      });
      InteractionManager.runAfterInteractions(() =>
        trackEvent(MetaMetricsEvents.TOKENS_HIDDEN, {
          location: 'assets_list',
          token_standard: 'ERC20',
          asset_type: 'token',
          tokens: [`${symbol} - ${tokenAddress}`],
          chain_id: getDecimalChainId(
            NetworkController?.state?.providerConfig?.chainId,
          ),
        }),
      );
    } catch (err) {
      Logger.log(err, 'Wallet: Failed to hide token!');
    }
  };

  createActionSheetRef = (ref) => {
    this.actionSheet = ref;
  };

  onActionSheetPress = (index) => (index === 0 ? this.removeToken() : null);

  render = () => {
    const { tokens } = this.props;
    const styles = this.getStyles();
    const themeAppearance = this.context.themeAppearance;

    return (
      <View
        style={styles.wrapper}
        {...generateTestId(Platform, MAIN_WALLET_VIEW_VIA_TOKENS_ID)}
      >
        {tokens && tokens.length ? this.renderList() : this.renderEmpty()}
        <ActionSheet
          ref={this.createActionSheetRef}
          title={strings('wallet.remove_token_title')}
          options={[strings('wallet.remove'), strings('wallet.cancel')]}
          cancelButtonIndex={1}
          destructiveButtonIndex={0}
          onPress={this.onActionSheetPress}
          theme={themeAppearance}
        />
      </View>
    );
  };
}

const mapStateToProps = (state) => ({
  providerType: selectProviderType(state),
  chainId: selectChainId(state),
  ticker: selectTicker(state),
  currentCurrency:
    state.engine.backgroundState.CurrencyRateController.currentCurrency,
  conversionRate:
    state.engine.backgroundState.CurrencyRateController.conversionRate,
  primaryCurrency: state.settings.primaryCurrency,
  tokenBalances:
    state.engine.backgroundState.TokenBalancesController.contractBalances,
  tokenExchangeRates:
    state.engine.backgroundState.TokenRatesController.contractExchangeRates,
  hideZeroBalanceTokens: state.settings.hideZeroBalanceTokens,
  tokenList: getTokenList(state),
  detectedTokens: state.engine.backgroundState.TokensController.detectedTokens,
  isTokenDetectionEnabled:
    state.engine.backgroundState.PreferencesController.useTokenDetection,
});

Tokens.contextType = ThemeContext;

export default connect(mapStateToProps)(Tokens);
