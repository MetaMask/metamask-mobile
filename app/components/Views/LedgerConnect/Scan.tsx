import React, { useEffect, useMemo, useState } from 'react';
import { Alert, View, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Observable, Subscription } from 'rxjs';
import BluetoothTransport from '@ledgerhq/react-native-hw-transport-ble';
import { Device as NanoDevice } from '@ledgerhq/react-native-hw-transport-ble/lib/types';
import { check, PERMISSIONS, openSettings } from 'react-native-permissions';
import { State } from 'react-native-ble-plx';
import { strings } from '../../../../locales/i18n';

import SelectComponent from '../../UI/SelectComponent';
import { mockTheme, useAppThemeFromContext } from '../../../util/theme';
import { Colors } from '../../../util/theme/models';
import Device from '../../../util/device';
import { handleBluetoothPermission } from './ledgerUtils';

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

const Scan = ({ onDeviceSelected }: { onDeviceSelected: (device: NanoDevice) => void }) => {
	const { colors } = useAppThemeFromContext() || mockTheme;
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [devices, setDevices] = useState<NanoDevice[]>([]);
	const [bluetoothOn, setBluetoothOn] = useState(false);
	const [hasBluetoothPermissions, setHasBluetoothPermissions] = useState<boolean>(false);

	const options = devices?.map(({ id, name, ...rest }: Partial<NanoDevice>) => ({
		key: id,
		label: name,
		value: id,
		...rest,
	}));

	useEffect(() => {
		// Monitoring for the BLE adapter to be turned on
		const subscription = BluetoothTransport.observeState({
			next: (e: { available: boolean; type: State }) => {
				if (e.available && e.type === State.PoweredOn && !bluetoothOn) {
					setBluetoothOn(true);
				}

				if (!e.available && e.type === State.PoweredOff) {
					setBluetoothOn(false);
					Alert.alert(strings('ledger.bluetooth_off'), strings('ledger.bluetooth_off_message'), [
						{
							text: strings('ledger.open_settings'),
							onPress: async () => {
								Device.isIos()
									? Linking.openURL('App-Prefs:Bluetooth')
									: Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
							},
						},
					]);
				}
			},
		});

		return () => subscription.unsubscribe();
	}, [bluetoothOn]);

	useEffect(() => {
		// Checking if app has required permissions
		const run = async () => {
			if (Device.isIos()) {
				const bluetoothPermissionStatus = await check(PERMISSIONS.IOS.BLUETOOTH_PERIPHERAL);
				const bluetoothAllowed = handleBluetoothPermission(bluetoothPermissionStatus);

				if (bluetoothAllowed) {
					setHasBluetoothPermissions(true);
				} else {
					Alert.alert(
						strings('ledger.bluetooth_access_blocked'),
						strings('ledger.bluetooth_access_blocked_message'),
						[
							{
								text: strings('ledger.open_settings'),
								onPress: async () => {
									await openSettings();
								},
							},
						]
					);
				}
			}

			if (Device.isAndroid()) {
				const bluetoothPermissionStatus = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
				const bluetoothAllowed = handleBluetoothPermission(bluetoothPermissionStatus);

				if (bluetoothAllowed) {
					setHasBluetoothPermissions(true);
				} else {
					Alert.alert(
						strings('ledger.bluetooth_missing_permissions'),
						strings('ledger.bluetooth_missing_permissions_message'),
						[
							{
								text: strings('ledger.open_settings'),
								onPress: async () => {
									await openSettings();
								},
							},
						]
					);
				}
			}
		};

		run();
	}, []);

	useEffect(() => {
		// Initiate scanning and pairing if bluetooth is enabled
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
					Alert.alert(
						strings('ledger.bluetooth_scanning_error'),
						strings('ledger.bluetooth_scanning_error_message')
					);
				},
			});
		}

		return () => {
			subscription?.unsubscribe();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hasBluetoothPermissions, bluetoothOn]);

	const displayDevices = devices.length > 0 && bluetoothOn && hasBluetoothPermissions;

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
			{!displayDevices && (
				<View style={styles.activityIndicatorContainer}>
					<ActivityIndicator />
				</View>
			)}
		</View>
	);
};

export default Scan;
