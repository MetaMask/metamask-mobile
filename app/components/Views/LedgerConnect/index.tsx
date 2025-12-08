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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import createStyles from './index.styles';
import { BluetoothDevice } from '../../hooks/Ledger/useBluetoothDevices';
import { getDeviceId } from '../../../core/Ledger/Ledger';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { HARDWARE_WALLET_BUTTON_TYPE } from '../../../core/Analytics/MetaMetrics.events';
import { ledgerDeviceUUIDToModelName } from '../../../util/hardwareWallet/deviceNameUtils';
import {
  HardwareWalletType,
  isAwaitingApp,
  isConnecting,
  isErrorState,
  useHardwareWallet,
} from '../../../core/HardwareWallets';

interface LedgerConnectProps {
  onConnectLedger: () => void;
  selectedDevice: LedgerDevice;
  setSelectedDevice: (device: LedgerDevice) => void;
}

const LedgerConnect = ({
  onConnectLedger,
  selectedDevice,
  setSelectedDevice,
}: LedgerConnectProps) => {
  const theme = useAppThemeFromContext() ?? mockTheme;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(theme.colors, insets),
    [theme, insets],
  );
  const [errorDetail, setErrorDetails] = useState<LedgerConnectionErrorProps>();
  const [hasMatchingDeviceId, setHasMatchingDeviceId] = useState(true);
  const deviceOSVersion = Number(getSystemVersion()) || 0;
  const { trackEvent, createEventBuilder } = useMetrics();

  const ledgerModelName = useMemo(() => {
    if (selectedDevice) {
      const [bluetoothServiceId] = selectedDevice.serviceUUIDs;
      return ledgerDeviceUUIDToModelName(bluetoothServiceId);
    }
    return undefined;
  }, [selectedDevice]);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_CONNECT_INSTRUCTIONS)
        .addProperties({
          device_type: HardwareDeviceTypes.LEDGER,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  useEffect(() => {
    if (selectedDevice) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_FOUND)
          .addProperties({
            device_type: HardwareDeviceTypes.LEDGER,
            device_model: ledgerModelName,
          })
          .build(),
      );
    }
  }, [selectedDevice, trackEvent, createEventBuilder, ledgerModelName]);

  const { connect, connectionState } = useHardwareWallet();
  const awaitingApp = isAwaitingApp(connectionState);
  const connecting = isConnecting(connectionState);
  const hasError = isErrorState(connectionState);

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle('', navigation, true, theme.colors),
    );
  }, [navigation, theme.colors]);

  const onDeviceSelected = (currentDevice: BluetoothDevice | undefined) => {
    const getStoredDeviceId = async () => {
      const storedDeviceId = await getDeviceId();
      const isMatchingDeviceId =
        !storedDeviceId || currentDevice?.id === storedDeviceId;
      setHasMatchingDeviceId(isMatchingDeviceId);

      if (isMatchingDeviceId) {
        setSelectedDevice(currentDevice);
      }
    };
    getStoredDeviceId();
  };

  const permissionText = useMemo(() => {
    if (deviceOSVersion >= 12) {
      return strings('ledger.ledger_reminder_message_step_four_Androidv12plus');
    }
    return strings('ledger.ledger_reminder_message_step_four');
  }, [deviceOSVersion]);

  const openHowToInstallEthApp = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_MARKETING)
        .addProperties({
          device_type: HardwareDeviceTypes.LEDGER,
          button_type: HARDWARE_WALLET_BUTTON_TYPE.TUTORIAL,
        })
        .build(),
    );
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: LEDGER_SUPPORT_LINK,
        title: strings('ledger.how_to_install_eth_webview_title'),
      },
    });
  };

  const getStylesWithMultipleDevicesErrorMessage = () =>
    hasMatchingDeviceId
      ? styles.bodyContainer
      : styles.bodyContainerWhithErrorMessage;

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
              {!awaitingApp
                ? strings('ledger.looking_for_device')
                : strings('ledger.open_eth_app')}
            </Text>
            {!selectedDevice && (
              <ActivityIndicator style={styles.activityIndicatorStyle} />
            )}
          </View>
          {!awaitingApp ? (
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
          {!hasMatchingDeviceId && (
            <Text red small testID={'multiple-devices-error-message'}>
              {strings('ledger.multiple_devices_error_message')}
            </Text>
          )}
        </View>
        <View style={getStylesWithMultipleDevicesErrorMessage()}>
          {!awaitingApp ? (
            <Scan
              onDeviceSelected={onDeviceSelected}
              onScanningErrorStateChanged={(error) => setErrorDetails(error)}
              ledgerError={undefined}
            />
          ) : null}
          {selectedDevice && !awaitingApp ? (
            <View style={styles.buttonContainer}>
              <StyledButton
                type="confirm"
                onPress={() => {
                  connect(HardwareWalletType.LEDGER, selectedDevice?.id);
                  onConnectLedger();
                }}
                testID={'add-network-button'}
                disabled={!hasMatchingDeviceId || awaitingApp || connecting}
              >
                {awaitingApp || connecting ? (
                  <ActivityIndicator color={styles.loader.color} />
                ) : hasError ? (
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
