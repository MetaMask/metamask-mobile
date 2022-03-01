import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Engine from '../../../core/Engine';
import AnimatedQRScannerModal, { SupportedURType } from '../../UI/QRHardware/AnimatedQRScanner';
import SelectQRAccounts from './SelectQRAccounts';
import ConnectQRInstruction from './Instruction';
import Icon from 'react-native-vector-icons/FontAwesome';
import { colors } from '../../../styles/common';
import BlockingActionModal from '../../UI/BlockingActionModal';
import { strings } from '../../../../locales/i18n';
import { IAccount } from './types';
import { UR } from '@ngraveio/bc-ur';
import Alert, { AlertType } from '../../Base/Alert';

interface IConnectQRHardwareProps {
	navigation: any;
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: '100%',
		flexDirection: 'column',
		alignItems: 'center',
		paddingTop: 16,
	},
	header: {
		width: '100%',
		paddingHorizontal: 32,
		flexDirection: 'column',
		alignItems: 'center',
	},
	close: {
		alignSelf: 'flex-end',
		width: 48,
		height: 48,
		alignItems: 'center',
		justifyContent: 'center',
	},
	qrcode: {
		alignSelf: 'flex-start',
	},
	error: {
		fontSize: 14,
		color: colors.red,
	},
});

const ConnectQRHardware = ({ navigation }: IConnectQRHardwareProps) => {
	const KeyringController = useMemo(() => {
		const { KeyringController: keyring } = Engine.context as any;
		return keyring;
	}, []);
	const AccountTrackerController = useMemo(() => (Engine.context as any).AccountTrackerController, []);

	const [QRState, setQRState] = useState({
		sync: {
			reading: false,
		},
	});
	const [scannerVisible, setScannerVisible] = useState(false);
	const [blockingModalVisible, setBlockingModalVisible] = useState(false);
	const [accounts, setAccounts] = useState<{ address: string; index: number; balance: string }[]>([]);
	const [trackedAccounts, setTrackedAccounts] = useState<{ [p: string]: { balance: string } }>({});
	const [checkedAccounts, setCheckedAccounts] = useState<number[]>([]);
	const [errorMsg, setErrorMsg] = useState('');
	const resetError = useCallback(() => {
		setErrorMsg('');
	}, []);
	const [existingAccounts, setExistingAccounts] = useState<string[]>([]);

	useEffect(() => {
		KeyringController.getAccounts().then((value: string[]) => {
			setExistingAccounts(value);
		});
	}, [KeyringController]);
	useEffect(() => {
		KeyringController.getQRKeyringState().then((memstore: any) => {
			memstore.subscribe((value: any) => {
				setQRState(value);
			});
		});
	}, [KeyringController]);
	useEffect(() => {
		const unTrackedAccounts: string[] = [];
		accounts.forEach((account) => {
			if (!trackedAccounts[account.address]) {
				unTrackedAccounts.push(account.address);
			}
		});
		if (unTrackedAccounts.length > 0) {
			AccountTrackerController.syncWithAddresses(unTrackedAccounts).then((_trackedAccounts: any) => {
				setTrackedAccounts(Object.assign({}, trackedAccounts, _trackedAccounts));
			});
		}
	}, [AccountTrackerController, accounts, trackedAccounts]);
	const showScanner = useCallback(() => {
		setScannerVisible(true);
	}, []);
	const hideScanner = useCallback(() => {
		setScannerVisible(false);
	}, []);
	useEffect(() => {
		if (QRState.sync.reading) {
			showScanner();
		} else {
			hideScanner();
		}
	}, [QRState.sync, hideScanner, showScanner]);

	const onConnectHardware = useCallback(async () => {
		resetError();
		const _accounts = await KeyringController.connectQRHardware(0);
		setAccounts(_accounts);
	}, [KeyringController, resetError]);
	const onScanSuccess = useCallback(
		(ur: UR) => {
			hideScanner();
			if (ur.type === SupportedURType.CRYPTO_HDKEY) {
				KeyringController.submitQRCryptoHDKey(ur.cbor.toString('hex'));
			} else {
				KeyringController.submitQRCryptoAccount(ur.cbor.toString('hex'));
			}
			resetError();
		},
		[KeyringController, hideScanner, resetError]
	);
	const onScanError = useCallback(
		(error: string) => {
			hideScanner();
			setErrorMsg(error);
		},
		[hideScanner]
	);

	const nextPage = useCallback(async () => {
		resetError();
		const _accounts = await KeyringController.connectQRHardware(1);
		setAccounts(_accounts);
	}, [KeyringController, resetError]);

	const prevPage = useCallback(async () => {
		resetError();
		const _accounts = await KeyringController.connectQRHardware(-1);
		setAccounts(_accounts);
	}, [KeyringController, resetError]);

	const onToggle = useCallback(
		(index: number) => {
			resetError();
			if (!checkedAccounts.includes(index)) {
				setCheckedAccounts([...checkedAccounts, index]);
			} else {
				setCheckedAccounts(checkedAccounts.filter((i) => i !== index));
			}
		},
		[checkedAccounts, resetError]
	);

	const enhancedAccounts: IAccount[] = useMemo(
		() =>
			accounts.map((account) => {
				let checked = false;
				let exist = false;
				if (checkedAccounts.includes(account.index)) checked = true;
				if (existingAccounts.find((item) => item.toLowerCase() === account.address.toLowerCase())) {
					exist = true;
					checked = true;
				}
				return {
					...account,
					checked,
					exist,
					balance: trackedAccounts[account.address]?.balance || '0x0',
				};
			}),
		[accounts, checkedAccounts, existingAccounts, trackedAccounts]
	);

	const onUnlock = useCallback(async () => {
		resetError();
		setBlockingModalVisible(true);
		for (const account of checkedAccounts) {
			await KeyringController.unlockQRHardwareWalletAccount(account);
		}
		setBlockingModalVisible(false);
		navigation.goBack();
	}, [KeyringController, checkedAccounts, navigation, resetError]);

	const onForget = useCallback(async () => {
		resetError();
		await KeyringController.forgetQRDevice();
		navigation.goBack();
	}, [KeyringController, navigation, resetError]);

	const renderAlert = () =>
		errorMsg !== '' && (
			<Alert type={AlertType.Error} onPress={resetError}>
				<Text style={styles.error}>{errorMsg}</Text>
			</Alert>
		);

	return (
		<Fragment>
			<View style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity onPress={navigation.goBack} style={styles.close}>
						<Icon name="close" size={18} />
					</TouchableOpacity>
					<Icon name="qrcode" size={42} style={styles.qrcode} />
				</View>
				{accounts.length <= 0 ? (
					<ConnectQRInstruction
						onConnect={onConnectHardware}
						renderAlert={renderAlert}
						navigation={navigation}
					/>
				) : (
					<SelectQRAccounts
						canUnlock={checkedAccounts.length > 0}
						accounts={enhancedAccounts}
						nextPage={nextPage}
						prevPage={prevPage}
						toggleAccount={onToggle}
						onUnlock={onUnlock}
						onForget={onForget}
					/>
				)}
			</View>
			<AnimatedQRScannerModal
				visible={scannerVisible}
				purpose={'sync'}
				onScanSuccess={onScanSuccess}
				onScanError={onScanError}
				hideModal={hideScanner}
			/>
			<BlockingActionModal modalVisible={blockingModalVisible} isLoadingAction>
				<Text>{strings('connect_qr_hardware.please_wait')}</Text>
			</BlockingActionModal>
		</Fragment>
	);
};

export default ConnectQRHardware;
