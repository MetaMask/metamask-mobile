import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  InteractionManager,
  SafeAreaView,
  StyleSheet,
  Alert,
} from 'react-native';
import { connect } from 'react-redux';

import Analytics from '../../../core/Analytics/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import { strings } from '../../../../locales/i18n';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { allowedToBuy } from '../FiatOrders';
import { showAlert } from '../../../actions/alert';
import { togglePortfolioDappModal } from '../../../actions/modals';
import { protectWalletModalVisible } from '../../../actions/user';

import { fontStyles, colors as importedColors } from '../../../styles/common';
import ModalDragger from '../../Base/ModalDragger';
import ClipboardManager from '../../../core/ClipboardManager';
import { ThemeContext, mockTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import BrowserTab from '../../../components/Views/BrowserTab';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      minHeight: '85%',
    },
    body: {
      alignItems: 'center',
      paddingHorizontal: 15,
      flex: 1,
    },
    qrWrapper: {
      margin: 8,
      padding: 8,
      backgroundColor: importedColors.white,
    },
    addressWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: 15,
      padding: 9,
      paddingHorizontal: 15,
      backgroundColor: colors.background.alternative,
      borderRadius: 30,
    },
    copyButton: {
      backgroundColor: colors.background.default,
      color: colors.primary.default,
      borderRadius: 12,
      overflow: 'hidden',
      paddingVertical: 3,
      paddingHorizontal: 6,
      marginHorizontal: 6,
      borderWidth: 1,
      borderColor: colors.primary.default,
    },
    actionRow: {
      flexDirection: 'row',
      marginBottom: 15,
    },
    actionButton: {
      flex: 1,
      marginHorizontal: 8,
    },
    title: {
      ...fontStyles.normal,
      color: colors.text.default,
      fontSize: 18,
      flexDirection: 'row',
      alignSelf: 'center',
    },
    titleWrapper: {
      marginTop: 10,
    },
  });

/**
 * PureComponent that renders receive options
 */
class PortfolioDapp extends PureComponent {
  static propTypes = {
    /**
     * The navigator object
     */
    navigation: PropTypes.object,
    /**
     * Selected address as string
     */
    selectedAddress: PropTypes.string,
    /**
     * Asset to receive, could be not defined
     */
    togglePortfolioDappModal: PropTypes.func,
    /**
		/* Triggers global alert
		*/
    showAlert: PropTypes.func,
    /**
     * Network id
     */
    network: PropTypes.string,
    /**
     * Network provider chain id
     */
    chainId: PropTypes.string,
    /**
     * Prompts protect wallet modal
     */
    protectWalletModalVisible: PropTypes.func,
    /**
     * Hides the modal that contains the component
     */
    hideModal: PropTypes.func,
    /**
     * redux flag that indicates if the user
     * completed the seed phrase backup flow
     */
    seedphraseBackedUp: PropTypes.bool,
  };

  state = {
    qrModalVisible: false,
    buyModalVisible: false,
  };

  /**
   * Shows an alert message with a coming soon message
   */
  onBuy = async () => {
    const { navigation, togglePortfolioDappModal, network } = this.props;
    if (!allowedToBuy(network)) {
      Alert.alert(
        strings('fiat_on_ramp.network_not_supported'),
        strings('fiat_on_ramp.switch_network'),
      );
    } else {
      togglePortfolioDappModal();
      navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID);
      InteractionManager.runAfterInteractions(() => {
        Analytics.trackEventWithParameters(
          AnalyticsV2.ANALYTICS_EVENTS.BUY_BUTTON_CLICKED,
          {
            text: 'Buy Native Token',
            location: 'Receive Modal',
            chain_id_destination: this.props.chainId,
          },
        );
      });
    }
  };

  copyAccountToClipboard = async () => {
    const { selectedAddress } = this.props;
    ClipboardManager.setString(selectedAddress);
    this.props.showAlert({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: { msg: strings('account_details.account_copied_to_clipboard') },
    });
    if (!this.props.seedphraseBackedUp) {
      setTimeout(() => this.props.hideModal(), 1000);
      setTimeout(() => this.props.protectWalletModalVisible(), 1500);
    }
  };

  /**
   * Closes QR code modal
   */
  closeQrModal = (toggleModal) => {
    this.props.hideModal();
    toggleModal();
  };

  /**
   * Opens QR code modal
   */
  openQrModal = () => {
    this.setState({ qrModalVisible: true });
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEvent(ANALYTICS_EVENT_OPTS.RECEIVE_OPTIONS_QR_CODE);
    });
  };

  onReceive = () => {
    this.props.togglePortfolioDappModal();
    this.props.navigation.navigate('PaymentRequestView', {
      screen: 'PaymentRequest',
    });
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEvent(
        ANALYTICS_EVENT_OPTS.RECEIVE_OPTIONS_PAYMENT_REQUEST,
      );
    });
  };

  render() {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <SafeAreaView style={styles.wrapper}>
        <ModalDragger />
        <BrowserTab
          id={0}
          key={`tab_portfolio_dapp`}
          initialUrl={'https://portfolio.metamask.io/'}
          updateTabInfo={() => null}
          showTabs={() => null}
          newTab={() => null}
          isAlwaysActive
          hideControls
          accountsAlwaysConnected
        />
      </SafeAreaView>
    );
  }
}

PortfolioDapp.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
  network: state.engine.backgroundState.NetworkController.network,
  ticker: state.engine.backgroundState.NetworkController.provider.ticker,
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  receiveAsset: state.modals.receiveAsset,
  seedphraseBackedUp: state.user.seedphraseBackedUp,
});

const mapDispatchToProps = (dispatch) => ({
  togglePortfolioDappModal: () => dispatch(togglePortfolioDappModal()),
  showAlert: (config) => dispatch(showAlert(config)),
  protectWalletModalVisible: () => dispatch(protectWalletModalVisible()),
});

export default connect(mapStateToProps, mapDispatchToProps)(PortfolioDapp);
