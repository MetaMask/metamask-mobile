import React, { PureComponent } from 'react';
import {
  Dimensions,
  SafeAreaView,
  View,
  ScrollView,
  Text,
  StyleSheet,
  InteractionManager,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { connect } from 'react-redux';
import { fontStyles, colors as importedColors } from '../../../styles/common';
import { getPaymentRequestSuccessOptionsTitle } from '../../UI/Navbar';
import PropTypes from 'prop-types';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import StyledButton from '../StyledButton';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { showAlert } from '../../../actions/alert';
import Logger from '../../../util/Logger';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import Modal from 'react-native-modal';
import QRCode from 'react-native-qrcode-svg';
import { renderNumber } from '../../../util/number';
import Device from '../../../util/device';
import { strings } from '../../../../locales/i18n';
import { protectWalletModalVisible } from '../../../actions/user';
import ClipboardManager from '../../../core/ClipboardManager';
import { ThemeContext, mockTheme } from '../../../util/theme';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { PAYMENT_REQUEST_QR_CODE_CLOSE_ICON } from '../../../../wdio/screen-objects/testIDs/Screens/RequestToken.testIds';

const isIos = Device.isIos();

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    contentWrapper: {
      padding: 24,
    },
    button: {
      marginBottom: 16,
    },
    titleText: {
      ...fontStyles.bold,
      fontSize: 24,
      marginVertical: 16,
      alignSelf: 'center',
      color: colors.text.default,
    },
    descriptionText: {
      ...fontStyles.normal,
      fontSize: 14,
      alignSelf: 'center',
      textAlign: 'center',
      marginVertical: 8,
      color: colors.text.default,
    },
    linkText: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.primary.default,
      alignSelf: 'center',
      textAlign: 'center',
      marginVertical: 16,
    },
    buttonsWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignSelf: 'center',
    },
    buttonsContainer: {
      flex: 1,
      flexDirection: 'column',
      alignSelf: 'flex-end',
    },
    scrollViewContainer: {
      flexGrow: 1,
    },
    icon: {
      color: colors.primary.default,
      marginBottom: 16,
    },
    blueIcon: {
      color: colors.primary.inverse,
    },
    iconWrapper: {
      alignItems: 'center',
    },
    buttonText: {
      ...fontStyles.bold,
      color: colors.primary.default,
      fontSize: 14,
      marginLeft: 8,
    },
    blueButtonText: {
      ...fontStyles.bold,
      color: colors.primary.inverse,
      fontSize: 14,
      marginLeft: 8,
    },
    buttonContent: {
      flexDirection: 'row',
      alignSelf: 'center',
    },
    buttonIconWrapper: {
      flexDirection: 'column',
      alignSelf: 'center',
    },
    buttonTextWrapper: {
      flexDirection: 'column',
      alignSelf: 'center',
    },
    detailsWrapper: {
      padding: 10,
      alignItems: 'center',
    },
    addressTitle: {
      fontSize: 16,
      ...fontStyles.normal,
      color: colors.text.default,
    },
    informationWrapper: {
      paddingHorizontal: 40,
    },
    linkWrapper: {
      paddingHorizontal: 24,
    },
    titleQr: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: isIos ? 8 : 10,
    },
    closeIcon: {
      right: isIos ? -20 : -40,
      alignItems: 'center',
      paddingHorizontal: 10,
    },
    qrCode: {
      marginBottom: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 36,
      paddingBottom: 24,
      paddingTop: 16,
      backgroundColor: colors.background.default,
      borderRadius: 8,
    },
    qrCodeWrapper: {
      marginVertical: 8,
      padding: 8,
      backgroundColor: importedColors.white,
    },
  });

/**
 * View to interact with a previously generated payment request link
 */
class PaymentRequestSuccess extends PureComponent {
  static propTypes = {
    /**
     * Navigation object
     */
    navigation: PropTypes.object,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
    /**
    /* Triggers global alert
    */
    showAlert: PropTypes.func,
    /**
    /* Prompts protect wallet modal
    */
    protectWalletModalVisible: PropTypes.func,
  };

  state = {
    link: '',
    qrLink: '',
    amount: '',
    symbol: '',
    qrModalVisible: false,
  };

  updateNavBar = () => {
    const { navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getPaymentRequestSuccessOptionsTitle(navigation, colors),
    );
  };

  /**
   * Sets payment request link, amount and symbol of the asset to state
   */
  componentDidMount = () => {
    const { route } = this.props;
    this.updateNavBar();
    const link = route?.params?.link ?? '';
    const qrLink = route?.params?.qrLink ?? '';
    const amount = route?.params?.amount ?? '';
    const symbol = route?.params?.symbol ?? '';
    this.setState({ link, qrLink, amount, symbol });
  };

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  componentWillUnmount = () => {
    this.props.protectWalletModalVisible();
  };

