import React, { useState, Fragment, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Engine from '../../../../core/Engine';
import AnimatedQRScannerModal from '../../ConnectQRHardware/AnimatedQRScanner';
import AnimatedQRCode from './AnimatedQRCode';
import StyledButton from '../../../UI/StyledButton/index.android';
import { AddressFrom } from '../AddressInputs';
import { getSendFlowTitle } from '../../../UI/Navbar';
import { strings } from '../../../../../locales/i18n';
import { colors, fontStyles } from '../../../../styles/common';

interface IConnectQRHardwareProps {
	navigation: any;
	route: any;
}

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white,
	},
	container: {
		flex: 1,
		width: '100%',
		flexDirection: 'column',
		alignItems: 'center',
		paddingHorizontal: 32,
		backgroundColor: colors.white,
	},
	input: {
		width: '100%',
		marginTop: 30,
		backgroundColor: colors.white,
	},
	title: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginTop: 54,
		marginBottom: 30,
	},
	titleStrong: {
		fontFamily: fontStyles.normal.fontFamily,
		fontWeight: 'bold',
		color: colors.black,
	},
	titleText: {
		fontFamily: fontStyles.normal.fontFamily,
		fontWeight: 'normal',
		color: colors.black,
	},
	description: {
		marginVertical: 54,
		alignItems: 'center',
		...fontStyles.normal,
		fontSize: 14,
	},
	descriptionText: {
		fontFamily: fontStyles.normal.fontFamily,
		fontWeight: 'normal',
		fontSize: 14,
		color: colors.black,
	},
	buttonSignature: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		marginBottom: 16,
	},
	buttonSignatureText: {
		flex: 1,
		marginHorizontal: 24,
		alignSelf: 'flex-end',
	},
});

const QRHardwareSigner = ({ navigation, route }: IConnectQRHardwareProps) => {
	const KeyringController = useMemo(() => {
		const { KeyringController: keyring } = Engine.context as any;
		return keyring;
	}, []);
	const QRState = route.params?.QRState;
	const { fromSelectedAddress, fromAccountName, fromAccountBalance } = route.params?.from;
	const [scannerVisible, setScannerVisible] = useState(false);
	const showScanner = useCallback(() => {
		setScannerVisible(true);
	}, []);
	const hideScanner = useCallback(() => {
		setScannerVisible(false);
	}, []);

	const onScanSuccess = useCallback(
		(ur: string) => {
			hideScanner();
			KeyringController.submitQRHardwareSignature(QRState.sign.request?.requestId, ur);
			navigation.goBack();
		},
		[KeyringController, QRState.sign.request?.requestId, hideScanner, navigation]
	);
	const onScanError = useCallback(() => {
		hideScanner();
	}, [hideScanner]);

	return (
		<Fragment>
			{QRState?.sign?.request && (
				<View style={styles.wrapper}>
					<View style={styles.container}>
						<View style={styles.input}>
							<AddressFrom
								fromAccountAddress={fromSelectedAddress}
								fromAccountName={fromAccountName}
								fromAccountBalance={fromAccountBalance}
								shouldShowFromLabel={false}
								accountLabel={strings('transactions.sign_account_label')}
								accountNameHighlighted
							/>
						</View>
						<View style={styles.title}>
							<Text style={styles.titleStrong}>{strings('transactions.sign_title_scan')}</Text>
							<Text style={styles.titleText}>{strings('transactions.sign_title_device')}</Text>
						</View>
						<AnimatedQRCode
							cbor={QRState.sign.request.payload.cbor}
							type={QRState.sign.request.payload.type}
						/>
						<View style={styles.description}>
							<Text style={styles.descriptionText}>{strings('transactions.sign_description_1')}</Text>
							<Text style={styles.descriptionText}>{strings('transactions.sign_description_2')}</Text>
						</View>
					</View>
					<View style={styles.buttonSignature}>
						<StyledButton type={'sign'} containerStyle={styles.buttonSignatureText} onPress={showScanner}>
							{strings('transactions.sign_get_signature')}
						</StyledButton>
					</View>
				</View>
			)}
			<AnimatedQRScannerModal
				visible={scannerVisible}
				purpose={'sign'}
				onScanSuccess={onScanSuccess}
				onScanError={onScanError}
				hideModal={hideScanner}
			/>
		</Fragment>
	);
};

QRHardwareSigner.navigationOptions = ({ navigation, route }: IConnectQRHardwareProps) =>
	getSendFlowTitle('send.sign', navigation, route);

export default QRHardwareSigner;
