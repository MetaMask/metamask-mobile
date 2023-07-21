import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
  InteractionManager,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { connect } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import {
  WALLET_ACCOUNT_ICON,
  WALLET_ACCOUNT_NAME_LABEL_INPUT,
  WALLET_ACCOUNT_NAME_LABEL_TEXT,
} from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { showAlert } from '../../../actions/alert';
import { toggleReceiveModal } from '../../../actions/modals';
import { newAssetTransaction } from '../../../actions/transaction';
import { protectWalletModalVisible } from '../../../actions/user';
import Routes from '../../../constants/navigation/Routes';
import ClipboardManager from '../../../core/ClipboardManager';
import { fontStyles } from '../../../styles/common';
import {
  doENSReverseLookup,
  isDefaultAccountName,
} from '../../../util/ENSUtils';
import { isQRHardwareAccount, renderAccountName } from '../../../util/address';
import Device from '../../../util/device';
import { ThemeContext, mockTheme } from '../../../util/theme';
import EthereumAddress from '../EthereumAddress';
import Identicon from '../Identicon';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Analytics from '../../../core/Analytics/Analytics';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../../core/Engine';
import { selectNetwork } from '../../../selectors/networkController';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import {
  selectIdentities,
  selectSelectedAddress,
} from '../../../selectors/preferencesController';
import { createAccountSelectorNavDetails } from '../../Views/AccountSelector';

const createStyles = (colors) =>
  StyleSheet.create({
    scrollView: {
      backgroundColor: colors.background.default,
    },
    wrapper: {
      paddingTop: 20,
      paddingHorizontal: 20,
      paddingBottom: 0,
      alignItems: 'center',
    },
    info: {
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
    },
    data: {
      textAlign: 'center',
      paddingTop: 7,
    },
    label: {
      fontSize: 24,
      textAlign: 'center',
      ...fontStyles.normal,
      color: colors.text.default,
    },
    labelInput: {
      marginBottom: Device.isAndroid() ? -10 : 0,
    },
    labelWrapper: {
      flexDirection: 'row',
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
      padding: 4,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: colors.text.default,
      height: 28,
      borderRadius: 14,
    },
    tagText: {
      fontSize: 12,
      ...fontStyles.bold,
      minWidth: 32,
      textAlign: 'center',
      color: colors.text.default,
    },
    addressWrapper: {
      backgroundColor: colors.primary.muted,
      borderRadius: 40,
      marginTop: 20,
      marginBottom: 20,
      paddingVertical: 7,
      paddingHorizontal: 15,
    },
    address: {
      fontSize: 12,
      color: colors.text.default,
      ...fontStyles.normal,
      letterSpacing: 0.8,
    },
    amountFiat: {
      fontSize: 12,
      paddingTop: 5,
      color: colors.text.alternative,
      ...fontStyles.normal,
    },
    identiconBorder: {
      borderRadius: 80,
      borderWidth: 2,
      padding: 2,
      borderColor: colors.primary.default,
    },
    onboardingWizardLabel: {
      borderWidth: 2,
      borderRadius: 4,
      paddingVertical: Device.isIos() ? 2 : -4,
      paddingHorizontal: Device.isIos() ? 5 : 5,
      top: Device.isIos() ? 0 : -2,
    },
    actions: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'flex-start',
      flexDirection: 'row',
    },
    netWorthContainer: {
      justifyItems: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    },
    portfolioLink: { marginLeft: 5 },
    portfolioIcon: { color: colors.primary.default },
  });

/**
 * View that's part of the <Wallet /> component
 * which shows information about the selected account
 */
