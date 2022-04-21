/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import/no-commonjs */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Image, SafeAreaView, TextStyle, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BluetoothTransport from '@ledgerhq/react-native-hw-transport-ble';
import { Device as NanoDevice } from '@ledgerhq/react-native-hw-transport-ble/lib/types';
import { strings } from '../../../../locales/i18n';

import Engine from '../../../core/Engine';
import StyledButton from '../../../components/UI/StyledButton';
import Text from '../../../components/Base/Text';
import { mockTheme, useAppThemeFromContext } from '../../../util/theme';
import Device from '../../../util/device';
import { fontStyles } from '../../../styles/common';
import Scan from './Scan';

const ledgerImage = require('../../../images/ledger.png');
const ledgerConnectImage = require('../../../images/ledger-connect.png');

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
		imageContainer: { alignItems: 'center', marginTop: Device.getDeviceHeight() * 0.02 },
		buttonContainer: {
			position: 'absolute',
			display: 'flex',
			bottom: Device.getDeviceHeight() * 0.025,
			left: 0,
			width: '100%',
		},
	});

const LedgerConnect = () => {
	const { KeyringController, AccountTrackerController } = Engine.context as any;
	const { colors } = useAppThemeFromContext() ?? mockTheme;
	const navigation = useNavigation();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const [selectedDevice, setSelectedDevice] = useState<NanoDevice>(null);
	const [isRetry, setIsRetry] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const transportRef = useRef<BluetoothTransport>();

	useEffect(
		() => () => {
			if (transportRef.current) {
				transportRef.current.close();
			}
		},
		[]
	);

	const onConnectToLedgerDevice = async () => {
		setIsConnecting(true);

		// Establish bluetooth connection to ledger
		try {
			if (!transportRef.current && selectedDevice) {
				transportRef.current = await BluetoothTransport.open(selectedDevice);
				transportRef.current?.on('disconnect', () => (transportRef.current = undefined));
			}
		} catch {
			setIsRetry(true);
			setIsConnecting(false);

			Alert.alert(
				strings('ledger.bluetooth_connection_failed'),
				strings('ledger.bluetooth_connection_failed_message')
			);

			return;
		}

		// Get Account from Ledger
		try {
			// Initialise the keyring and check for pre-conditions (is the correct app running?)
			const appName = await KeyringController.connectLedgerHardware(transportRef.current, selectedDevice.id);
			if (appName !== 'Ethereum') {
				Alert.alert(strings('ledger.ethereum_app_off'), strings('ledger.ethereum_app_off_message'));
				setIsRetry(true);
				setIsConnecting(false);
				return;
			}

			// Retrieve the default account and sync the address with Metamask
			const defaultLedgerAccount = await KeyringController.unlockLedgerDefaultAccount();
			await AccountTrackerController.syncBalanceWithAddresses([defaultLedgerAccount]);

			// Go back to main view
			navigation.navigate('WalletView');
		} catch (e: any) {
			let errorMessage = e.message;

			// 0x6b0c - Stands for ledger device locked
			if (e.name === 'TransportStatusError' && e.message.includes('0x6b0c')) {
				errorMessage = strings('ledger.unlock_ledger_message');
			}

			Alert.alert(strings('ledger.cannot_get_account'), errorMessage);
			setIsRetry(true);
		} finally {
			setIsConnecting(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.connectLedgerWrapper}>
				<Image source={ledgerImage} style={styles.ledgerImage} />
				<Text bold style={styles.connectLedgerText}>
					{strings('ledger.connect_ledger')}
				</Text>
				<View style={styles.imageContainer}>
					<Image source={ledgerConnectImage} />
				</View>
				<View style={styles.textContainer}>
					<Text bold>{strings('ledger.looking_for_device')}</Text>
					<Text style={styles.instructionsText}>{strings('ledger.ledger_reminder_message')}</Text>
				</View>
				<View style={styles.bodyContainer}>
					<Scan onDeviceSelected={(ledgerDevice) => setSelectedDevice(ledgerDevice)} />
					{selectedDevice && (
						<View style={styles.buttonContainer}>
							<StyledButton
								type="confirm"
								onPress={onConnectToLedgerDevice}
								testID={'add-network-button'}
								disabled={isConnecting}
							>
								{isConnecting ? (
									<ActivityIndicator color={colors.white} />
								) : isRetry ? (
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
