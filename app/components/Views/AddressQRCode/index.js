import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
  View,
} from 'react-native';
import { colors as importedColors } from '../../../styles/common';
import { connect } from 'react-redux';
import QRCode from 'react-native-qrcode-svg';
import { strings } from '../../../../locales/i18n';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { showAlert } from '../../../actions/alert';
import GlobalAlert from '../../UI/GlobalAlert';
import { protectWalletModalVisible } from '../../../actions/user';
import ClipboardManager from '../../../core/ClipboardManager';
import Text from '../../Base/Text';
import { useTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qrCodeContainer: {
      padding: 28,
      backgroundColor: colors.background.default,
      borderRadius: 8,
      marginVertical: 16,
    },
    qrCode: {
      padding: 8,
      backgroundColor: importedColors.white,
    },
    addressWrapper: {
      borderRadius: 8,
      backgroundColor: colors.background.default,
      padding: 12,
    },
    closeIcon: {
      alignItems: 'flex-end',
    },
  });

/**
 * Component that renders a public address view
 */
function AddressQRCode({
  closeQrModal,
  seedphraseBackedUp,
  protectWalletModalVisible,
  selectedAddress,
  showAlert,
}) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const contentStyle = useMemo(() => {
    const isPortrait = windowHeight > windowWidth;
    if (isPortrait) {
      return {
        size: Math.min(windowWidth - 160, 420),
      };
    }
    return {
      size: 420,
    };
  }, [windowWidth, windowHeight]);
  /**
   * Closes QR code modal
   */
  const closeModal = useCallback(() => {
    closeQrModal();
    !seedphraseBackedUp && setTimeout(() => protectWalletModalVisible(), 1000);
  }, [closeQrModal, protectWalletModalVisible, seedphraseBackedUp]);

  const copyAccountToClipboard = useCallback(async () => {
    await ClipboardManager.setString(selectedAddress);
    showAlert({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: { msg: strings('account_details.account_copied_to_clipboard') },
    });
  }, [selectedAddress, showAlert]);

  const address = useMemo(
    () =>
      `${selectedAddress.slice(0, 2)} ${selectedAddress
        .slice(2)
        .match(/.{1,4}/g)
        .join(' ')}`,
    [selectedAddress],
  );

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[
          styles.closeIcon,
          {
            width:
              contentStyle.size +
              (styles.qrCode.padding + styles.qrCodeContainer.padding) * 2,
          },
        ]}
        onPress={closeModal}
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
            value={`ethereum:${selectedAddress}`}
            size={contentStyle.size}
          />
        </View>
      </View>
      <View
        style={[styles.addressWrapper, { width: contentStyle.size + 36 * 2 }]}
      >
        <Text big black centered>
          {strings('receive_request.public_address_qr_code')}
        </Text>
        <TouchableOpacity onPress={copyAccountToClipboard}>
          <Text big black centered testID={'public-address-input'}>
            {address}
          </Text>
        </TouchableOpacity>
      </View>
      <GlobalAlert />
    </View>
  );
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

AddressQRCode.propTypes = {
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

export default connect(mapStateToProps, mapDispatchToProps)(AddressQRCode);
