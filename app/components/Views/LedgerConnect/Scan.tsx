import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  View,
  StyleSheet,
  AppStateStatus,
  Platform,
  Linking,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { Observable, Subscription } from 'rxjs';
import BluetoothTransport from '@ledgerhq/react-native-hw-transport-ble';
import { Device as NanoDevice } from '@ledgerhq/react-native-hw-transport-ble/lib/types';
import {
  check,
  PERMISSIONS,
  RESULTS,
  request,
  openSettings,
} from 'react-native-permissions';
import { State } from 'react-native-ble-plx';
import { strings } from '../../../../locales/i18n';
import SelectComponent from '../../UI/SelectComponent';
import { mockTheme, useAppThemeFromContext } from '../../../util/theme';
import { Colors } from '../../../util/theme/models';
import Device from '../../../util/device';
import {
  openLedgerDeviceErrorModal,
  closeLedgerDeviceErrorModal,
} from '../../../actions/modals';

enum ScanErrors {
  BluetoothAccessBlocked = 'BluetoothAccessBlocked',
  LocationAccessBlocked = 'LocationAccessBlocked',
  BluetoothOff = 'BluetoothOff',
  BluetoothScanningError = 'BluetoothScanningError',
}

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

const Scan = ({
  onDeviceSelected,
}: {
  onDeviceSelected: (device: NanoDevice) => void;
}) => {
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [devices, setDevices] = useState<NanoDevice[]>([]);
  const [bluetoothOn, setBluetoothOn] = useState(false);
  const [hasBluetoothPermissions, setHasBluetoothPermissions] =
    useState<boolean>(false);
  const appState = useRef(AppState.currentState);
  const [, setAppStateVisible] = useState(appState.current);
  const [scanError, setScanError] = useState<ScanErrors>();
  const dispatch = useDispatch();

  const options = devices?.map(
    ({ id, name, ...rest }: Partial<NanoDevice>) => ({
      key: id,
      label: name,
      value: id,
      ...rest,
    }),
  );

  // Checking if app has required permissions every time the app becomes active
  const run = async () => {
    if (Device.isIos()) {
      const bluetoothPermissionStatus = await check(
        PERMISSIONS.IOS.BLUETOOTH_PERIPHERAL,
      );
      const bluetoothAllowed = bluetoothPermissionStatus === RESULTS.GRANTED;
      if (bluetoothAllowed) {
        setHasBluetoothPermissions(true);
      } else {
        setScanError(ScanErrors.BluetoothAccessBlocked);
      }
    }

    if (Device.isAndroid()) {
      const bluetoothPermissionStatus = await request(
        PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      );
      const bluetoothAllowed = bluetoothPermissionStatus === RESULTS.GRANTED;

      if (bluetoothAllowed) {
        setHasBluetoothPermissions(true);
      } else {
        setScanError(ScanErrors.LocationAccessBlocked);
      }
    }
  };

  // External permission changes must be picked up by the app by tracking the app state
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        setAppStateVisible(nextAppState);
        dispatch(closeLedgerDeviceErrorModal());
        run();
      }

      appState.current = nextAppState;
    };

    AppState.addEventListener('change', handleAppStateChange);
    run();
    return () => {
      AppState.removeEventListener('change', handleAppStateChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Monitoring for the BLE adapter to be turned on
  useEffect(() => {
    const subscription = BluetoothTransport.observeState({
      next: (e: { available: boolean; type: State }) => {
        if (e.available && e.type === State.PoweredOn && !bluetoothOn) {
          setBluetoothOn(true);
        }

        if (!e.available && e.type === State.PoweredOff) {
          setBluetoothOn(false);
          setScanError(ScanErrors.BluetoothOff);
        }
      },
    });

    return () => subscription.unsubscribe();
  }, [bluetoothOn]);

  // Initiate scanning and pairing if bluetooth is enabled
  useEffect(() => {
    let subscription: Subscription;
    if (hasBluetoothPermissions && bluetoothOn) {
      subscription = new Observable(BluetoothTransport.listen).subscribe({
        next: (e: any) => {
          const deviceFound = devices.some((d) => d.id === e.descriptor.id);
          if (e.type === 'add' && !deviceFound) {
            setDevices([...devices, e?.descriptor]);
            onDeviceSelected(e.descriptor);
          }
        },
        error: (_error) => {
          setScanError(ScanErrors.BluetoothScanningError);
        },
      });
    }

    return () => {
      subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBluetoothPermissions, bluetoothOn]);

  useEffect(() => {
    if (scanError) {
      switch (scanError) {
        case ScanErrors.BluetoothAccessBlocked:
          dispatch(
            openLedgerDeviceErrorModal({
              errorTitle: strings('ledger.bluetooth_access_blocked'),
              errorSubtitle: strings('ledger.bluetooth_access_blocked_message'),
              primaryButtonConfig: {
                title: strings('ledger.view_settings'),
                onPress: async () => {
                  await openSettings();
                },
              },
            }),
          );
          break;
        case ScanErrors.LocationAccessBlocked:
          dispatch(
            openLedgerDeviceErrorModal({
              errorTitle: strings('ledger.location_access_blocked'),
              errorSubtitle: strings('ledger.location_access_blocked_message'),
              primaryButtonConfig: {
                title: strings('ledger.view_settings'),
                onPress: async () => {
                  await openSettings();
                },
              },
            }),
          );
          break;
        case ScanErrors.BluetoothOff:
          dispatch(
            openLedgerDeviceErrorModal({
              errorTitle: strings('ledger.bluetooth_off'),
              errorSubtitle: strings('ledger.bluetooth_off_message'),
              primaryButtonConfig: {
                title: strings('ledger.view_settings'),
                onPress: async () => {
                  Platform.OS === 'ios'
                    ? Linking.openURL('App-Prefs:Bluetooth')
                    : Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
                },
              },
            }),
          );
          break;
        case ScanErrors.BluetoothScanningError:
        default:
          dispatch(
            openLedgerDeviceErrorModal({
              errorTitle: strings('ledger.bluetooth_scanning_error'),
              errorSubtitle: strings('ledger.bluetooth_scanning_error_message'),
              primaryButtonConfig: {
                title: strings('ledger.retry'),
                onPress: () => {
                  dispatch(closeLedgerDeviceErrorModal());
                  run();
                },
              },
            }),
          );
          break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanError]);

  const displayDevices =
    devices.length > 0 && bluetoothOn && hasBluetoothPermissions;

  return (
    <View style={styles.container}>
      {displayDevices && (
        <View style={styles.picker}>
          <SelectComponent
            options={options}
            label={strings('ledger.available_devices')}
            defaultValue={options[0]?.label}
            onValueChange={(ledger: NanoDevice) => onDeviceSelected(ledger)}
          />
        </View>
      )}
    </View>
  );
};

export default Scan;