class AccountOverview extends PureComponent {
  static propTypes = {
    /**
     * String that represents the selected address
     */
    selectedAddress: PropTypes.string,
    /**
    /* Identities object required to get account name
    */
    identities: PropTypes.object,
    /**
     * Object that represents the selected account
     */
    account: PropTypes.object,
    /**
    /* Selected currency
    */
    currentCurrency: PropTypes.string,
    /**
    /* Triggers global alert
    */
    showAlert: PropTypes.func,
    /**
     * whether component is being rendered from onboarding wizard
     */
    onboardingWizard: PropTypes.bool,
    /**
     * Used to get child ref
     */
    onRef: PropTypes.func,
    /**
     * Prompts protect wallet modal
     */
    protectWalletModalVisible: PropTypes.func,
    /**
     * Start transaction with asset
     */
    newAssetTransaction: PropTypes.func,
    /**
    /* navigation object required to access the props
    /* passed by the parent component
    */
    navigation: PropTypes.object,
    /**
     * Action that toggles the receive modal
     */
    toggleReceiveModal: PropTypes.func,
    /**
     * ID of the current network
     */
    network: PropTypes.string,
    /**
     * Current opens tabs in browser
     */
    browserTabs: PropTypes.array,
  };

  state = {
    accountLabelEditable: false,
    accountLabel: '',
    originalAccountLabel: '',
    ens: undefined,
  };

  editableLabelRef = React.createRef();
  scrollViewContainer = React.createRef();
  mainView = React.createRef();

  openAccountSelector = () => {
    const { onboardingWizard, navigation } = this.props;
    !onboardingWizard &&
      navigation.navigate(...createAccountSelectorNavDetails({}));
  };

  isAccountLabelDefined = (accountLabel) =>
    !!accountLabel && !!accountLabel.trim().length;

  input = React.createRef();

  componentDidMount = () => {
    const { identities, selectedAddress, onRef } = this.props;
    const accountLabel = renderAccountName(selectedAddress, identities);
    this.setState({ accountLabel });
    onRef && onRef(this);
    InteractionManager.runAfterInteractions(() => {
      this.doENSLookup();
    });

    const { PreferencesController } = Engine.context;
    if (!this.isAccountLabelDefined(accountLabel)) {
      PreferencesController.setAccountLabel(selectedAddress, 'Account');
    }
  };

  componentDidUpdate(prevProps) {
    if (
      prevProps.account.address !== this.props.account.address ||
      prevProps.network !== this.props.network
    ) {
      requestAnimationFrame(() => {
        this.doENSLookup();
      });
    }
  }

  setAccountLabel = () => {
    const { PreferencesController } = Engine.context;
    const { selectedAddress, identities } = this.props;
    const { accountLabel } = this.state;

    const lastAccountLabel = identities[selectedAddress].name;

    PreferencesController.setAccountLabel(
      selectedAddress,
      this.isAccountLabelDefined(accountLabel)
        ? accountLabel
        : lastAccountLabel,
    );
    this.setState({ accountLabelEditable: false });
  };

  onAccountLabelChange = (accountLabel) => {
    this.setState({ accountLabel });
  };

  setAccountLabelEditable = () => {
    const { identities, selectedAddress } = this.props;
    const accountLabel = renderAccountName(selectedAddress, identities);
    this.setState({ accountLabelEditable: true, accountLabel });
    setTimeout(() => {
      this.input && this.input.current && this.input.current.focus();
    }, 100);
  };

  cancelAccountLabelEdition = () => {
    const { identities, selectedAddress } = this.props;
    const accountLabel = renderAccountName(selectedAddress, identities);
    this.setState({ accountLabelEditable: false, accountLabel });
  };

