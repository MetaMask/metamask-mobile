/**
 * Hardware Wallet Error Modal
 *
 * A shared error modal component that displays errors from any hardware wallet
 * and provides recovery options.
 */

import React, { useMemo, useCallback } from 'react';
import { View, Image, StyleSheet, Linking } from 'react-native';
import { useAssetFromTheme } from '../../../util/theme';
import Device from '../../../util/device';
import { strings } from '../../../../locales/i18n';
import Text from '../../../components/Base/Text';
import StyledButton from '../../../components/UI/StyledButton';
import { useHardwareWallet } from '../context/useHardwareWallet';
import { ConnectionStatus, HardwareWalletType, isErrorState } from '../types';

// Images
import ledgerConnectErrorDarkImage from '../../../images/ledger-connect-error-dark.png';
import ledgerConnectErrorLightImage from '../../../images/ledger-connect-error-light.png';

const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 35,
      paddingHorizontal: 20,
    },
    imageStyle: {
      height: 54,
      overflow: 'visible',
    },
    textContainer: {
      alignItems: 'center',
      marginTop: 20,
    },
    titleText: {
      fontSize: 22,
      textAlign: 'center',
    },
    subtitleText: {
      marginTop: 20,
      textAlign: 'center',
    },
    buttonContainer: {
      width: '100%',
      marginTop: 'auto',
      paddingBottom: 20,
    },
    buttonStyle: {
      marginTop: 10,
    },
  });

interface HardwareWalletErrorModalProps {
  /**
   * Callback when user dismisses the error (reject/cancel)
   */
  onDismiss?: () => void;
}

/**
 * Get the appropriate error image based on wallet type and theme
 */
const useErrorImage = (walletType: HardwareWalletType | null) => {
  // For now, we use Ledger images for all types
  // Add Trezor/QR images when available
  const ledgerImage = useAssetFromTheme(
    ledgerConnectErrorLightImage,
    ledgerConnectErrorDarkImage,
  );

  switch (walletType) {
    case HardwareWalletType.TREZOR:
      // TODO: Add Trezor error images
      return ledgerImage;
    case HardwareWalletType.QR:
      // TODO: Add QR error images
      return ledgerImage;
    case HardwareWalletType.LEDGER:
    default:
      return ledgerImage;
  }
};

const HardwareWalletErrorModal: React.FC<HardwareWalletErrorModalProps> = ({
  onDismiss,
}) => {
  const styles = useMemo(() => createStyles(), []);
  const { walletType, connectionState, retry, clearError } =
    useHardwareWallet();

  const errorImage = useErrorImage(walletType);

  const handleViewSettings = useCallback(async () => {
    if (Device.isIos()) {
      await Linking.openURL('App-Prefs:Bluetooth');
    } else {
      await Linking.openSettings();
    }
  }, []);

  const handleRetry = useCallback(async () => {
    await retry();
  }, [retry]);

  const handleDismiss = useCallback(() => {
    clearError();
    onDismiss?.();
  }, [clearError, onDismiss]);

  // Don't render if there's no error
  if (
    connectionState.status !== ConnectionStatus.ERROR ||
    !isErrorState(connectionState)
  ) {
    return null;
  }

  const error = connectionState.error;
  if (!error) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Image
        source={errorImage}
        style={styles.imageStyle}
        resizeMode="contain"
      />

      <View style={styles.textContainer}>
        <Text big bold style={styles.titleText}>
          {error.title}
        </Text>
        <Text style={styles.subtitleText}>{error.subtitle}</Text>
      </View>

      <View style={styles.buttonContainer}>
        {error.showSettings && (
          <View style={styles.buttonStyle}>
            <StyledButton type="confirm" onPress={handleViewSettings}>
              {strings('ledger.view_settings')}
            </StyledButton>
          </View>
        )}

        {error.isRetryable && (
          <View style={styles.buttonStyle}>
            <StyledButton type="normal" onPress={handleRetry}>
              {strings('ledger.try_again')}
            </StyledButton>
          </View>
        )}

        <View style={styles.buttonStyle}>
          <StyledButton type="cancel" onPress={handleDismiss}>
            {strings('transaction.reject')}
          </StyledButton>
        </View>
      </View>
    </View>
  );
};

export default React.memo(HardwareWalletErrorModal);
