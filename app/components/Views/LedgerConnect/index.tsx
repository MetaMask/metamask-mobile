import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Device as LedgerDevice } from '@ledgerhq/react-native-hw-transport-ble/lib/types';
import { useDispatch } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import StyledButton from '../../../components/UI/StyledButton';
import Text from '../../../components/Base/Text';
import {
  mockTheme,
  useAppThemeFromContext,
  useAssetFromTheme,
} from '../../../util/theme';
import Device from '../../../util/device';
import Scan from './Scan';
import { showSimpleNotification } from '../../../actions/notification';
import LedgerConnectionError, {
  LedgerConnectionErrorProps,
} from './LedgerConnectionError';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { LEDGER_SUPPORT_LINK } from '../../../constants/urls';

import ledgerDeviceDarkImage from '../../../images/ledger-device-dark.png';
import ledgerDeviceLightImage from '../../../images/ledger-device-light.png';
import ledgerConnectLightImage from '../../../images/ledger-connect-light.png';
import ledgerConnectDarkImage from '../../../images/ledger-connect-dark.png';
import { getSystemVersion } from 'react-native-device-info';
import { LedgerCommunicationErrors } from '../../../core/Ledger/ledgerErrors';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import createStyles from './index.styles';
import { BluetoothInterface } from '../../hooks/Ledger/useBluetoothDevices';

interface LedgerConnectProps {
  onConnectLedger: () => void;
  isSendingLedgerCommands: boolean;
  isAppLaunchConfirmationNeeded: boolean;
  ledgerLogicToRun: (
    func: (transport: BluetoothInterface) => Promise<void>,
  ) => Promise<void>;
  ledgerError: LedgerCommunicationErrors | undefined;
  selectedDevice: LedgerDevice;
  setSelectedDevice: (device: LedgerDevice) => void;
}