  /**
   * Copies payment request link to clipboard
   */
  copyAccountToClipboard = async () => {
    const { link } = this.state;
    await ClipboardManager.setString(link);
    InteractionManager.runAfterInteractions(() => {
      this.props.showAlert({
        isVisible: true,
        autodismiss: 1500,
        content: 'clipboard-alert',
        data: { msg: strings('payment_request.link_copied') },
      });
    });
  };

  /**
   * Shows share native UI
   */
  onShare = () => {
    const { link } = this.state;
    Share.open({
      message: link,
    }).catch((err) => {
      Logger.log('Error while trying to share payment request', err);
    });
  };

  /**
   * Toggles payment request QR code modal on top
   */
  showQRModal = () => {
    this.setState({ qrModalVisible: true });
  };

  /**
   * Closes payment request QR code modal
   */
  closeQRModal = () => {
    this.setState({ qrModalVisible: false });
  };

  render() {
    const { link, amount, symbol, qrModalVisible } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <SafeAreaView style={styles.wrapper} testID={'send-link-screen'}>
        <ScrollView
          style={styles.contentWrapper}
          contentContainerStyle={styles.scrollViewContainer}
        >
          <View style={styles.iconWrapper}>
            <EvilIcons name="share-apple" size={54} style={styles.icon} />
          </View>
          <View style={styles.informationWrapper}>
            <Text style={styles.titleText}>
              {strings('payment_request.send_link')}
            </Text>
            <Text style={styles.descriptionText}>
              {strings('payment_request.description_1')}
            </Text>
            <Text style={styles.descriptionText}>
              {strings('payment_request.description_2')}
              <Text style={fontStyles.bold}>
                {' ' + renderNumber(amount) + ' ' + symbol}
              </Text>
            </Text>
          </View>
          <View style={styles.linkWrapper}>
            <Text style={styles.linkText}>{link}</Text>
          </View>

          <View style={styles.buttonsWrapper}>
            <View style={styles.buttonsContainer}>
              <StyledButton
                type={'normal'}
                onPress={this.copyAccountToClipboard}
                containerStyle={styles.button}
              >
                <View style={styles.buttonContent}>
                  <View style={styles.buttonIconWrapper}>
                    <IonicIcon
                      name={'ios-link'}
                      size={18}
                      color={colors.primary.default}
                    />
                  </View>
                  <View style={styles.buttonTextWrapper}>
                    <Text style={styles.buttonText}>
                      {strings('payment_request.copy_to_clipboard')}
                    </Text>
                  </View>
                </View>
              </StyledButton>
              <StyledButton
                type={'normal'}
                onPress={this.showQRModal}
                containerStyle={styles.button}
                testID={'request-qrcode-button'}
              >
                <View style={styles.buttonContent}>
                  <View style={styles.buttonIconWrapper}>
                    <FontAwesome
                      name={'qrcode'}
                      size={18}
                      color={colors.primary.default}
                    />
                  </View>
                  <View style={styles.buttonTextWrapper}>
                    <Text style={styles.buttonText}>
                      {strings('payment_request.qr_code')}
                    </Text>
                  </View>
                </View>
              </StyledButton>
              <StyledButton
                type={'blue'}
                onPress={this.onShare}
                containerStyle={styles.button}
              >
                <View style={styles.buttonContent}>
                  <View style={styles.buttonIconWrapper}>
                    <EvilIcons
                      name="share-apple"
                      size={24}
                      style={styles.blueIcon}
                    />
                  </View>
                  <View style={styles.buttonTextWrapper}>
                    <Text style={styles.blueButtonText}>
                      {strings('payment_request.send_link')}
                    </Text>
                  </View>
                </View>
              </StyledButton>
            </View>
          </View>
        </ScrollView>
        <Modal
          isVisible={qrModalVisible}
          onBackdropPress={this.closeQRModal}
          onBackButtonPress={this.closeQRModal}
          onSwipeComplete={this.closeQRModal}
          swipeDirection={'down'}
          propagateSwipe
          backdropColor={colors.overlay.default}
          backdropOpacity={1}
        >
          <View style={styles.detailsWrapper}>
            <View style={styles.qrCode} testID={'payment-request-qrcode'}>
              <View style={styles.titleQr}>
                <Text style={styles.addressTitle}>
                  {strings('payment_request.request_qr_code')}
                </Text>

                <TouchableOpacity
                  style={styles.closeIcon}
                  onPress={this.closeQRModal}
                  {...generateTestId(
                    Platform,
                    PAYMENT_REQUEST_QR_CODE_CLOSE_ICON,
                  )}
                >
                  <IonicIcon
                    name={'ios-close'}
                    size={28}
                    color={colors.text.default}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.qrCodeWrapper}>
                <QRCode
                  value={this.state.qrLink}
                  size={Dimensions.get('window').width - 160}
                />
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }
}

PaymentRequestSuccess.contextType = ThemeContext;

const mapDispatchToProps = (dispatch) => ({
  showAlert: (config) => dispatch(showAlert(config)),
  protectWalletModalVisible: () => dispatch(protectWalletModalVisible()),
});

export default connect(null, mapDispatchToProps)(PaymentRequestSuccess);
