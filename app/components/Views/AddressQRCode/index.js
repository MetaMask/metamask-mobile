import React, { useCallback, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Dimensions,
  StyleSheet,
  View,
  Text } from 'react-native';
import TouchableOpacity from '../../Base/TouchableOpacity';
import { fontStyles } from '../../../styles/common';
import { useSelector, useDispatch } from 'react-redux';
import QRCode from 'react-native-qrcode-svg';
import { strings } from '../../../../locales/i18n';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import Device from '../../../util/device';
import { protectWalletModalVisible } from '../../../actions/user';
import ClipboardManager from '../../../core/ClipboardManager';
import { useTheme } from '../../../util/theme';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { isEthAddress } from '../../../util/address';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { IconName } from '../../../component-library/components/Icons/Icon';

const WIDTH = Dimensions.get('window').width - 88;

const createStyles = (theme) =>
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
      backgroundColor: theme.colors.background.default,
      borderRadius: 8,
    },
    qrCode: {
      padding: 8,
      backgroundColor: theme.brandColors.white,
    },
    addressWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      width: WIDTH,
      borderRadius: 8,
      backgroundColor: theme.colors.background.default,
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
      color: theme.colors.text.default,
    },
    address: {
      ...fontStyles.normal,
      paddingHorizontal: 28,
      paddingVertical: 4,
      fontSize: 16,
      textAlign: 'center',
      color: theme.colors.text.default,
    },
  });

/**
 * Functional component that renders a public address view
 */
const AddressQRCode = ({ closeQrModal }) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const dispatch = useDispatch();
  const { toastRef } = useContext(ToastContext);

  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const seedphraseBackedUp = useSelector(
    (state) => state.user.seedphraseBackedUp,
  );

  const handleProtectWalletModalVisible = useCallback(
    () => dispatch(protectWalletModalVisible()),
    [dispatch],
  );

  /**
   * Closes QR code modal
   */
  const handleCloseQrModal = useCallback(() => {
    closeQrModal();
    if (!seedphraseBackedUp) {
      setTimeout(() => handleProtectWalletModalVisible(), 1000);
    }
  }, [closeQrModal, seedphraseBackedUp, handleProtectWalletModalVisible]);

  const copyAccountToClipboard = useCallback(async () => {
    await ClipboardManager.setString(selectedAddress);
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.CheckBold,
      iconColor: colors.accent03.dark,
      backgroundColor: colors.accent03.normal,
      labelOptions: [
        { label: strings('account_details.account_copied_to_clipboard') },
      ],
      hasNoTimeout: false,
    });
  }, [colors.accent03.dark, colors.accent03.normal, selectedAddress, toastRef]);

  const processAddress = useCallback(() => {
    const processedAddress = `${selectedAddress.slice(0, 2)} ${selectedAddress
      .slice(2)
      .match(/.{1,4}/g)
      .join(' ')}`;
    return processedAddress;
  }, [selectedAddress]);

  const qrValue = isEthAddress(selectedAddress)
    ? `ethereum:${selectedAddress}`
    : selectedAddress;

  return (
    <View style={styles.root}>
      <View style={styles.wrapper}>
        <TouchableOpacity style={styles.closeIcon} onPress={handleCloseQrModal}>
          <IonicIcon name={'close'} size={38} color={colors.primary.inverse} />
        </TouchableOpacity>
        <View style={styles.qrCodeContainer}>
          <View style={styles.qrCode}>
            <QRCode
              value={qrValue}
              size={Dimensions.get('window').width - 160}
            />
          </View>
        </View>
        <View style={styles.addressWrapper}>
          <Text style={styles.addressTitle}>
            {strings('receive_request.public_address_qr_code')}
          </Text>
          <TouchableOpacity onPress={copyAccountToClipboard}>
            <Text style={styles.address}>{processAddress()}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

AddressQRCode.propTypes = {
  /**
   * Callback to close the modal
   */
  closeQrModal: PropTypes.func,
};

export default AddressQRCode;
