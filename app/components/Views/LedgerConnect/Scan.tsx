import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Platform, Linking } from 'react-native';
import { openSettings } from 'react-native-permissions';
import { strings } from '../../../../locales/i18n';
import SelectComponent from '../../UI/SelectComponent';
import { mockTheme, useAppThemeFromContext } from '../../../util/theme';
import { Colors } from '../../../util/theme/models';
import Device from '../../../util/device';
import useBluetooth from './hooks/useBluetooth';
import useBluetoothPermissions, {
  BluetoothPermissionErrors,
} from './hooks/useBluetoothPermissions';
import { LedgerConnectionErrorProps } from './LedgerConnectionError';
import useBluetoothDevices, {
  BluetoothDevice,
} from './hooks/useBluetoothDevices';
import { LedgerCommunicationErrors } from '../../hooks/useLedgerBluetooth';

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
  onScanningErrorStateChanged: (
    error: LedgerConnectionErrorProps | undefined,
  ) => void;
  ledgerError: LedgerCommunicationErrors | undefined;
}

const Scan = ({
  onDeviceSelected,
  onScanningErrorStateChanged,
  ledgerError,
}: ScanProps) => {
  const { colors } = useAppThemeFromContext() || mockTheme;
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

  useEffect(() => {
    if (
      !bluetoothPermissionError &&
      !bluetoothConnectionError &&
      !deviceScanError &&
      !ledgerError
    ) {
      onScanningErrorStateChanged(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bluetoothPermissionError,
    bluetoothConnectionError,
    deviceScanError,
    ledgerError,
  ]);

  useEffect(() => {
    // first device is selected by default
    if (devices?.length > 0) {
      onDeviceSelected(devices[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices]);

  useEffect(() => {
    if (bluetoothPermissionError) {
      switch (bluetoothPermissionError) {
        case BluetoothPermissionErrors.BluetoothAccessBlocked:
          onScanningErrorStateChanged({
            errorTitle: strings('ledger.bluetooth_access_blocked'),
            errorSubtitle: strings('ledger.bluetooth_access_blocked_message'),
            primaryButtonConfig: {
              title: strings('ledger.view_settings'),
              onPress: async () => {
                await openSettings();
              },
            },
          });
          break;
        case BluetoothPermissionErrors.LocationAccessBlocked:
          onScanningErrorStateChanged({
            errorTitle: strings('ledger.location_access_blocked'),
            errorSubtitle: strings('ledger.location_access_blocked_message'),
            primaryButtonConfig: {
              title: strings('ledger.view_settings'),
              onPress: async () => {
                await openSettings();
              },
            },
          });
          break;
      }
    }

    if (bluetoothConnectionError) {
      onScanningErrorStateChanged({
        errorTitle: strings('ledger.bluetooth_off'),
        errorSubtitle: strings('ledger.bluetooth_off_message'),
        primaryButtonConfig: {
          title: strings('ledger.view_settings'),
          onPress: async () => {
            Platform.OS === 'ios'
              ? Linking.openURL('App-Prefs:Bluetooth')
              : Linking.openSettings();
          },
        },
      });
    }

    if (deviceScanError) {
      onScanningErrorStateChanged({
        errorTitle: strings('ledger.bluetooth_scanning_error'),
        errorSubtitle: strings('ledger.bluetooth_scanning_error_message'),
        primaryButtonConfig: {
          title: strings('ledger.retry'),
          onPress: () => {
            checkPermissions();
          },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceScanError, bluetoothPermissionError, bluetoothConnectionError]);

  const options = devices?.map(
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
          <SelectComponent
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