  copyAccountToClipboard = async () => {
    const { selectedAddress } = this.props;
    await ClipboardManager.setString(selectedAddress);
    this.props.showAlert({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: { msg: strings('account_details.account_copied_to_clipboard') },
    });
    setTimeout(() => this.props.protectWalletModalVisible(), 2000);
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEvent(MetaMetricsEvents.WALLET_COPIED_ADDRESS);
    });
  };

  doENSLookup = async () => {
    const { network, account } = this.props;
    try {
      const ens = await doENSReverseLookup(account.address, network);
      this.setState({ ens });
      // eslint-disable-next-line no-empty
    } catch {}
  };

  onOpenPortfolio = () => {
    const { navigation, browserTabs } = this.props;
    const existingPortfolioTab = browserTabs.find((tab) =>
      tab.url.match(new RegExp(`${AppConstants.PORTFOLIO_URL}/(?![a-z])`)),
    );
    let existingTabId;
    let newTabUrl;
    if (existingPortfolioTab) {
      existingTabId = existingPortfolioTab.id;
    } else {
      newTabUrl = `${AppConstants.PORTFOLIO_URL}/?metamaskEntry=mobile`;
    }
    const params = {
      ...(newTabUrl && { newTabUrl }),
      ...(existingTabId && { existingTabId, newTabUrl: undefined }),
      timestamp: Date.now(),
    };
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params,
    });
    Analytics.trackEvent(MetaMetricsEvents.PORTFOLIO_LINK_CLICKED, {
      portfolioUrl: AppConstants.PORTFOLIO_URL,
    });
  };

  render() {
    const {
      account: { address, name },
      onboardingWizard,
    } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);

    if (!address) return null;
    const { accountLabelEditable, accountLabel, ens } = this.state;

    const isQRHardwareWalletAccount = isQRHardwareAccount(address);

    return (
      <View ref={this.scrollViewContainer} collapsable={false}>
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps={'never'}
          style={styles.scrollView}
          contentContainerStyle={styles.wrapper}
          testID={'account-overview'}
        >
          <View style={styles.info} ref={this.mainView}>
            <TouchableOpacity
              style={styles.identiconBorder}
              disabled={onboardingWizard}
              onPress={this.openAccountSelector}
              {...generateTestId(Platform, WALLET_ACCOUNT_ICON)}
            >
              <Identicon
                address={address}
                diameter={38}
                noFadeIn={onboardingWizard}
              />
            </TouchableOpacity>
            <View
              ref={this.editableLabelRef}
              style={styles.data}
              collapsable={false}
            >
              {accountLabelEditable ? (
                <TextInput
                  style={[
                    styles.label,
                    styles.labelInput,
                    styles.onboardingWizardLabel,
                    onboardingWizard
                      ? { borderColor: colors.primary.default }
                      : { borderColor: colors.background.default },
                  ]}
                  editable={accountLabelEditable}
                  onChangeText={this.onAccountLabelChange}
                  onSubmitEditing={this.setAccountLabel}
                  onBlur={this.setAccountLabel}
                  {...generateTestId(Platform, WALLET_ACCOUNT_NAME_LABEL_INPUT)}
                  value={accountLabel}
                  selectTextOnFocus
                  ref={this.input}
                  returnKeyType={'done'}
                  autoCapitalize={'none'}
                  autoCorrect={false}
                  numberOfLines={1}
                  placeholderTextColor={colors.text.muted}
                  keyboardAppearance={themeAppearance}
                />
              ) : (
                <View style={styles.labelWrapper}>
                  <TouchableOpacity onLongPress={this.setAccountLabelEditable}>
                    <Text
                      style={[
                        styles.label,
                        styles.onboardingWizardLabel,
                        {
                          borderColor: onboardingWizard
                            ? colors.primary.default
                            : colors.background.default,
                        },
                      ]}
                      numberOfLines={1}
                      {...generateTestId(
                        Platform,
                        WALLET_ACCOUNT_NAME_LABEL_TEXT,
                      )}
                    >
                      {isDefaultAccountName(name) && ens ? ens : name}
                    </Text>
                  </TouchableOpacity>
                  {isQRHardwareWalletAccount && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>
                        {strings('transaction.hardware')}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.addressWrapper}
              onPress={this.copyAccountToClipboard}
            >
              <EthereumAddress
                address={address}
                style={styles.address}
                type={'short'}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }
}

const mapStateToProps = (state) => ({
  selectedAddress: selectSelectedAddress(state),
  identities: selectIdentities(state),
  currentCurrency: selectCurrentCurrency(state),
  network: String(selectNetwork(state)),
  browserTabs: state.browser.tabs,
});

const mapDispatchToProps = (dispatch) => ({
  showAlert: (config) => dispatch(showAlert(config)),
  protectWalletModalVisible: () => dispatch(protectWalletModalVisible()),
  newAssetTransaction: (selectedAsset) =>
    dispatch(newAssetTransaction(selectedAsset)),
  toggleReceiveModal: (asset) => dispatch(toggleReceiveModal(asset)),
});

AccountOverview.contextType = ThemeContext;

export default connect(mapStateToProps, mapDispatchToProps)(AccountOverview);