const LedgerConnect = ({
  onConnectLedger,
  isSendingLedgerCommands,
  isAppLaunchConfirmationNeeded,
  ledgerLogicToRun,
  ledgerError,
  selectedDevice,
  setSelectedDevice,
}: LedgerConnectProps) => {
  const theme = useAppThemeFromContext() ?? mockTheme;
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [errorDetail, setErrorDetails] = useState<LedgerConnectionErrorProps>();
  const [loading, setLoading] = useState(false);
  const [retryTimes, setRetryTimes] = useState(0);
  const dispatch = useDispatch();

  const deviceOSVersion = Number(getSystemVersion()) || 0;

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle('', navigation, true, theme.colors),
    );
  }, [navigation, theme.colors]);

  const connectLedger = () => {
    setLoading(true);
    ledgerLogicToRun(async () => {
      onConnectLedger();
    });
  };

  const handleErrorWithRetry = (errorTitle: string, errorSubtitle: string) => {
    setErrorDetails({
      errorTitle,
      errorSubtitle,
      primaryButtonConfig: {
        title: strings('ledger.retry'),
        onPress: () => {
          setErrorDetails(undefined);
          connectLedger();
        },
      },
    });
  };

  const permissionText = useMemo(() => {
    if (deviceOSVersion >= 12) {
      return strings('ledger.ledger_reminder_message_step_four_Androidv12plus');
    }
    return strings('ledger.ledger_reminder_message_step_four');
  }, [deviceOSVersion]);

  const openHowToInstallEthApp = () => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: LEDGER_SUPPORT_LINK,
        title: strings('ledger.how_to_install_eth_webview_title'),
      },
    });
  };

  useEffect(() => {
    if (ledgerError) {
      setLoading(false);
      switch (ledgerError) {
        case LedgerCommunicationErrors.FailedToOpenApp:
          handleErrorWithRetry(
            strings('ledger.failed_to_open_eth_app'),
            strings('ledger.ethereum_app_open_error'),
          );
          break;
        case LedgerCommunicationErrors.FailedToCloseApp:
          handleErrorWithRetry(
            strings('ledger.running_app_close'),
            strings('ledger.running_app_close_error'),
          );
          break;
        case LedgerCommunicationErrors.AppIsNotInstalled:
          handleErrorWithRetry(
            strings('ledger.ethereum_app_not_installed'),
            strings('ledger.ethereum_app_not_installed_error'),
          );

          break;
        case LedgerCommunicationErrors.UserRefusedConfirmation:
          navigation.navigate('SelectHardwareWallet');
          break;
        case LedgerCommunicationErrors.LedgerIsLocked:
          handleErrorWithRetry(
            strings('ledger.ledger_is_locked'),
            strings('ledger.unlock_ledger_message'),
          );
          break;
        case LedgerCommunicationErrors.UnknownError:
        case LedgerCommunicationErrors.LedgerDisconnected:
          if (retryTimes < 3) {
            setRetryTimes(retryTimes + 1);
          } else {
            handleErrorWithRetry(
              strings('ledger.error_during_connection'),
              strings('ledger.error_during_connection_message'),
            );
          }
          break;
        default: {
          dispatch(
            showSimpleNotification({
              autodismiss: false,
              title: strings('ledger.toast_bluetooth_connection_error_title'),
              description: strings(
                'ledger.toast_bluetooth_connection_error_subtitle',
              ),
              id: 'ledger_bluetooth_disconnect_toast_message',
              status: 'error',
            }),
          );
          navigation.navigate('SelectHardwareWallet');
          break;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerError]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.connectLedgerWrapper}>
        <View style={styles.header}>
          <Image
            source={useAssetFromTheme(
              ledgerDeviceLightImage,
              ledgerDeviceDarkImage,
            )}
            style={styles.ledgerImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            onPress={navigation.goBack}
            style={styles.navbarRightButton}
          >
            <MaterialIcon name="close" size={15} style={styles.closeIcon} />
          </TouchableOpacity>
        </View>
        <Text bold style={styles.connectLedgerText}>
          {strings('ledger.connect_ledger')}
        </Text>
        <View style={styles.imageContainer}>
          <Image
            source={useAssetFromTheme(
              ledgerConnectLightImage,
              ledgerConnectDarkImage,
            )}
            style={styles.coverImage}
          />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.lookingForDeviceContainer}>
            <Text style={styles.lookingForDeviceText} bold>
              {!isAppLaunchConfirmationNeeded
                ? strings('ledger.looking_for_device')
                : strings('ledger.open_eth_app')}
            </Text>
            {!selectedDevice && (
              <ActivityIndicator style={styles.activityIndicatorStyle} />
            )}
          </View>
          {!isAppLaunchConfirmationNeeded ? (
            <>
              <Text style={styles.instructionsText}>
                {strings('ledger.ledger_reminder_message')}
              </Text>
              <Text style={styles.ledgerInstructionText}>
                {strings('ledger.ledger_reminder_message_step_one')}
              </Text>
              <Text style={styles.ledgerInstructionText}>
                {strings('ledger.ledger_reminder_message_step_two')}
              </Text>
              <Text style={styles.ledgerInstructionText}>
                {strings('ledger.ledger_reminder_message_step_three')}
              </Text>
              {Device.isAndroid() && (
                <Text style={styles.ledgerInstructionText}>
                  {permissionText}
                </Text>
              )}
              <Text style={styles.ledgerInstructionText}>
                {strings('ledger.ledger_reminder_message_step_five')}
              </Text>
              <Text
                style={styles.howToInstallEthAppText}
                bold
                big
                link
                onPress={openHowToInstallEthApp}
              >
                {strings('ledger.how_to_install_eth_app')}
              </Text>
            </>
          ) : (
            <Text style={styles.openEthAppMessage}>
              <Text>{strings('ledger.open_eth_app_message_one')}</Text>
              <Text bold>{strings('ledger.open_eth_app_message_two')} </Text>
            </Text>
          )}
        </View>
        <View style={styles.bodyContainer}>
          {!isAppLaunchConfirmationNeeded ? (
            <Scan
              onDeviceSelected={(ledgerDevice) =>
                setSelectedDevice(ledgerDevice)
              }
              onScanningErrorStateChanged={(error) => setErrorDetails(error)}
              ledgerError={ledgerError}
            />
          ) : null}
          {selectedDevice && !isAppLaunchConfirmationNeeded ? (
            <View style={styles.buttonContainer}>
              <StyledButton
                type="confirm"
                onPress={connectLedger}
                testID={'add-network-button'}
                disabled={loading || isSendingLedgerCommands}
              >
                {loading || isSendingLedgerCommands ? (
                  <ActivityIndicator color={styles.loader.color} />
                ) : ledgerError ? (
                  strings('ledger.retry')
                ) : (
                  strings('ledger.continue')
                )}
              </StyledButton>
            </View>
          ) : null}
        </View>
      </View>
      {errorDetail && <LedgerConnectionError {...errorDetail} />}
    </SafeAreaView>
  );
};

export default React.memo(LedgerConnect);
