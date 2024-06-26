import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { SafeAreaView, Dimensions, StyleSheet, View } from 'react-native';
import Share from 'react-native-share';
import QRCode from 'react-native-qrcode-svg';
import { connect } from 'react-redux';

import { MetaMetricsEvents } from '../../../core/Analytics';
import Logger from '../../../util/Logger';
import { strings } from '../../../../locales/i18n';
import { generateUniversalLinkAddress } from '../../../util/payment-link-generator';
import { showAlert } from '../../../actions/alert';
import { protectWalletModalVisible } from '../../../actions/user';

import { fontStyles } from '../../../styles/common';
import GlobalAlert from '../GlobalAlert';
import StyledButton from '../StyledButton';
import ClipboardManager from '../../../core/ClipboardManager';
import { ThemeContext, mockTheme } from '../../../util/theme';
import {
  selectChainId,
  selectTicker,
} from '../../../selectors/networkController';
import { isNetworkRampSupported } from '../Ramp/utils';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../selectors/accountsController';
import { getRampNetworks } from '../../../reducers/fiatOrders';
import { RequestPaymentModalSelectorsIDs } from '../../../../e2e/selectors/Modals/RequestPaymentModal.selectors';
import { withMetricsAwareness } from '../../../components/hooks/useMetrics';
import QRAccountDisplay from '../../Views/QRAccountDisplay';
import PNG_MM_LOGO_PATH from '../../../images/fox.png';

const createStyles = (theme) => {
  const { height: windowHeight } = Dimensions.get('window');

  return StyleSheet.create({
    wrapper: {
      backgroundColor: theme.colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      marginTop: 180,
      height: windowHeight - 180,
    },
    body: {
      alignItems: 'center',
      paddingHorizontal: 15,
      height: '100%',
      width: '100%',
      display: 'flex',
      justifyContent: 'space-around',
    },
    qrWrapper: {
      margin: 8,
      padding: 8,
      backgroundColor: theme.brandColors.white,
    },
    addressWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: 15,
      padding: 9,
      paddingHorizontal: 15,
      backgroundColor: theme.colors.background.alternative,
      borderRadius: 30,
    },
    copyButton: {
      backgroundColor: theme.colors.background.default,
      color: theme.colors.primary.default,
      borderRadius: 12,
      overflow: 'hidden',
      paddingVertical: 3,
      paddingHorizontal: 6,
      marginHorizontal: 6,
      borderWidth: 1,
      borderColor: theme.colors.primary.default,
    },
    actionRow: {
      flexDirection: 'row',
      marginBottom: 15,
    },
    actionButton: {
      flex: 1,
      marginHorizontal: 8,
      width: '100%',
    },
    title: {
      ...fontStyles.normal,
      color: theme.colors.text.default,
      fontSize: 18,
      flexDirection: 'row',
      alignSelf: 'center',
    },
    titleWrapper: {
      marginTop: 10,
    },
  });
};

/**
 * PureComponent that renders receive options
 */
class ReceiveRequest extends PureComponent {
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
    receiveAsset: PropTypes.object,
    /**
     /* Triggers global alert
     */
    showAlert: PropTypes.func,
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
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
  };

  state = {
    qrModalVisible: false,
    buyModalVisible: false,
  };

  /**
   * Share current account public address
   */
  onShare = () => {
    const { selectedAddress } = this.props;
    Share.open({
      message: generateUniversalLinkAddress(selectedAddress),
    })
      .then(() => {
        this.props.hideModal();
        setTimeout(() => this.props.protectWalletModalVisible(), 1000);
      })
      .catch((err) => {
        Logger.log('Error while trying to share address', err);
      });

    this.props.metrics.trackEvent(
      MetaMetricsEvents.RECEIVE_OPTIONS_SHARE_ADDRESS,
    );
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

    this.props.metrics.trackEvent(MetaMetricsEvents.RECEIVE_OPTIONS_QR_CODE);
  };

  onReceive = () => {
    this.props.navigation.navigate('PaymentRequestView', {
      screen: 'PaymentRequest',
      params: { receiveAsset: this.props.receiveAsset },
    });

    this.props.metrics.trackEvent(
      MetaMetricsEvents.RECEIVE_OPTIONS_PAYMENT_REQUEST,
    );
  };

  render() {
    const theme = this.context || mockTheme;
    const styles = createStyles(theme);

    return (
      <SafeAreaView style={styles.wrapper}>
        <View style={styles.body}>
          <QRCode
            logo={PNG_MM_LOGO_PATH}
            logoSize={55}
            logoMargin={10}
            value={`ethereum:${this.props.selectedAddress}@${this.props.chainId}`}
            size={Dimensions.get('window').width / 2}
          />

          <QRAccountDisplay accountAddress={this.props.selectedAddress} />

          <View style={styles.actionRow}>
            <StyledButton
              type={'normal'}
              onPress={this.onReceive}
              containerStyle={styles.actionButton}
              testID={RequestPaymentModalSelectorsIDs.REQUEST_BUTTON}
            >
              {strings('receive_request.request_payment')}
            </StyledButton>
          </View>
        </View>

        <GlobalAlert />
      </SafeAreaView>
    );
  }
}

ReceiveRequest.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  chainId: selectChainId(state),
  ticker: selectTicker(state),
  selectedAddress: selectSelectedInternalAccountChecksummedAddress(state),
  receiveAsset: state.modals.receiveAsset,
  seedphraseBackedUp: state.user.seedphraseBackedUp,
  isNetworkBuySupported: isNetworkRampSupported(
    selectChainId(state),
    getRampNetworks(state),
  ),
});

const mapDispatchToProps = (dispatch) => ({
  showAlert: (config) => dispatch(showAlert(config)),
  protectWalletModalVisible: () => dispatch(protectWalletModalVisible()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withMetricsAwareness(ReceiveRequest));
