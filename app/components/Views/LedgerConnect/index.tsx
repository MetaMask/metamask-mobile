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
import { useNavigation } from '@react-navigation/native';
import { Device as NanoDevice } from '@ledgerhq/react-native-hw-transport-ble/lib/types';
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
import useLedgerBluetooth, {
  LedgerCommunicationErrors,
} from '../../hooks/useLedgerBluetooth';
import { useDispatch } from 'react-redux';
import {
  closeLedgerDeviceErrorModal,
  openLedgerDeviceErrorModal,
} from '../../../actions/modals';

const ledgerDeviceDarkImage = require('../../../images/ledger-device-dark.png');
const ledgerDeviceLightImage = require('../../../images/ledger-device-light.png');
const ledgerConnectLightImage = require('../../../images/ledger-connect-light.png');
const ledgerConnectDarkImage = require('../../../images/ledger-connect-dark.png');

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
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
  });

const LedgerConnect = () => {
  const { KeyringController, AccountTrackerController } = Engine.context as any;
  const { colors } = useAppThemeFromContext() ?? mockTheme;
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedDevice, setSelectedDevice] = useState<NanoDevice>(null);
  const dispatch = useDispatch();

  const {
    isSendingLedgerCommands,
    ledgerLogicToRun,
    error: ledgerError,
  } = useLedgerBluetooth(selectedDevice?.id);

  const connectLedger = (shouldNavigateToWallet = false) =>
    ledgerLogicToRun(async () => {
      const defaultLedgerAccount =
        await KeyringController.unlockLedgerDefaultAccount();
      await AccountTrackerController.syncBalanceWithAddresses([
        defaultLedgerAccount,
      ]);
      shouldNavigateToWallet && navigation.navigate('WalletView');
    });

  const handleErrorWithRetry = (errorTitle: string, errorSubtitle: string) => {
    dispatch(
      openLedgerDeviceErrorModal({
        errorTitle,
        errorSubtitle,
        primaryButtonConfig: {
          title: strings('ledger.retry'),
          onPress: () => {
            dispatch(closeLedgerDeviceErrorModal());
            connectLedger(true);
          },
        },
      }),
    );
  };

  useEffect(() => {
    if (ledgerError) {
      switch (ledgerError) {
        case LedgerCommunicationErrors.LedgerDisconnected:
          handleErrorWithRetry(
            strings('ledger.bluetooth_connection_failed'),
            strings('ledger.bluetooth_connection_failed_message'),
          );
          break;
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
          // TODO: CHANGE Location to hardware wallet selector when it's ready
          navigation.navigate('WalletView');
          break;
        case LedgerCommunicationErrors.LedgerIsLocked:
          handleErrorWithRetry(
            strings('ledger.ledger_is_locked'),
            strings('ledger.unlock_ledger_message'),
          );
          break;
        case LedgerCommunicationErrors.UnknownError:
        default:
          handleErrorWithRetry(
            strings('ledger.unknown_error'),
            strings('ledger.unknown_error_message'),
          );
          break;
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
          />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.lookingForDeviceContainer}>
            <Text style={styles.lookingForDeviceText} bold>
              {strings('ledger.looking_for_device')}
            </Text>
            {!selectedDevice && (
              <ActivityIndicator style={styles.activityIndicatorStyle} />
            )}
          </View>
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
          <Text style={styles.howToInstallEthAppText} bold big link>
            {strings('ledger.how_to_install_eth_app')}
          </Text>
        </View>
        <View style={styles.bodyContainer}>
          <Scan
            onDeviceSelected={(ledgerDevice) => setSelectedDevice(ledgerDevice)}
          />
          {selectedDevice && (
            <View style={styles.buttonContainer}>
              <StyledButton
                type="confirm"
                onPress={() => connectLedger(true)}
                testID={'add-network-button'}
                disabled={isSendingLedgerCommands}
              >
                {isSendingLedgerCommands ? (
                  <ActivityIndicator color={colors.white} />
                ) : ledgerError ? (
                  strings('ledger.retry')
                ) : (
                  strings('ledger.continue')
                )}
              </StyledButton>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LedgerConnect;
