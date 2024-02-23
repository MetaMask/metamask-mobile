import React, { PureComponent } from 'react';
import { View, StyleSheet, Text, InteractionManager } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { fontStyles } from '../../../styles/common';
import StyledButton from '../StyledButton';
import { strings } from '../../../../locales/i18n';
import Modal from 'react-native-modal';
import {
  toggleInfoNetworkModal,
  toggleReceiveModal,
} from '../../../actions/modals';
import Engine from '../../../core/Engine';
import Device from '../../../util/device';
import ReceiveRequest from '../ReceiveRequest';
import AppConstants from '../../../core/AppConstants';
import { MetaMetricsEvents } from '../../../core/Analytics';
import DeeplinkManager from '../../../core/DeeplinkManager/SharedDeeplinkManager';
import { findRouteNameFromNavigatorState } from '../../../util/general';
import { collectiblesSelector } from '../../../reducers/collectibles';
import { isZero } from '../../../util/lodash';
import { ThemeContext, mockTheme } from '../../../util/theme';
import {
  onboardNetworkAction,
  networkSwitched,
} from '../../../actions/onboardNetwork';
import Routes from '../../../constants/navigation/Routes';
import { scale } from 'react-native-size-matters';
import {
  selectNetworkConfigurations,
  selectProviderConfig,
  selectTicker,
} from '../../../selectors/networkController';
import { selectTokens } from '../../../selectors/tokensController';
import { selectContractBalances } from '../../../selectors/tokenBalancesController';
import NetworkInfo from '../NetworkInfo';
import { withMetricsAwareness } from '../../../components/hooks/useMetrics';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      width: 315,
      backgroundColor: colors.background.default,
    },
    header: {
      paddingTop: Device.isIphoneX() ? 60 : 24,
      backgroundColor: colors.background.alternative,
      height: Device.isIphoneX() ? 110 : 74,
      flexDirection: 'column',
      paddingBottom: 0,
    },
    metamaskLogo: {
      flexDirection: 'row',
      flex: 1,
      marginTop: Device.isAndroid() ? 0 : 12,
      marginLeft: 15,
      paddingTop: Device.isAndroid() ? 10 : 0,
    },
    metamaskFox: {
      height: 27,
      width: 27,
      marginRight: 15,
    },
    metamaskName: {
      marginTop: 4,
      width: 90,
      height: 18,
      tintColor: colors.text.default,
    },
    account: {
      flex: 1,
      backgroundColor: colors.background.alternative,
    },
    accountBgOverlay: {
      borderBottomColor: colors.border.muted,
      borderBottomWidth: 1,
      padding: 17,
    },
    identiconWrapper: {
      marginBottom: 12,
      width: 56,
      height: 56,
    },
    identiconBorder: {
      borderRadius: 96,
      borderWidth: 2,
      padding: 2,
      borderColor: colors.primary.default,
    },
    accountNameWrapper: {
      flexDirection: 'row',
      paddingRight: 17,
    },
    accountName: {
      fontSize: 20,
      lineHeight: 24,
      marginBottom: 5,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    caretDown: {
      textAlign: 'right',
      marginLeft: 7,
      marginTop: 3,
      fontSize: 18,
      color: colors.icon.alternative,
    },
    accountBalance: {
      fontSize: 14,
      lineHeight: 17,
      marginBottom: 5,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    accountAddress: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.text.alternative,
      ...fontStyles.normal,
    },
    buttons: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomColor: colors.border.muted,
      borderBottomWidth: 1,
      padding: 15,
    },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 30,
      borderWidth: 1.5,
    },
    leftButton: {
      marginRight: 5,
    },
    rightButton: {
      marginLeft: 5,
    },
    buttonText: {
      paddingLeft: scale(4),
      fontSize: scale(13),
      color: colors.primary.default,
      ...fontStyles.normal,
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: scale(2),
    },
    buttonIcon: {
      marginTop: 0,
    },
    buttonReceive: {
      transform: [{ rotate: '90deg' }],
    },
    menu: {},
    noTopBorder: {
      borderTopWidth: 0,
    },
    menuSection: {
      borderTopWidth: 1,
      borderColor: colors.border.muted,
      paddingVertical: 10,
    },
    menuItem: {
      flex: 1,
      flexDirection: 'row',
      paddingVertical: 9,
      paddingLeft: 17,
    },
    selectedRoute: {
      backgroundColor: colors.primary.muted,
      marginRight: 10,
      borderTopRightRadius: 20,
      borderBottomRightRadius: 20,
    },
    selectedName: {
      color: colors.primary.default,
    },
    menuItemName: {
      flex: 1,
      paddingHorizontal: 15,
      paddingTop: 2,
      fontSize: 16,
      color: colors.text.alternative,
      ...fontStyles.normal,
    },
    menuItemWarningText: {
      color: colors.text.default,
      fontSize: 12,
      ...fontStyles.normal,
    },
    noIcon: {
      paddingLeft: 0,
    },
    menuItemIconImage: {
      width: 22,
      height: 22,
      tintColor: colors.icon.alternative,
    },
    selectedMenuItemIconImage: {
      width: 22,
      height: 22,
      tintColor: colors.primary.default,
    },
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    importedWrapper: {
      marginTop: 10,
      width: 73,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.icon.alternative,
    },
    importedText: {
      color: colors.icon.alternative,
      fontSize: 10,
      ...fontStyles.bold,
    },
    protectWalletContainer: {
      backgroundColor: colors.background.default,
      paddingTop: 24,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingVertical: 16,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      paddingHorizontal: 40,
    },
    protectWalletIconContainer: {
      alignSelf: 'center',
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.error.muted,
      borderColor: colors.error.default,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    protectWalletIcon: { alignSelf: 'center', color: colors.error.default },
    protectWalletTitle: {
      textAlign: 'center',
      fontSize: 18,
      marginVertical: 8,
      ...fontStyles.bold,
      color: colors.text.default,
    },
    protectWalletContent: {
      textAlign: 'center',
      fontSize: 14,
      marginVertical: 8,
      justifyContent: 'center',
      ...fontStyles.normal,
      color: colors.text.default,
    },
    protectWalletButtonWrapper: { marginVertical: 8 },
  });

