import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { fontStyles, colors as importedColors } from '../../../styles/common';
import { connect } from 'react-redux';
import QRCode from 'react-native-qrcode-svg';
import { strings } from '../../../../locales/i18n';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import Device from '../../../util/device';
import { showAlert } from '../../../actions/alert';
import GlobalAlert from '../../UI/GlobalAlert';
import { protectWalletModalVisible } from '../../../actions/user';
import ClipboardManager from '../../../core/ClipboardManager';
import { ThemeContext, mockTheme } from '../../../util/theme';

const WIDTH = Dimensions.get('window').width - 88;

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Device.isSmallDevice() ? -30 : -50,
    },
    wrapper: {
      flex: 1,
      alignItems: 'center',
    },
    qrCodeContainer: {
      marginBottom: 16,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
      backgroundColor: colors.background.default,
      borderRadius: 8,
    },
    qrCode: {
      padding: 8,
      backgroundColor: importedColors.white,
    },
    addressWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      width: WIDTH,
      borderRadius: 8,
      backgroundColor: colors.background.default,
      paddingVertical: 12,
    },
    closeIcon: {
      width: WIDTH + 40,
      paddingBottom: Device.isSmallDevice() ? 30 : 50,
      flexDirection: 'row-reverse',
    },
    addressTitle: {
      fontSize: 16,
      paddingHorizontal: 28,
      paddingVertical: 4,
      ...fontStyles.normal,
      color: colors.text.default,
    },
    address: {
      ...fontStyles.normal,
      paddingHorizontal: 28,
      paddingVertical: 4,
      fontSize: 16,
      textAlign: 'center',
      color: colors.text.default,
    },
  });

/**
 * PureComponent that renders a public address view
 */
class AddressQRCode extends PureComponent {
  static propTypes = {
    /**
     * Selected address as string
     */
    selectedAddress: PropTypes.string,
    /**
    /* Triggers global alert
    */
    showAlert: PropTypes.func,
    /**
    /* Callback to close the modal
    */
    closeQrModal: PropTypes.func,
    /**
     * Prompts protect wallet modal
     */
    protectWalletModalVisible: PropTypes.func,
    /**
     * redux flag that indicates if the user
     * completed the seed phrase backup flow
     */
    seedphraseBackedUp: PropTypes.bool,
  };

  /**
   * Closes QR code modal
   */
  closeQrModal = () => {
    this.props.closeQrModal();
    !this.props.seedphraseBackedUp &&
      setTimeout(() => this.props.protectWalletModalVisible(), 1000);
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
  };

  processAddress = () => {
    const { selectedAddress } = this.props;
    const processedAddress = `${selectedAddress.slice(0, 2)} ${selectedAddress
      .slice(2)
      .match(/.{1,4}/g)
      .join(' ')}`;
    return processedAddress;
  };

  render() {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.root}>
        <View style={styles.wrapper}>
          <TouchableOpacity
            style={styles.closeIcon}
            onPress={this.closeQrModal}
            testID={'close-qr-modal'}
          >
            <IonicIcon
              name={'ios-close'}
              size={38}
              color={colors.overlay.inverse}
            />
          </TouchableOpacity>
          <View style={styles.qrCodeContainer}>
            <View style={styles.qrCode}>
              <QRCode
                value={`ethereum:${this.props.selectedAddress}`}
                size={Dimensions.get('window').width - 160}
              />
            </View>
          </View>
          <View style={styles.addressWrapper}>
            <Text style={styles.addressTitle}>
              {strings('receive_request.public_address_qr_code')}
            </Text>
            <TouchableOpacity onPress={this.copyAccountToClipboard}>
              <Text style={styles.address} testID={'public-address-input'}>
                {this.processAddress()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <GlobalAlert />
      </View>
    );
  }
}

const mapStateToProps = (state) => ({
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  seedphraseBackedUp: state.user.seedphraseBackedUp,
});

const mapDispatchToProps = (dispatch) => ({
  showAlert: (config) => dispatch(showAlert(config)),
  protectWalletModalVisible: () => dispatch(protectWalletModalVisible()),
});

AddressQRCode.contextType = ThemeContext;

export default connect(mapStateToProps, mapDispatchToProps)(AddressQRCode);
