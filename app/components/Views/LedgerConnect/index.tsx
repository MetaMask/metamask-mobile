/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import/no-commonjs */
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Image, SafeAreaView, TextStyle, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Device as NanoDevice } from '@ledgerhq/react-native-hw-transport-ble/lib/types';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import StyledButton from '../../../components/UI/StyledButton';
import Text from '../../../components/Base/Text';
import { mockTheme, useAppThemeFromContext } from '../../../util/theme';
import Device from '../../../util/device';
import { fontStyles } from '../../../styles/common';
import Scan from './Scan';
import useLedgerBluetooth from '../../hooks/useLedgerBluetooth';

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

	const { isSendingLedgerCommands, ledgerLogicToRun, ledgerErrorMessage } = useLedgerBluetooth(selectedDevice?.id);

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
								onPress={async () =>
									ledgerLogicToRun(async () => {
										const defaultLedgerAccount =
											await KeyringController.unlockLedgerDefaultAccount();
										await AccountTrackerController.syncBalanceWithAddresses([defaultLedgerAccount]);
										navigation.navigate('WalletView');
									})
								}
								testID={'add-network-button'}
								disabled={isSendingLedgerCommands}
							>
								{isSendingLedgerCommands ? (
									<ActivityIndicator color={colors.white} />
								) : ledgerErrorMessage ? (
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
