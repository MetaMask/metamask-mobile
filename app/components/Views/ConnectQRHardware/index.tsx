import React, { useEffect, useState, Fragment, useMemo, useCallback } from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import Engine from '../../../core/Engine';
import AnimatedQRScannerModal from './AnimatedQRScanner';
import SelectQRAccounts from './SelectQRAccounts';
import ConnectQRInstruction from './Instruction';
import Icon from 'react-native-vector-icons/FontAwesome';
import { colors } from '../../../styles/common';
import BlockingActionModal from '../../UI/BlockingActionModal';
import { strings } from '../../../../locales/i18n';

interface Props {
	navigation: any;
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
		flexDirection: 'column',
		alignItems: 'center',
		paddingHorizontal: 32,
		paddingTop: 8,
	},
	close: {
		alignSelf: 'flex-end',
		width: 36,
		height: 36,
		alignItems: 'flex-end',
		justifyContent: 'flex-end',
	},
	qrcode: {
		alignSelf: 'flex-start',
	},
	error: {
		fontSize: 14,
		color: colors.red,
	},
});

const ConnectQRHardware = ({ navigation }: Props) => {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	const { KeyringController } = Engine.context;
	const [QRState, setQRState] = useState({
		sync: {
			reading: false,
		},
	});
	const [scannerVisible, setScannerVisible] = useState(false);
	const [blockingModalVisible, setBlockingModalVisible] = useState(false);
	const [accounts, setAccounts] = useState<{ address: string; index: number; checked: boolean }[]>([]);
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
		const _accounts = await KeyringController.connectQRHardware();
		setAccounts(_accounts);
	}, [KeyringController, resetError]);
	const onScanSuccess = useCallback(
		(ur: string) => {
			hideScanner();
			KeyringController.submitQRCryptoHDKey(ur);
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

	const enhancedAccounts = useMemo(
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
				};
			}),
		[accounts, checkedAccounts, existingAccounts]
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

	const onForget = useCallback(() => {
		resetError();
		KeyringController.forgetQRDevice();
	}, [KeyringController, resetError]);

	return (
		<Fragment>
			<View style={styles.container}>
				<TouchableOpacity onPress={navigation.goBack} style={styles.close}>
					<Icon name="close" size={18} />
				</TouchableOpacity>
				<Icon name="qrcode" size={42} style={styles.qrcode} />
				{errorMsg !== '' && <Text style={styles.error}>{errorMsg}</Text>}
				{accounts.length <= 0 ? (
					<ConnectQRInstruction onConnect={onConnectHardware} navigation={navigation} />
				) : (
					<SelectQRAccounts
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
