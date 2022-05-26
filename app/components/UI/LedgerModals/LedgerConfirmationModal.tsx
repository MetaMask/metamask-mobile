/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-var-requires */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  mockTheme,
  useAppThemeFromContext,
  useAssetFromTheme,
} from '../../../util/theme';
import Text from '../../Base/Text';
import StyledButton from '../StyledButton';
import { strings } from '../../../../locales/i18n';
import { Colors } from '../../../util/theme/models';
import useLedgerBluetooth, {
  LedgerCommunicationErrors,
} from '../../../components/hooks/useLedgerBluetooth';
import Engine from '../../../core/Engine';
import Device from '../../../util/device';
import { closeLedgerDeviceActionModal } from '../../../actions/modals';
import useBluetooth from '../../../components/Views/LedgerConnect/hooks/useBluetooth';
import useBluetoothPermissions, {
  BluetoothPermissionErrors,
} from '../../../components/Views/LedgerConnect/hooks/useBluetoothPermissions';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      height: 450,
    },
    contentWrapper: {
      flex: 1,
      alignItems: 'center',
      marginTop: 35,
    },
    modalTitle: {
      marginTop: 30,
    },
    confirmationViewTitle: {
      marginTop: 30,
      marginHorizontal: 30,
    },

    buttonContainer: {
      width: '90%',
      position: 'absolute',
      bottom: 0,
    },
    buttonStyle: {
      marginTop: 10,
    },
    textContainer: {
      alignItems: 'center',
      marginTop: 20,
    },
    titleText: {
      fontSize: 22,
    },
    subtitleText: {
      marginTop: 20,
    },
    ledgerImageStyle: {
      resizeMode: 'cover',
      width: 100,
      height: 54,
      overflow: 'visible',
    },
    lookingForDeviceTitle: {
      flexDirection: 'row',
      marginTop: 30,
      alignItems: 'center',
    },
    activityIndicator: {
      marginLeft: 20,
    },
    confirmationActivityIndicator: {
      marginTop: 30,
    },
    ledgerInstructionText: {
      paddingLeft: 7,
    },
    instructionsWrapper: {
      marginTop: 40,
      flex: 1,
    },
    howToInstallEthAppText: {
      marginTop: 40,
      flex: 1,
      flexWrap: 'wrap',
      marginLeft: 20,
      marginRight: 20,
    },
    lookingForDeviceContainer: {
      flex: 1,
      alignItems: 'center',
    },
    openLedgerTextWrapper: {
      marginTop: 30,
      flex: 1,
      alignItems: 'center',
      marginHorizontal: 30,
    },
    rejectButtonOpenLedgerView: {
      width: Device.getDeviceWidth() * 0.8,
    },
  });

const ledgerConnectLightImage = require('../../../images/ledger-connect-light.png');
const ledgerConnectDarkImage = require('../../../images/ledger-connect-dark.png');
const ledgerConnectErrorDarkImage = require('../../../images/ledger-connect-error-dark.png');
const ledgerConnectErrorLightImage = require('../../../images/ledger-connect-error-light.png');

