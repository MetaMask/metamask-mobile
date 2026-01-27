import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { mockTheme, useAppThemeFromContext } from '../../../util/theme';
import { Colors } from '../../../util/theme/models';
import Device from '../../../util/device';
import useBluetooth from '../../hooks/Ledger/useBluetooth';
import useBluetoothPermissions from '../../hooks/useBluetoothPermissions';
import useBluetoothDevices, {
  BluetoothDevice,
} from '../../hooks/Ledger/useBluetoothDevices';
import {
  BluetoothPermissionErrors,
  LedgerCommunicationErrors,
} from '../../../core/Ledger/ledgerErrors';
import SelectOptionSheet, { ISelectOption } from '../../UI/SelectOptionSheet';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';
import { ledgerDeviceUUIDToModelName } from '../../../util/hardwareWallet/deviceNameUtils';
import {
  useHardwareWalletError,
  HardwareWalletType,
} from '../../../core/HardwareWallet';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
    },
    activityIndicatorContainer: {
      marginTop: 50,
    },
    picker: {
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      height: 45,
      width: Device.getDeviceWidth() * 0.85,
    },
  });

interface ScanProps {
  onDeviceSelected: (device: BluetoothDevice | undefined) => void;
  ledgerError: LedgerCommunicationErrors | undefined;
}

const Scan = ({ onDeviceSelected, ledgerError }: ScanProps) => {
  const { colors } = useAppThemeFromContext() || mockTheme;
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedDevice, setSelectedDevice] = useState<
    BluetoothDevice | undefined
  >();
  const {
    hasBluetoothPermissions,
    bluetoothPermissionError,
    checkPermissions,
  } = useBluetoothPermissions();
  const { bluetoothOn, bluetoothConnectionError } = useBluetooth(
    hasBluetoothPermissions,
  );
  const { devices, deviceScanError } = useBluetoothDevices(
    hasBluetoothPermissions,
    bluetoothOn,
  );
  const [permissionErrorShown, setPermissionErrorShown] = useState(false);

  // Use centralized error handling with bottom sheet
  const { parseAndShowError } = useHardwareWalletError();

  const ledgerModelName = useMemo(() => {
    if (selectedDevice) {
      const [bluetoothServiceId] = selectedDevice.serviceUUIDs;
      return ledgerDeviceUUIDToModelName(bluetoothServiceId);
    }
    return undefined;
  }, [selectedDevice]);

  useEffect(() => {
    // first device is selected by default if not selectedDevice is set
    if (devices?.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0]);
      onDeviceSelected(devices[0]);
    }
  }, [devices, onDeviceSelected, selectedDevice]);

  useEffect(() => {
    console.log('[DEBUG Scan] useEffect triggered:', {
      bluetoothPermissionError,
      bluetoothConnectionError,
      deviceScanError,
      hasBluetoothPermissions,
      bluetoothOn,
      permissionErrorShown,
    });

    if (bluetoothPermissionError && !permissionErrorShown) {
      console.log(
        '[DEBUG Scan] Calling parseAndShowError for bluetoothPermissionError:',
        bluetoothPermissionError,
      );
      // Show centralized error bottom sheet
      parseAndShowError(bluetoothPermissionError, HardwareWalletType.Ledger);

      // Track analytics for Bluetooth permission errors
      if (
        bluetoothPermissionError ===
        BluetoothPermissionErrors.BluetoothAccessBlocked
      ) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
            .addProperties({
              device_type: HardwareDeviceTypes.LEDGER,
              device_model: ledgerModelName,
              error: 'LEDGER_BLUETOOTH_PERMISSION_ERR',
            })
            .build(),
        );
      }
      setPermissionErrorShown(true);
    }

    if (bluetoothConnectionError) {
      console.log(
        '[DEBUG Scan] Calling parseAndShowError for bluetoothConnectionError',
      );
      // Show centralized error bottom sheet for Bluetooth off
      parseAndShowError(
        new Error('BluetoothDisabled'),
        HardwareWalletType.Ledger,
      );
    }

    if (deviceScanError) {
      console.log('[DEBUG Scan] Calling parseAndShowError for deviceScanError');
      // deviceScanError is a boolean, create a proper error for display
      parseAndShowError(
        new Error('BluetoothScanFailed'),
        HardwareWalletType.Ledger,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    deviceScanError,
    bluetoothPermissionError,
    bluetoothConnectionError,
    permissionErrorShown,
    selectedDevice,
    ledgerModelName,
    parseAndShowError,
  ]);

  useEffect(() => {
    if (hasBluetoothPermissions) {
      setPermissionErrorShown(false);
    }
  }, [hasBluetoothPermissions]);

  const options: ISelectOption[] = devices?.map(
    ({ id, name, ...rest }: Partial<BluetoothDevice>) => ({
      key: id,
      label: name,
      value: id,
      ...rest,
    }),
  );

  const displayDevices =
    devices.length > 0 && bluetoothOn && hasBluetoothPermissions;

  return (
    <View style={styles.container}>
      {displayDevices ? (
        <View style={styles.picker}>
          <SelectOptionSheet
            options={options}
            label={strings('ledger.available_devices')}
            defaultValue={options[0]?.label}
            onValueChange={(deviceId: string) => {
              const currentDevice = devices.find((d) => d.id === deviceId);
              setSelectedDevice(currentDevice);
              onDeviceSelected(currentDevice);
            }}
            selectedValue={
              (selectedDevice &&
                options.find((d) => d.value === selectedDevice?.id)?.value) ??
              options[0]?.value
            }
          />
        </View>
      ) : null}
    </View>
  );
};

export default React.memo(Scan);