const metamask_name = require('../../../images/metamask-name.png'); // eslint-disable-line
const metamask_fox = require('../../../images/fox.png'); // eslint-disable-line

/**
 * View component that displays the MetaMask fox
 * in the middle of the screen
 */
class DrawerView extends PureComponent {
  static propTypes = {
    /**
    /* navigation object required to push new views
    */
    navigation: PropTypes.object,
    /**
     * Object representing the configuration of the current selected network
     */
    providerConfig: PropTypes.object.isRequired,
    /**
     * Action that toggles the receive modal
     */
    toggleReceiveModal: PropTypes.func,
    /**
     * Boolean that determines the status of the receive modal
     */
    receiveModalVisible: PropTypes.bool.isRequired,
    /**
     * Boolean that determines if the user has set a password before
     */
    passwordSet: PropTypes.bool,
    /**
     * Current provider ticker
     */
    ticker: PropTypes.string,
    /**
     * Array of ERC20 assets
     */
    tokens: PropTypes.array,
    /**
     * Array of ERC721 assets
     */
    collectibles: PropTypes.array,
    /**
     * redux flag that indicates if the user
     * completed the seed phrase backup flow
     */
    seedphraseBackedUp: PropTypes.bool,
    /**
     * An object containing token balances for current account and network in the format address => balance
     */
    tokenBalances: PropTypes.object,
    /**
     * handles action for onboarding to a network
     */
    onboardNetworkAction: PropTypes.func,
    /**
     * updates when network is switched
     */
    networkSwitched: PropTypes.func,
    /**
     *  Boolean that determines the state of network info modal
     */
    infoNetworkModalVisible: PropTypes.bool,
    /**
     * Redux action to close info network modal
     */
    toggleInfoNetworkModal: PropTypes.func,
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
  };

  state = {
    showProtectWalletModal: undefined,
    networkUrl: undefined,
  };

  currentBalance = null;
  previousBalance = null;

