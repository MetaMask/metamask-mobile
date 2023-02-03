import React, { PureComponent } from 'react';
import {
  Alert,
  TouchableOpacity,
  View,
  Image,
  StyleSheet,
  Text,
  InteractionManager,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Share from 'react-native-share';
import Icon from 'react-native-vector-icons/FontAwesome';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fontStyles } from '../../../styles/common';
import {
  hasBlockExplorer,
  findBlockExplorerForRpc,
  getBlockExplorerName,
} from '../../../util/networks';
import Identicon from '../Identicon';
import StyledButton from '../StyledButton';
import NetworkList from '../NetworkList';
import { renderFromWei, renderFiat } from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import Modal from 'react-native-modal';
import SecureKeychain from '../../../core/SecureKeychain';
import {
  toggleNetworkModal,
  toggleReceiveModal,
} from '../../../actions/modals';
import { showAlert } from '../../../actions/alert';
import {
  getEtherscanAddressUrl,
  getEtherscanBaseUrl,
} from '../../../util/etherscan';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import Device from '../../../util/device';
import OnboardingWizard from '../OnboardingWizard';
import ReceiveRequest from '../ReceiveRequest';
import Analytics from '../../../core/Analytics/Analytics';
import AppConstants from '../../../core/AppConstants';
import { MetaMetricsEvents } from '../../../core/Analytics';
import URL from 'url-parse';
import EthereumAddress from '../EthereumAddress';
import { getEther } from '../../../util/transactions';
import { newAssetTransaction } from '../../../actions/transaction';
import { logOut, protectWalletModalVisible } from '../../../actions/user';
import DeeplinkManager from '../../../core/DeeplinkManager';
import SettingsNotification from '../SettingsNotification';
import InvalidCustomNetworkAlert from '../InvalidCustomNetworkAlert';
import { RPC } from '../../../constants/network';
import { findRouteNameFromNavigatorState } from '../../../util/general';
import AnalyticsV2 from '../../../util/analyticsV2';
import {
  isDefaultAccountName,
  doENSReverseLookup,
} from '../../../util/ENSUtils';
import ClipboardManager from '../../../core/ClipboardManager';
import { collectiblesSelector } from '../../../reducers/collectibles';
import { getCurrentRoute } from '../../../reducers/navigation';
import { ScrollView } from 'react-native-gesture-handler';
import { isZero } from '../../../util/lodash';
import { KeyringTypes } from '@metamask/keyring-controller';
import { ThemeContext, mockTheme } from '../../../util/theme';
import NetworkInfo from '../NetworkInfo';
import sanitizeUrl from '../../../util/sanitizeUrl';
import {
  onboardNetworkAction,
  networkSwitched,
} from '../../../actions/onboardNetwork';
import Routes from '../../../constants/navigation/Routes';
import { scale } from 'react-native-size-matters';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  DRAWER_VIEW_LOCK_TEXT_ID,
  DRAWER_VIEW_SETTINGS_TEXT_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/DrawerView.testIds';

