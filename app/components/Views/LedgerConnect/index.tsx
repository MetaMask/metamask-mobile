/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import/no-commonjs */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  SafeAreaView,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
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
import { colors as importedColors, fontStyles } from '../../../styles/common';
import Scan from './Scan';
import useLedgerBluetooth, {
  LedgerCommunicationErrors,
} from '../../hooks/useLedgerBluetooth';
import { showSimpleNotification } from '../../../actions/notification';
import LedgerConnectionError, {
  LedgerConnectionErrorProps,
} from './LedgerConnectionError';
import { getNavigationOptionsTitle } from '../../UI/Navbar';

const ledgerDeviceDarkImage = require('../../../images/ledger-device-dark.png');
const ledgerDeviceLightImage = require('../../../images/ledger-device-light.png');
const ledgerConnectLightImage = require('../../../images/ledger-connect-light.png');
const ledgerConnectDarkImage = require('../../../images/ledger-connect-dark.png');

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      position: 'relative',
      flex: 1,
      backgroundColor: colors.background.default,
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
  });

const LedgerConnect = () => {
  const { KeyringController, AccountTrackerController } = Engine.context as any;
  const { colors } = useAppThemeFromContext() ?? mockTheme;
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedDevice, setSelectedDevice] = useState<NanoDevice>(null);
  const [errorDetail, setErrorDetails] = useState<LedgerConnectionErrorProps>();
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle('', navigation, true, colors),
    );
  }, [navigation, colors]);

  const {
    isSendingLedgerCommands,
    isAppLaunchConfirmationNeeded,
    ledgerLogicToRun,
    error: ledgerError,
  } = useLedgerBluetooth(selectedDevice?.id);

  const connectLedger = () => {
    setLoading(true);
    ledgerLogicToRun(async () => {
      const account = await KeyringController.unlockLedgerDefaultAccount();
      await AccountTrackerController.syncBalanceWithAddresses([account]);

      navigation.dispatch(StackActions.popToTop());
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

  const openHowToInstallEthApp = () => {
    navigation.push('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.ledger.com/hc/en-us/articles/360009576554-Ethereum-ETH-?docs=true',
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
          handleErrorWithRetry(
            strings('ledger.error_during_connection'),
            strings('ledger.error_during_connection_message'),
          );
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
                  {strings('ledger.ledger_reminder_message_step_four')}
                </Text>
              )}
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
                disabled={isSendingLedgerCommands}
              >
                {loading || isSendingLedgerCommands ? (
                  <ActivityIndicator color={importedColors.white} />
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
// Emanuel Charlie Tiparu
export default React.memo(LedgerConnect);