  async componentDidUpdate() {
    const route = findRouteNameFromNavigatorState(
      this.props.navigation.dangerouslyGetState().routes,
    );
    if (!this.props.passwordSet || !this.props.seedphraseBackedUp) {
      if (
        [
          'SetPasswordFlow',
          'ChoosePassword',
          'AccountBackupStep1',
          'AccountBackupStep1B',
          'ManualBackupStep1',
          'ManualBackupStep2',
          'ManualBackupStep3',
          'Webview',
          Routes.LOCK_SCREEN,
        ].includes(route)
      ) {
        this.state.showProtectWalletModal &&
          // eslint-disable-next-line react/no-did-update-set-state
          this.setState({ showProtectWalletModal: false });
        return;
      }
      let tokenFound = false;

      this.props.tokens.forEach((token) => {
        if (
          this.props.tokenBalances[token.address] &&
          !isZero(this.props.tokenBalances[token.address])
        ) {
          tokenFound = true;
        }
      });
      if (
        !this.props.passwordSet ||
        this.currentBalance > 0 ||
        tokenFound ||
        this.props.collectibles.length > 0
      ) {
        // eslint-disable-next-line react/no-did-update-set-state
        this.setState({ showProtectWalletModal: true });

        this.props.metrics.trackEvent(
          MetaMetricsEvents.WALLET_SECURITY_PROTECT_VIEWED,
          {
            wallet_protection_required: false,
            source: 'Backup Alert',
          },
        );
      } else {
        // eslint-disable-next-line react/no-did-update-set-state
        this.setState({ showProtectWalletModal: false });
      }
    } else {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ showProtectWalletModal: false });
    }
    const pendingDeeplink = DeeplinkManager.getPendingDeeplink();
    const { KeyringController } = Engine.context;
    if (
      pendingDeeplink &&
      KeyringController.isUnlocked() &&
      route !== Routes.LOCK_SCREEN
    ) {
      DeeplinkManager.expireDeeplink();
      DeeplinkManager.parse(pendingDeeplink, {
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
      });
    }
    await this.updateAccountInfo();
  }
  toggleReceiveModal = () => {
    this.props.toggleReceiveModal();
  };

  showReceiveModal = () => {
    this.toggleReceiveModal();
  };

  onSecureWalletModalAction = () => {
    this.setState({ showProtectWalletModal: false });
    this.props.navigation.navigate(
      'SetPasswordFlow',
      this.props.passwordSet ? { screen: 'AccountBackupStep1' } : undefined,
    );
    InteractionManager.runAfterInteractions(() => {
      this.props.metrics.trackEvent(
        MetaMetricsEvents.WALLET_SECURITY_PROTECT_ENGAGED,
        {
          wallet_protection_required: true,
          source: 'Modal',
        },
      );
    });
  };

  onInfoNetworksModalClose = () => {
    const {
      providerConfig,
      onboardNetworkAction,
      networkSwitched,
      toggleInfoNetworkModal,
    } = this.props;
    onboardNetworkAction(providerConfig.chainId);
    networkSwitched({ networkUrl: '', networkStatus: false });
    toggleInfoNetworkModal();
  };

  renderProtectModal = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <Modal
        isVisible={this.state.showProtectWalletModal}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        style={styles.bottomModal}
        backdropColor={colors.overlay.default}
        backdropOpacity={1}
        animationInTiming={600}
        animationOutTiming={600}
      >
        <View style={styles.protectWalletContainer}>
          <View style={styles.protectWalletIconContainer}>
            <FeatherIcon
              style={styles.protectWalletIcon}
              name="alert-triangle"
              size={20}
            />
          </View>
          <Text style={styles.protectWalletTitle}>
            {strings('protect_your_wallet_modal.title')}
          </Text>
          <Text style={styles.protectWalletContent}>
            {!this.props.passwordSet
              ? strings('protect_your_wallet_modal.body_for_password')
              : strings('protect_your_wallet_modal.body_for_seedphrase')}
          </Text>
          <View style={styles.protectWalletButtonWrapper}>
            <StyledButton
              type={'confirm'}
              onPress={this.onSecureWalletModalAction}
            >
              {strings('protect_your_wallet_modal.button')}
            </StyledButton>
          </View>
        </View>
      </Modal>
    );
  };

  render() {
    const { providerConfig, navigation, infoNetworkModalVisible } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    const fiatBalance = Engine.getTotalFiatAccountBalance();
    if (fiatBalance !== this.previousBalance) {
      this.previousBalance = this.currentBalance;
    }

    return (
      <View style={styles.wrapper} testID={'drawer-screen'}>
        <Modal
          isVisible={infoNetworkModalVisible}
          onBackdropPress={navigation.goBack}
          onBackButtonPress={navigation.goBack}
          onSwipeComplete={navigation.goBack}
          swipeDirection={'down'}
          propagateSwipe
          backdropColor={colors.overlay.default}
          backdropOpacity={1}
        >
          <NetworkInfo
            onClose={this.onInfoNetworksModalClose}
            type={providerConfig.type}
            ticker={providerConfig.ticker}
          />
        </Modal>

        <Modal
          isVisible={this.props.receiveModalVisible}
          onBackdropPress={this.toggleReceiveModal}
          onBackButtonPress={this.toggleReceiveModal}
          onSwipeComplete={this.toggleReceiveModal}
          swipeDirection={'down'}
          propagateSwipe
          style={styles.bottomModal}
          backdropColor={colors.overlay.default}
          backdropOpacity={1}
        >
          <ReceiveRequest
            navigation={this.props.navigation}
            hideModal={this.toggleReceiveModal}
            showReceiveModal={this.showReceiveModal}
          />
        </Modal>
        {this.renderProtectModal()}
      </View>
    );
  }
}

const mapStateToProps = (state) => ({
  providerConfig: selectProviderConfig(state),
  networkConfigurations: selectNetworkConfigurations(state),
  networkModalVisible: state.modals.networkModalVisible,
  receiveModalVisible: state.modals.receiveModalVisible,
  infoNetworkModalVisible: state.modals.infoNetworkModalVisible,
  passwordSet: state.user.passwordSet,
  wizard: state.wizard,
  ticker: selectTicker(state),
  tokens: selectTokens(state),
  tokenBalances: selectContractBalances(state),
  collectibles: collectiblesSelector(state),
  seedphraseBackedUp: state.user.seedphraseBackedUp,
});

const mapDispatchToProps = (dispatch) => ({
  toggleReceiveModal: () => dispatch(toggleReceiveModal()),
  onboardNetworkAction: (chainId) => dispatch(onboardNetworkAction(chainId)),
  networkSwitched: ({ networkUrl, networkStatus }) =>
    dispatch(networkSwitched({ networkUrl, networkStatus })),
  toggleInfoNetworkModal: () => dispatch(toggleInfoNetworkModal(false)),
});

DrawerView.contextType = ThemeContext;

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withMetricsAwareness(DrawerView));