import { createAccountSelectorNavDetails } from '../../Views/AccountSelector';

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
const ICON_IMAGES = {
  wallet: require('../../../images/wallet-icon.png'), // eslint-disable-line
  'selected-wallet': require('../../../images/selected-wallet-icon.png'), // eslint-disable-line
};

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
     * Object representing the selected the selected network
     */
    network: PropTypes.object.isRequired,
    /**
     * Selected address as string
     */
    selectedAddress: PropTypes.string,
    /**
     * List of accounts from the AccountTrackerController
     */
    accounts: PropTypes.object,
    /**
     * List of accounts from the PreferencesController
     */
    identities: PropTypes.object,
    /**
    /* Selected currency
    */
    currentCurrency: PropTypes.string,
    /**
     * List of keyrings
     */
    keyrings: PropTypes.array,
    /**
     * Action that toggles the network modal
     */
    toggleNetworkModal: PropTypes.func,
    /**
     * Action that toggles the receive modal
     */
    toggleReceiveModal: PropTypes.func,
    /**
     * Action that shows the global alert
     */
    showAlert: PropTypes.func.isRequired,
    /**
     * Boolean that determines the status of the networks modal
     */
    networkModalVisible: PropTypes.bool.isRequired,
    /**
     * Boolean that determines the status of the receive modal
     */
    receiveModalVisible: PropTypes.bool.isRequired,
    /**
     * Start transaction with asset
     */
    newAssetTransaction: PropTypes.func.isRequired,
    /**
     * Boolean that determines if the user has set a password before
     */
    passwordSet: PropTypes.bool,
    /**
     * Wizard onboarding state
     */
    wizard: PropTypes.object,
    /**
     * Current provider ticker
     */
    ticker: PropTypes.string,
    /**
     * Frequent RPC list from PreferencesController
     */
    frequentRpcList: PropTypes.array,
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
     * Prompts protect wallet modal
     */
    protectWalletModalVisible: PropTypes.func,
    logOut: PropTypes.func,
    /**
     * Callback to close drawer
     */
    onCloseDrawer: PropTypes.func,
    /**
     * Latest navigation route
     */
    currentRoute: PropTypes.string,
    /**
     * handles action for onboarding to a network
     */
    onboardNetworkAction: PropTypes.func,
    /**
     * returns network onboarding state
     */
    networkOnboarding: PropTypes.object,
    /**
     * returns switched network state
     */
    switchedNetwork: PropTypes.object,
    /**
     * updates when network is switched
     */
    networkSwitched: PropTypes.func,
    /**
     *
     */
    networkOnboardedState: PropTypes.array,
  };

  state = {
    showProtectWalletModal: undefined,
    account: {
      ens: undefined,
      name: undefined,
      address: undefined,
      currentNetwork: undefined,
    },
    networkSelected: false,
    networkType: undefined,
    networkCurrency: undefined,
    showModal: false,
    networkUrl: undefined,
  };

  browserSectionRef = React.createRef();

  currentBalance = null;
  previousBalance = null;
  processedNewBalance = false;
  animatingNetworksModal = false;

  isCurrentAccountImported() {
    let ret = false;
    const { keyrings, selectedAddress } = this.props;
    const allKeyrings =
      keyrings && keyrings.length
        ? keyrings
        : Engine.context.KeyringController.state.keyrings;
    for (const keyring of allKeyrings) {
      if (keyring.accounts.includes(selectedAddress)) {
        ret = keyring.type !== 'HD Key Tree';
        break;
      }
    }

    return ret;
  }

  renderTag() {
    let tag = null;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    const { keyrings, selectedAddress } = this.props;
    const allKeyrings =
      keyrings && keyrings.length
        ? keyrings
        : Engine.context.KeyringController.state.keyrings;
    for (const keyring of allKeyrings) {
      if (keyring.accounts.includes(selectedAddress)) {
        if (keyring.type === KeyringTypes.simple) {
          tag = strings('accounts.imported');
        } else if (keyring.type === KeyringTypes.qr) {
          tag = strings('transaction.hardware');
        }
        break;
      }
    }
    return tag ? (
      <View style={styles.importedWrapper}>
        <Text numberOfLines={1} style={styles.importedText}>
          {tag}
        </Text>
      </View>
    ) : null;
  }

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
          'LockScreen',
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
        InteractionManager.runAfterInteractions(() => {
          AnalyticsV2.trackEvent(
            MetaMetricsEvents.WALLET_SECURITY_PROTECT_VIEWED,
            {
              wallet_protection_required: false,
              source: 'Backup Alert',
            },
          );
        });
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
      route !== 'LockScreen'
    ) {
      DeeplinkManager.expireDeeplink();
      DeeplinkManager.parse(pendingDeeplink, {
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
      });
    }
    await this.updateAccountInfo();
  }

  updateAccountInfo = async () => {
    const { identities, network, selectedAddress } = this.props;
    const { currentNetwork, address, name } = this.state.account;
    const accountName = identities[selectedAddress]?.name;
    if (
      currentNetwork !== network ||
      address !== selectedAddress ||
      name !== accountName
    ) {
      const ens = await doENSReverseLookup(
        selectedAddress,
        network.provider.chainId,
      );
      this.setState((state) => ({
        account: {
          ens,
          name: accountName,
          currentNetwork: network,
          address: selectedAddress,
        },
      }));
    }
  };

  openAccountSelector = () => {
    const { navigation } = this.props;

    navigation.navigate(
      ...createAccountSelectorNavDetails({
        onOpenImportAccount: this.hideDrawer,
        onOpenConnectHardwareWallet: this.hideDrawer,
        onSelectAccount: this.hideDrawer,
      }),
    );
    this.trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_ACCOUNT_NAME);
  };

  toggleReceiveModal = () => {
    this.props.toggleReceiveModal();
  };

  onNetworksModalClose = async (manualClose) => {
    this.toggleNetworksModal();
    if (!manualClose) {
      await this.hideDrawer();
    }
  };

  onInfoNetworksModalClose = async (manualClose) => {
    const {
      networkOnboarding: { showNetworkOnboarding, networkUrl },
      onboardNetworkAction,
      switchedNetwork: { networkUrl: switchedNetworkUrl },
      networkSwitched,
    } = this.props;
    this.setState({
      networkSelected: !this.state.networkSelected,
      showModal: false,
    });
    !showNetworkOnboarding && this.toggleNetworksModal();
    onboardNetworkAction(
      sanitizeUrl(networkUrl) ||
        sanitizeUrl(switchedNetworkUrl) ||
        this.state.networkUrl,
    );
    networkSwitched({ networkUrl: '', networkStatus: false });
    if (!manualClose) {
      await this.hideDrawer();
    }
  };

  toggleNetworksModal = () => {
    if (!this.animatingNetworksModal) {
      this.animatingNetworksModal = true;
      this.props.toggleNetworkModal();
      setTimeout(() => {
        this.animatingNetworksModal = false;
      }, 500);
    }
  };

  onNetworkSelected = (type, currency, url) => {
    this.setState({
      networkType: type,
      networkUrl: url || type,
      networkCurrency: currency,
      networkSelected: true,
    });
  };

  switchModalContent = () => {
    this.setState({ showModal: true });
  };

  showReceiveModal = () => {
    this.toggleReceiveModal();
  };

  trackEvent = (event) => {
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEvent(event);
    });
  };

  // NOTE: do we need this event?
  trackOpenBrowserEvent = () => {
    const { network } = this.props;
    AnalyticsV2.trackEvent(MetaMetricsEvents.BROWSER_OPENED, {
      source: 'In-app Navigation',
      chain_id: network,
    });
  };

  onReceive = () => {
    this.toggleReceiveModal();
    this.trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_RECEIVE);
  };

  onSend = async () => {
    this.props.newAssetTransaction(getEther(this.props.ticker));
    this.props.navigation.navigate('SendFlowView');
    this.hideDrawer();
    this.trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_SEND);
  };

  goToBrowser = () => {
    this.props.navigation.navigate(Routes.BROWSER.HOME);
    this.hideDrawer();
    // Q: duplicated analytic event?
    this.trackOpenBrowserEvent();
    this.trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_BROWSER);
  };

  showWallet = () => {
    this.props.navigation.navigate('WalletTabHome');
    this.hideDrawer();
    this.trackEvent(MetaMetricsEvents.WALLET_OPENED);
  };

  goToTransactionHistory = () => {
    this.props.navigation.navigate('TransactionsHome');
    this.hideDrawer();
    this.trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_TRANSACTION_HISTORY);
  };

  showSettings = async () => {
    this.props.navigation.navigate('SettingsView');
    this.hideDrawer();
    this.trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_SETTINGS);
  };

  logOut = () => {
    this.props.navigation.navigate(Routes.ONBOARDING.LOGIN);
    this.props.logOut();
  };

  onPress = async () => {
    const { passwordSet } = this.props;
    const { KeyringController } = Engine.context;
    await SecureKeychain.resetGenericPassword();
    await KeyringController.setLocked();
    if (!passwordSet) {
      this.props.navigation.navigate('OnboardingRootNav', {
        screen: Routes.ONBOARDING.NAV,
        params: { screen: 'Onboarding' },
      });
    } else {
      this.logOut();
    }
  };

  logout = () => {
    Alert.alert(
      strings('drawer.lock_title'),
      '',
      [
        {
          text: strings('drawer.lock_cancel'),
          onPress: () => null,
          style: 'cancel',
        },
        {
          text: strings('drawer.lock_ok'),
          onPress: this.onPress,
        },
      ],
      { cancelable: false },
    );
    this.trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_LOGOUT);
  };

  viewInEtherscan = () => {
    const {
      selectedAddress,
      network,
      network: {
        provider: { rpcTarget },
      },
      frequentRpcList,
    } = this.props;
    if (network.provider.type === RPC) {
      const blockExplorer = findBlockExplorerForRpc(rpcTarget, frequentRpcList);
      const url = `${blockExplorer}/address/${selectedAddress}`;
      const title = new URL(blockExplorer).hostname;
      this.goToBrowserUrl(url, title);
    } else {
      const url = getEtherscanAddressUrl(
        network.provider.type,
        selectedAddress,
      );
      const etherscan_url = getEtherscanBaseUrl(network.provider.type).replace(
        'https://',
        '',
      );
      this.goToBrowserUrl(url, etherscan_url);
    }
    this.trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_VIEW_ETHERSCAN);
  };

  submitFeedback = () => {
    this.trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_SEND_FEEDBACK);
    this.goToBrowserUrl(
      'https://community.metamask.io/c/feature-requests-ideas/',
      strings('drawer.request_feature'),
    );
  };

  showHelp = () => {
    this.goToBrowserUrl(
      'https://support.metamask.io',
      strings('drawer.metamask_support'),
    );
    this.trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP);
  };

  goToBrowserUrl(url, title) {
    this.props.navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url,
        title,
      },
    });
    this.hideDrawer();
  }

  hideDrawer = () => {
    this.props.onCloseDrawer();
  };

  hasBlockExplorer = (providerType) => {
    const { frequentRpcList } = this.props;
    if (providerType === RPC) {
      const {
        network: {
          provider: { rpcTarget },
        },
      } = this.props;
      const blockExplorer = findBlockExplorerForRpc(rpcTarget, frequentRpcList);
      if (blockExplorer) {
        return true;
      }
    }
    return hasBlockExplorer(providerType);
  };

  getIcon(name, size) {
    const colors = this.context.colors || mockTheme.colors;

    return (
      <Icon name={name} size={size || 24} color={colors.icon.alternative} />
    );
  }

  getFeatherIcon(name, size) {
    const colors = this.context.colors || mockTheme.colors;

    return (
      <FeatherIcon
        name={name}
        size={size || 24}
        color={colors.icon.alternative}
      />
    );
  }

  getMaterialIcon(name, size) {
    const colors = this.context.colors || mockTheme.colors;

    return (
      <MaterialIcon
        name={name}
        size={size || 24}
        color={colors.icon.alternative}
      />
    );
  }

  getImageIcon(name) {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <Image source={ICON_IMAGES[name]} style={styles.menuItemIconImage} />
    );
  }

  getSelectedIcon(name, size) {
    const colors = this.context.colors || mockTheme.colors;

    return (
      <Icon name={name} size={size || 24} color={colors.primary.default} />
    );
  }

  getSelectedFeatherIcon(name, size) {
    const colors = this.context.colors || mockTheme.colors;

    return (
      <FeatherIcon
        name={name}
        size={size || 24}
        color={colors.primary.default}
      />
    );
  }

  getSelectedMaterialIcon(name, size) {
    const colors = this.context.colors || mockTheme.colors;

    return (
      <MaterialIcon
        name={name}
        size={size || 24}
        color={colors.primary.default}
      />
    );
  }

  getSelectedImageIcon(name) {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <Image
        source={ICON_IMAGES[`selected-${name}`]}
        style={styles.selectedMenuItemIconImage}
      />
    );
  }

  getSections = () => {
    const {
      network: {
        provider: { type, rpcTarget },
      },
      frequentRpcList,
    } = this.props;
    let blockExplorer, blockExplorerName;
    if (type === RPC) {
      blockExplorer = findBlockExplorerForRpc(rpcTarget, frequentRpcList);
      blockExplorerName = getBlockExplorerName(blockExplorer);
    }
    return [
      [
        {
          name: strings('drawer.transaction_activity'),
          icon: this.getFeatherIcon('list'),
          selectedIcon: this.getSelectedFeatherIcon('list'),
          action: this.goToTransactionHistory,
          routeNames: ['TransactionsView'],
        },
      ],
      [
        {
          name: strings('drawer.share_address'),
          icon: this.getMaterialIcon('share-variant'),
          action: this.onShare,
        },
        {
          name:
            (blockExplorer &&
              `${strings('drawer.view_in')} ${blockExplorerName}`) ||
            strings('drawer.view_in_etherscan'),
          icon: this.getIcon('eye'),
          action: this.viewInEtherscan,
        },
      ],
      [
        {
          name: strings('drawer.settings'),
          icon: this.getFeatherIcon('settings'),
          warning: strings('drawer.settings_warning_short'),
          action: this.showSettings,
          testID: DRAWER_VIEW_SETTINGS_TEXT_ID,
        },
        {
          name: strings('drawer.help'),
          icon: this.getIcon('comments'),
          action: this.showHelp,
        },
        {
          name: strings('drawer.request_feature'),
          icon: this.getFeatherIcon('message-square'),
          action: this.submitFeedback,
        },
        {
          name: strings('drawer.lock'),
          icon: this.getFeatherIcon('log-out'),
          action: this.logout,
          // ...generateTestId(Platform, DRAWER_VIEW_LOCK_ICON_ID),
          testID: DRAWER_VIEW_LOCK_TEXT_ID,
        },
      ],
    ];
  };

  copyAccountToClipboard = async () => {
    const { selectedAddress } = this.props;
    await ClipboardManager.setString(selectedAddress);
    this.toggleReceiveModal();
    InteractionManager.runAfterInteractions(() => {
      this.props.showAlert({
        isVisible: true,
        autodismiss: 1500,
        content: 'clipboard-alert',
        data: { msg: strings('account_details.account_copied_to_clipboard') },
      });
    });
  };

  onShare = () => {
    const { selectedAddress } = this.props;
    Share.open({
      message: selectedAddress,
    })
      .then(() => {
        this.props.protectWalletModalVisible();
      })
      .catch((err) => {
        Logger.log('Error while trying to share address', err);
      });
    this.trackEvent(MetaMetricsEvents.NAVIGATION_TAPS_SHARE_PUBLIC_ADDRESS);
  };

  closeInvalidCustomNetworkAlert = () => {
    this.setState({ invalidCustomNetwork: null });
  };

  showInvalidCustomNetworkAlert = (network) => {
    InteractionManager.runAfterInteractions(() => {
      this.setState({ invalidCustomNetwork: network });
    });
  };

  /**
   * Return step 5 of onboarding wizard if that is the current step
   */
  renderOnboardingWizard = () => {
    const {
      wizard: { step },
    } = this.props;
    return (
      step === 5 && (
        <OnboardingWizard
          navigation={this.props.navigation}
          coachmarkRef={this.browserSectionRef}
        />
      )
    );
  };

  onSecureWalletModalAction = () => {
    this.setState({ showProtectWalletModal: false });
    this.props.navigation.navigate(
      'SetPasswordFlow',
      this.props.passwordSet ? { screen: 'AccountBackupStep1' } : undefined,
    );
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.WALLET_SECURITY_PROTECT_ENGAGED,
        {
          wallet_protection_required: true,
          source: 'Modal',
        },
      );
    });
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
    const {
      network,
      accounts,
      identities,
      selectedAddress,
      currentCurrency,
      ticker,
      seedphraseBackedUp,
      currentRoute,
      networkOnboarding,
      networkOnboardedState,
      switchedNetwork: { networkUrl, networkStatus },
      networkModalVisible,
    } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    const {
      invalidCustomNetwork,
      account: { name: nameFromState, ens: ensFromState },
      showModal,
      networkType,
    } = this.state;

    const account = {
      address: selectedAddress,
      name: nameFromState,
      ens: ensFromState,
      ...identities[selectedAddress],
      ...accounts[selectedAddress],
    };
    const { name, ens } = account;
    account.balance =
      (accounts[selectedAddress] &&
        renderFromWei(accounts[selectedAddress].balance)) ||
      0;
    const fiatBalance = Engine.getTotalFiatAccountBalance();
    if (fiatBalance !== this.previousBalance) {
      this.previousBalance = this.currentBalance;
    }
    this.currentBalance = fiatBalance;
    const fiatBalanceStr = renderFiat(this.currentBalance, currentCurrency);
    const accountName = isDefaultAccountName(name) && ens ? ens : name;
    const checkIfCustomNetworkExists = networkOnboardedState.filter(
      (item) => item.network === sanitizeUrl(networkUrl),
    );

    const networkSwitchedAndInWalletView =
      currentRoute === 'WalletView' &&
      networkStatus &&
      checkIfCustomNetworkExists.length === 0;

    const canShowNetworkInfoModal =
      showModal ||
      networkOnboarding.showNetworkOnboarding ||
      networkSwitchedAndInWalletView;

    return (
      <View style={styles.wrapper} testID={'drawer-screen'}>
        <ScrollView>
          <View style={styles.header}>
            <View style={styles.metamaskLogo}>
              <Image
                source={metamask_fox}
                style={styles.metamaskFox}
                resizeMethod={'auto'}
              />
              <Image
                source={metamask_name}
                style={styles.metamaskName}
                resizeMethod={'auto'}
              />
            </View>
          </View>
          <View style={styles.account}>
            <View style={styles.accountBgOverlay}>
              <TouchableOpacity
                style={styles.identiconWrapper}
                onPress={this.openAccountSelector}
                testID={'navbar-account-identicon'}
              >
                <View style={styles.identiconBorder}>
                  <Identicon diameter={48} address={selectedAddress} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.accountInfo}
                onPress={this.openAccountSelector}
                testID={'navbar-account-button'}
              >
                <View style={styles.accountNameWrapper}>
                  <Text style={styles.accountName} numberOfLines={1}>
                    {accountName}
                  </Text>
                  <Icon name="caret-down" size={24} style={styles.caretDown} />
                </View>
                <Text style={styles.accountBalance}>{fiatBalanceStr}</Text>
                <EthereumAddress
                  address={account.address}
                  style={styles.accountAddress}
                  type={'short'}
                />
                {this.renderTag()}
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.buttons}>
            <StyledButton
              type={'rounded-normal'}
              onPress={this.onSend}
              containerStyle={[styles.button, styles.leftButton]}
              testID={'drawer-send-button'}
            >
              <View style={styles.buttonContent}>
                <MaterialIcon
                  name={'arrow-top-right'}
                  size={22}
                  color={colors.primary.default}
                  style={styles.buttonIcon}
                />
                <Text style={styles.buttonText}>
                  {strings('drawer.send_button')}
                </Text>
              </View>
            </StyledButton>
            <StyledButton
              type={'rounded-normal'}
              onPress={this.onReceive}
              containerStyle={[styles.button, styles.rightButton]}
              testID={'drawer-receive-button'}
            >
              <View style={styles.buttonContent}>
                <MaterialIcon
                  name={'keyboard-tab'}
                  size={22}
                  color={colors.primary.default}
                  style={[styles.buttonIcon, styles.buttonReceive]}
                />
                <Text style={styles.buttonText}>
                  {strings('drawer.receive_button')}
                </Text>
              </View>
            </StyledButton>
          </View>
          <View style={styles.menu}>
            {this.getSections().map(
              (section, i) =>
                section?.length > 0 && (
                  <View
                    key={`section_${i}`}
                    style={[
                      styles.menuSection,
                      i === 0 ? styles.noTopBorder : null,
                    ]}
                  >
                    {section
                      .filter((item) => {
                        if (!item) return undefined;
                        const { name = undefined } = item;
                        if (
                          name &&
                          name.toLowerCase().indexOf('etherscan') !== -1
                        ) {
                          const type = network.provider?.type;
                          return (
                            (type && this.hasBlockExplorer(type)) || undefined
                          );
                        }
                        return true;
                      })
                      .map((item, j) => (
                        <TouchableOpacity
                          key={`item_${i}_${j}`}
                          style={[
                            styles.menuItem,
                            item.routeNames &&
                            item.routeNames.includes(currentRoute)
                              ? styles.selectedRoute
                              : null,
                          ]}
                          ref={
                            item.name === strings('drawer.browser') &&
                            this.browserSectionRef
                          }
                          onPress={() => item.action()} // eslint-disable-line
                        >
                          {item.icon
                            ? item.routeNames &&
                              item.routeNames.includes(currentRoute)
                              ? item.selectedIcon
                              : item.icon
                            : null}
                          <Text
                            style={[
                              styles.menuItemName,
                              !item.icon ? styles.noIcon : null,
                              item.routeNames &&
                              item.routeNames.includes(currentRoute)
                                ? styles.selectedName
                                : null,
                            ]}
                            {...generateTestId(Platform, item.testID)}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          {!seedphraseBackedUp && item.warning ? (
                            <SettingsNotification isNotification isWarning>
                              <Text style={styles.menuItemWarningText}>
                                {item.warning}
                              </Text>
                            </SettingsNotification>
                          ) : null}
                        </TouchableOpacity>
                      ))}
                  </View>
                ),
            )}
          </View>
        </ScrollView>
        <Modal
          isVisible={
            networkModalVisible || networkOnboarding.showNetworkOnboarding
          }
          onBackdropPress={
            canShowNetworkInfoModal ? null : this.toggleNetworksModal
          }
          onBackButtonPress={showModal ? null : this.toggleNetworksModa}
          onSwipeComplete={showModal ? null : this.toggleNetworksModa}
          swipeDirection={'down'}
          propagateSwipe
          backdropColor={colors.overlay.default}
          backdropOpacity={1}
        >
          {canShowNetworkInfoModal ? (
            <NetworkInfo
              onClose={this.onInfoNetworksModalClose}
              type={networkType || networkOnboarding.networkType}
              ticker={ticker}
            />
          ) : (
            <NetworkList
              navigation={this.props.navigation}
              onClose={this.onNetworksModalClose}
              onNetworkSelected={this.onNetworkSelected}
              showInvalidCustomNetworkAlert={this.showInvalidCustomNetworkAlert}
              switchModalContent={this.switchModalContent}
            />
          )}
        </Modal>
        <Modal
          backdropColor={colors.overlay.default}
          backdropOpacity={1}
          isVisible={!!invalidCustomNetwork}
        >
          <InvalidCustomNetworkAlert
            navigation={this.props.navigation}
            network={invalidCustomNetwork}
            onClose={this.closeInvalidCustomNetworkAlert}
          />
        </Modal>
        {this.renderOnboardingWizard()}
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
  network: state.engine.backgroundState.NetworkController,
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  accounts: state.engine.backgroundState.AccountTrackerController.accounts,
  identities: state.engine.backgroundState.PreferencesController.identities,
  frequentRpcList:
    state.engine.backgroundState.PreferencesController.frequentRpcList,
  currentCurrency:
    state.engine.backgroundState.CurrencyRateController.currentCurrency,
  keyrings: state.engine.backgroundState.KeyringController.keyrings,
  networkModalVisible: state.modals.networkModalVisible,
  receiveModalVisible: state.modals.receiveModalVisible,
  passwordSet: state.user.passwordSet,
  wizard: state.wizard,
  ticker: state.engine.backgroundState.NetworkController.provider.ticker,
  tokens: state.engine.backgroundState.TokensController.tokens,
  tokenBalances:
    state.engine.backgroundState.TokenBalancesController.contractBalances,
  collectibles: collectiblesSelector(state),
  seedphraseBackedUp: state.user.seedphraseBackedUp,
  currentRoute: getCurrentRoute(state),
  networkOnboarding: state.networkOnboarded.networkState,
  networkOnboardedState: state.networkOnboarded.networkOnboardedState,
  networkProvider: state.engine.backgroundState.NetworkController.provider,
  switchedNetwork: state.networkOnboarded.switchedNetwork,
});

const mapDispatchToProps = (dispatch) => ({
  toggleNetworkModal: () => dispatch(toggleNetworkModal()),
  toggleReceiveModal: () => dispatch(toggleReceiveModal()),
  showAlert: (config) => dispatch(showAlert(config)),
  newAssetTransaction: (selectedAsset) =>
    dispatch(newAssetTransaction(selectedAsset)),
  protectWalletModalVisible: () => dispatch(protectWalletModalVisible()),
  logOut: () => dispatch(logOut()),
  onboardNetworkAction: (network) => dispatch(onboardNetworkAction(network)),
  networkSwitched: ({ networkUrl, networkStatus }) =>
    dispatch(networkSwitched({ networkUrl, networkStatus })),
});

DrawerView.contextType = ThemeContext;

export default connect(mapStateToProps, mapDispatchToProps)(DrawerView);