const LedgerConfirmationModal = () => {
  const { KeyringController, TransactionController } = Engine.context as any;
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const ledgerImage = useAssetFromTheme(
    ledgerConnectLightImage,
    ledgerConnectDarkImage,
  );
  const ledgerErrorImage = useAssetFromTheme(
    ledgerConnectErrorLightImage,
    ledgerConnectErrorDarkImage,
  );
  const {
    device: deviceId,
    transaction: transactionId,
    onConfirmationComplete,
  } = useSelector((state: any) => state.modals.ledgerDeviceActionParams);
  const dispatch = useDispatch();
  const {
    isSendingLedgerCommands,
    isAppLaunchConfirmationNeeded,
    ledgerLogicToRun,
    error: ledgerError,
  } = useLedgerBluetooth(deviceId);
  const [errorDetails, setErrorDetails] = useState<{
    title: string;
    subtitle: string;
  }>();

  const {
    hasBluetoothPermissions,
    bluetoothPermissionError,
    checkPermissions,
  } = useBluetoothPermissions();
  const { bluetoothOn, bluetoothConnectionError } = useBluetooth(
    hasBluetoothPermissions,
  );

  const connectLedger = () => {
    ledgerLogicToRun(async () => {
      // Connection attempt
      await KeyringController.unlockLedgerDefaultAccount();

      // This requires the user to confirm on the ledger device
      await TransactionController.approveTransaction(transactionId);

      // Wrap up the confirmation flow
      // TODO: handle close of confirmation flow
      dispatch(closeLedgerDeviceActionModal());
      onConfirmationComplete();
    });
  };

  // In case of manual rejection
  const onReject = async () => {
    await TransactionController.cancelTransaction(transactionId);
    // TODO: handle close of confirmation flow
    dispatch(closeLedgerDeviceActionModal());
    onConfirmationComplete();
  };

  const onRetry = async () => {
    if (!hasBluetoothPermissions) {
      await checkPermissions();
    }

    if (hasBluetoothPermissions && bluetoothOn) {
      connectLedger();
    }
  };

  useEffect(() => {
    hasBluetoothPermissions && bluetoothOn && connectLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBluetoothPermissions, bluetoothOn]);

  useEffect(() => {
    if (ledgerError) {
      switch (ledgerError) {
        case LedgerCommunicationErrors.FailedToOpenApp:
          setErrorDetails({
            title: strings('ledger.failed_to_open_eth_app'),
            subtitle: strings('ledger.ethereum_app_open_error'),
          });
          break;
        case LedgerCommunicationErrors.FailedToCloseApp:
          setErrorDetails({
            title: strings('ledger.running_app_close'),
            subtitle: strings('ledger.running_app_close_error'),
          });
          break;
        case LedgerCommunicationErrors.AppIsNotInstalled:
          setErrorDetails({
            title: strings('ledger.ethereum_app_not_installed'),
            subtitle: strings('ledger.ethereum_app_not_installed_error'),
          });
          break;
        case LedgerCommunicationErrors.LedgerIsLocked:
          setErrorDetails({
            title: strings('ledger.ledger_is_locked'),
            subtitle: strings('ledger.unlock_ledger_message'),
          });
          break;
        case LedgerCommunicationErrors.UserRefusedConfirmation:
          onReject();
          break;
        case LedgerCommunicationErrors.UnknownError:
        case LedgerCommunicationErrors.LedgerDisconnected:
        default:
          setErrorDetails({
            title: strings('ledger.ledger_disconnected'),
            subtitle: strings('ledger.ledger_disconnected_error'),
          });
          break;
      }
    }

    if (bluetoothPermissionError) {
      switch (bluetoothPermissionError) {
        case BluetoothPermissionErrors.LocationAccessBlocked:
          setErrorDetails({
            title: strings('ledger.location_access_blocked'),
            subtitle: strings('ledger.location_access_blocked_error'),
          });
          break;
        case BluetoothPermissionErrors.BluetoothAccessBlocked:
          setErrorDetails({
            title: strings('ledger.bluetooth_access_blocked'),
            subtitle: strings('ledger.bluetooth_access_blocked_error'),
          });
          break;
      }
    }

    if (bluetoothConnectionError) {
      setErrorDetails({
        title: strings('ledger.bluetooth_off'),
        subtitle: strings('ledger.bluetooth_off_message'),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerError, bluetoothConnectionError, bluetoothPermissionError]);

  const LookingForDeviceView = () => (
    <View style={styles.lookingForDeviceContainer}>
      <Image source={ledgerImage} style={styles.ledgerImageStyle} />
      <View style={styles.lookingForDeviceTitle}>
        <Text bold big style={styles.titleText}>
          {strings('ledger.looking_for_device')}
        </Text>
        <View style={styles.activityIndicator}>
          <ActivityIndicator />
        </View>
      </View>
      <View style={styles.instructionsWrapper}>
        <Text>{strings('ledger.ledger_reminder_message')}</Text>
        <Text style={styles.ledgerInstructionText}>
          {strings('ledger.ledger_reminder_message_step_one')}
        </Text>
        <Text style={styles.ledgerInstructionText}>
          {strings('ledger.ledger_reminder_message_step_two')}
        </Text>
        <Text style={styles.ledgerInstructionText}>
          {strings('ledger.ledger_reminder_message_step_three')}
        </Text>
      </View>
      <Text style={styles.howToInstallEthAppText} bold link numerOfLines={2}>
        {strings('ledger.how_to_install_eth_app')}
      </Text>
    </View>
  );

  const OpenYourLedgerView = () => (
    <>
      <Image source={ledgerImage} style={styles.ledgerImageStyle} />
      <View style={styles.modalTitle}>
        <Text bold big>
          {strings('ledger.open_eth_app')}
        </Text>
      </View>
      <View style={styles.openLedgerTextWrapper}>
        <Text>
          <Text>{strings('ledger.open_eth_app_message_one')}</Text>
          <Text bold>{strings('ledger.open_eth_app_message_two')}</Text>
        </Text>
      </View>
      <StyledButton
        type="cancel"
        onPress={onReject}
        style={styles.rejectButtonOpenLedgerView}
      >
        {strings('transaction.reject')}
      </StyledButton>
    </>
  );

  const ErrorView = () => {
    const errorTitle = errorDetails?.title;
    const errorSubtitle = errorDetails?.subtitle;

    const onViewSettings = async () => {
      Platform.OS === 'ios'
        ? Linking.openURL('App-Prefs:Bluetooth')
        : Linking.openSettings();
    };

    return (
      <>
        <Image source={ledgerErrorImage} />
        <View style={styles.textContainer}>
          <Text big bold style={styles.titleText}>
            {errorTitle}
          </Text>
          <Text style={styles.subtitleText}>{errorSubtitle}</Text>
        </View>
        <View style={styles.buttonContainer}>
          {(bluetoothConnectionError || bluetoothPermissionError) && (
            <View style={styles.buttonStyle}>
              <StyledButton type="confirm" onPress={onViewSettings}>
                {strings('ledger.view_settings')}
              </StyledButton>
            </View>
          )}
          <View style={styles.buttonStyle}>
            <StyledButton type="normal" onPress={onRetry}>
              {strings('ledger.try_again')}
            </StyledButton>
          </View>
          <View style={styles.buttonStyle}>
            <StyledButton type="cancel" onPress={onReject}>
              {strings('transaction.reject')}
            </StyledButton>
          </View>
        </View>
      </>
    );
  };

  const ConfirmationView = () => (
    <>
      <Image source={ledgerImage} style={styles.ledgerImageStyle} />
      <View style={styles.confirmationViewTitle}>
        <Text bold big style={styles.titleText}>
          {strings('ledger.confirm_transaction_on_ledger')}
        </Text>
      </View>
      <View style={styles.confirmationActivityIndicator}>
        <ActivityIndicator />
      </View>
      <View style={styles.buttonContainer}>
        <StyledButton type="cancel" onPress={onReject}>
          {strings('transaction.reject')}
        </StyledButton>
      </View>
    </>
  );

  const displayErrorView = !!errorDetails;
  const displayLookingForDevice = !isSendingLedgerCommands && !displayErrorView;
  const displayOpenYourLedger =
    isSendingLedgerCommands &&
    !displayErrorView &&
    isAppLaunchConfirmationNeeded;
  const displayConfirmation =
    isSendingLedgerCommands &&
    !displayErrorView &&
    !isAppLaunchConfirmationNeeded;

  return (
    <SafeAreaView style={styles.wrapper}>
      <View style={styles.contentWrapper}>
        {displayLookingForDevice && <LookingForDeviceView />}
        {displayOpenYourLedger && <OpenYourLedgerView />}
        {displayErrorView && <ErrorView />}
        {displayConfirmation && <ConfirmationView />}
      </View>
    </SafeAreaView>
  );
};

export default LedgerConfirmationModal;
