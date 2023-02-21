import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  InteractionManager,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StyleSheet,
  View,
  Alert,
} from 'react-native';
import Modal from 'react-native-modal';
import Share from 'react-native-share';
import QRCode from 'react-native-qrcode-svg';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import { connect } from 'react-redux';

import Analytics from '../../../core/Analytics/Analytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Logger from '../../../util/Logger';
import Device from '../../../util/device';
import { strings } from '../../../../locales/i18n';
import { generateUniversalLinkAddress } from '../../../util/payment-link-generator';
import { getTicker } from '../../../util/transactions';
import { allowedToBuy } from '../FiatOnRampAggregator';
import { showAlert } from '../../../actions/alert';
import { toggleReceiveModal } from '../../../actions/modals';
import { protectWalletModalVisible } from '../../../actions/user';

import { fontStyles, colors as importedColors } from '../../../styles/common';
import Text from '../../Base/Text';
import ModalHandler from '../../Base/ModalHandler';
import ModalDragger from '../../Base/ModalDragger';
import AddressQRCode from '../../Views/AddressQRCode';
import EthereumAddress from '../EthereumAddress';
import GlobalAlert from '../GlobalAlert';
import StyledButton from '../StyledButton';
import ClipboardManager from '../../../core/ClipboardManager';
import { ThemeContext, mockTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
    },
    body: {
      alignItems: 'center',
      paddingHorizontal: 15,
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
     * Action that toggles the receive modal
     */
    toggleReceiveModal: PropTypes.func,
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
     * Native asset ticker
     */
    ticker: PropTypes.string,
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
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEvent(MetaMetricsEvents.RECEIVE_OPTIONS_SHARE_ADDRESS);
    });
  };

  /**
   * Shows an alert message with a coming soon message
   */
  onBuy = async () => {
    const { navigation, toggleReceiveModal, network } = this.props;
    if (!allowedToBuy(network)) {
      Alert.alert(
        strings('fiat_on_ramp.network_not_supported'),
        strings('fiat_on_ramp.switch_network'),
      );
    } else {
      toggleReceiveModal();
      navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID);
      InteractionManager.runAfterInteractions(() => {
        Analytics.trackEventWithParameters(
          MetaMetricsEvents.BUY_BUTTON_CLICKED,
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
      Analytics.trackEvent(MetaMetricsEvents.RECEIVE_OPTIONS_QR_CODE);
    });
  };

  onReceive = () => {
    this.props.toggleReceiveModal();
    this.props.navigation.navigate('PaymentRequestView', {
      screen: 'PaymentRequest',
      params: { receiveAsset: this.props.receiveAsset },
    });
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEvent(MetaMetricsEvents.RECEIVE_OPTIONS_PAYMENT_REQUEST);
    });
  };

  render() {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <SafeAreaView style={styles.wrapper}>
        <ModalDragger />
        <View style={styles.titleWrapper}>
          <Text style={styles.title} testID={'receive-request-screen'}>
            {strings('receive_request.title')}
          </Text>
        </View>
        <View style={styles.body}>
          <ModalHandler>
            {({ isVisible, toggleModal }) => (
              <>
                <TouchableOpacity
                  style={styles.qrWrapper}
                  // eslint-disable-next-line react/jsx-no-bind
                  onPress={() => {
                    toggleModal();
                    InteractionManager.runAfterInteractions(() => {
                      Analytics.trackEvent(
                        MetaMetricsEvents.RECEIVE_OPTIONS_QR_CODE,
                      );
                    });
                  }}
                >
                  <QRCode
                    value={`ethereum:${this.props.selectedAddress}@${this.props.chainId}`}
                    size={Dimensions.get('window').width / 2}
                  />
                </TouchableOpacity>
                <Modal
                  isVisible={isVisible}
                  onBackdropPress={toggleModal}
                  onBackButtonPress={toggleModal}
                  onSwipeComplete={toggleModal}
                  swipeDirection={'down'}
                  propagateSwipe
                  testID={'qr-modal'}
                  backdropColor={colors.overlay.default}
                  backdropOpacity={1}
                >
                  <AddressQRCode
                    closeQrModal={() => this.closeQrModal(toggleModal)}
                  />
                </Modal>
              </>
            )}
          </ModalHandler>

          <Text>{strings('receive_request.scan_address')}</Text>

          <TouchableOpacity
            style={styles.addressWrapper}
            onPress={this.copyAccountToClipboard}
            testID={'account-address'}
          >
            <Text>
              <EthereumAddress
                address={this.props.selectedAddress}
                type={'short'}
              />
            </Text>
            <Text style={styles.copyButton} small>
              {strings('receive_request.copy')}
            </Text>
            <TouchableOpacity onPress={this.onShare}>
              <EvilIcons
                name={Device.isIos() ? 'share-apple' : 'share-google'}
                size={25}
                color={colors.primary.default}
              />
            </TouchableOpacity>
          </TouchableOpacity>
          <View style={styles.actionRow}>
            {allowedToBuy(this.props.network) && (
              <StyledButton
                type={'blue'}
                containerStyle={styles.actionButton}
                onPress={this.onBuy}
              >
                {strings('fiat_on_ramp.buy', {
                  ticker: getTicker(this.props.ticker),
                })}
              </StyledButton>
            )}
            <StyledButton
              type={'normal'}
              onPress={this.onReceive}
              containerStyle={styles.actionButton}
              testID={'request-payment-button'}
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
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
  network: state.engine.backgroundState.NetworkController.network,
  ticker: state.engine.backgroundState.NetworkController.provider.ticker,
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  receiveAsset: state.modals.receiveAsset,
  seedphraseBackedUp: state.user.seedphraseBackedUp,
});

const mapDispatchToProps = (dispatch) => ({
  toggleReceiveModal: () => dispatch(toggleReceiveModal()),
  showAlert: (config) => dispatch(showAlert(config)),
  protectWalletModalVisible: () => dispatch(protectWalletModalVisible()),
});

export default connect(mapStateToProps, mapDispatchToProps)(ReceiveRequest);
