import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  SafeAreaView,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Device as NanoDevice } from '@ledgerhq/react-native-hw-transport-ble/lib/types';
import { useDispatch } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import StyledButton from '../../../components/UI/StyledButton';
import Text from '../../../components/Base/Text';
import {
  mockTheme,
  useAppThemeFromContext,
  useAssetFromTheme,
} from '../../../util/theme';
import Device from '../../../util/device';
import { fontStyles } from '../../../styles/common';
import Scan from './Scan';
import useLedgerBluetooth from '../../hooks/Ledger/useLedgerBluetooth';
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

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      position: 'relative',
      flex: 1,
      backgroundColor: theme.colors.background.default,
      alignItems: 'center',
    },
    connectLedgerWrapper: {
      marginLeft: Device.getDeviceWidth() * 0.07,
      marginRight: Device.getDeviceWidth() * 0.07,
    },
    ledgerImage: {
      width: 68,
      height: 68,
    },
    coverImage: {
      resizeMode: 'contain',
      width: Device.getDeviceWidth() * 0.6,
      height: 64,
      overflow: 'visible',
    },
    connectLedgerText: {
      ...(fontStyles.normal as TextStyle),
      fontSize: 24,
    },
    bodyContainer: {
      flex: 1,
      marginTop: Device.getDeviceHeight() * 0.025,
    },
    textContainer: {
      marginTop: Device.getDeviceHeight() * 0.05,
    },

    instructionsText: {
      marginTop: Device.getDeviceHeight() * 0.02,
    },
    imageContainer: {
      alignItems: 'center',
      marginTop: Device.getDeviceHeight() * 0.08,
    },
    buttonContainer: {
      position: 'absolute',
      display: 'flex',
      bottom: Device.getDeviceHeight() * 0.025,
      left: 0,
      width: '100%',
    },
    lookingForDeviceContainer: {
      flexDirection: 'row',
    },
    lookingForDeviceText: {
      fontSize: 18,
    },
    activityIndicatorStyle: {
      marginLeft: 10,
    },
    ledgerInstructionText: {
      paddingLeft: 7,
    },
    howToInstallEthAppText: {
      marginTop: Device.getDeviceHeight() * 0.025,
    },
    openEthAppMessage: {
      marginTop: Device.getDeviceHeight() * 0.025,
    },
    loader: {
      color: theme.brandColors.white,
    },
  });

interface LedgerConnectProps {
  onConnectLedger: () => void;
}

const LedgerConnect = ({ onConnectLedger }: LedgerConnectProps) => {
  // const { AccountTrackerController } = Engine.context as any;
  const theme = useAppThemeFromContext() ?? mockTheme;
  // const { trackEvent } = useMetrics();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedDevice, setSelectedDevice] = useState<NanoDevice>(null);
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

  const {
    isSendingLedgerCommands,
    isAppLaunchConfirmationNeeded,
    ledgerLogicToRun,
    error: ledgerError,
  } = useLedgerBluetooth(selectedDevice?.id);

  const connectLedger = () => {
    setLoading(true);
    // trackEvent(MetaMetricsEvents.CONTINUE_LEDGER_HARDWARE_WALLET, {
    //   device_type: 'Ledger',
    // });
    ledgerLogicToRun(async () => {
      // const account = await unlockLedgerDefaultAccount(true);
      // await AccountTrackerController.syncBalanceWithAddresses([account]);
      // trackEvent(MetaMetricsEvents.CONNECT_LEDGER_SUCCESS, {
      //   device_type: 'Ledger',
      // });
      // navigation.dispatch(StackActions.pop(2));
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
        <Image
          source={useAssetFromTheme(
            ledgerDeviceLightImage,
            ledgerDeviceDarkImage,
          )}
          style={styles.ledgerImage}
          resizeMode="contain"
        />
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
