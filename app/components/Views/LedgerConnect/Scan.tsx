import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Platform, Linking } from 'react-native';
import { openSettings } from 'react-native-permissions';
import { strings } from '../../../../locales/i18n';
import { mockTheme, useAppThemeFromContext } from '../../../util/theme';
import { Colors } from '../../../util/theme/models';
import Device from '../../../util/device';
import useBluetooth from '../../hooks/Ledger/useBluetooth';
import useBluetoothPermissions from '../../hooks/useBluetoothPermissions';
import { LedgerConnectionErrorProps } from './LedgerConnectionError';
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

  const ledgerModelName = useMemo(() => {
    if (selectedDevice) {
      const [bluetoothServiceId] = selectedDevice.serviceUUIDs;
      return ledgerDeviceUUIDToModelName(bluetoothServiceId);
    }
    return undefined;
  }, [selectedDevice]);

  useEffect(() => {
    if (
      !bluetoothPermissionError &&
      !bluetoothConnectionError &&
      !deviceScanError &&
      !permissionErrorShown &&
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
    // first device is selected by default if not selectedDevice is set
    if (devices?.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0]);
      onDeviceSelected(devices[0]);
    }
  }, [devices, onDeviceSelected, selectedDevice]);

  useEffect(() => {
    if (bluetoothPermissionError && !permissionErrorShown) {
      switch (bluetoothPermissionError) {
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
        case BluetoothPermissionErrors.BluetoothAccessBlocked: {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
              .addProperties({
                device_type: HardwareDeviceTypes.LEDGER,
                device_model: ledgerModelName,
                error: 'LEDGER_BLUETOOTH_PERMISSION_ERR',
              })
              .build(),
          );
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
        }
        case BluetoothPermissionErrors.NearbyDevicesAccessBlocked:
          onScanningErrorStateChanged({
            errorTitle: strings('ledger.nearbyDevices_access_blocked'),
            errorSubtitle: strings(
              'ledger.nearbyDevices_access_blocked_message',
            ),
            primaryButtonConfig: {
              title: strings('ledger.view_settings'),
              onPress: () => {
                openSettings();
              },
            },
          });
          break;
      }
      setPermissionErrorShown(true);
    }

    if (bluetoothConnectionError) {
      onScanningErrorStateChanged({
        errorTitle: strings('ledger.bluetooth_off'),
        errorSubtitle: strings('ledger.bluetooth_off_message'),
        primaryButtonConfig: {
          title: strings('ledger.view_settings'),
          onPress: () => {
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
  }, [
    deviceScanError,
    bluetoothPermissionError,
    bluetoothConnectionError,
    permissionErrorShown,
    selectedDevice,
    ledgerModelName,
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
