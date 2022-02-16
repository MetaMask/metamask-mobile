import React, { Fragment, useCallback, useMemo, useState } from 'react';
import Engine from '../../../core/Engine';
import { StyleSheet, Text, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import AnimatedQRCode from './AnimatedQRCode';
import AnimatedQRScannerModal from './AnimatedQRScanner';
import { colors, fontStyles } from '../../../styles/common';
import AccountInfoCard from '../AccountInfoCard';
import ActionView from '../ActionView';

interface IQRSigningDetails {
	QRState: {
		sign: {
			request?: {
				requestId: string;
				payload: {
					cbor: string;
					type: string;
				};
			};
		};
	};
	successCallback?: () => void;
	failureCallback?: (error: string) => void;
	cancelCallback?: () => void;
	confirmButtonMode?: 'normal' | 'sign' | 'confirm';
	showCancelButton?: boolean;
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
});

const QRSigningDetails = ({
	QRState,
	successCallback,
	failureCallback,
	cancelCallback,
	confirmButtonMode = 'confirm',
	showCancelButton = false,
}: IQRSigningDetails) => {
	const KeyringController = useMemo(() => {
		const { KeyringController: keyring } = Engine.context as any;
		return keyring;
	}, []);
	const [scannerVisible, setScannerVisible] = useState(false);
	const showScanner = useCallback(() => {
		setScannerVisible(true);
	}, []);
	const hideScanner = useCallback(() => {
		setScannerVisible(false);
	}, []);

	const onCancel = useCallback(async () => {
		await KeyringController.cancelQRHardwareSignRequest();
		hideScanner();
		cancelCallback?.();
	}, [KeyringController, hideScanner, cancelCallback]);

	const onScanSuccess = useCallback(
		(ur: string) => {
			hideScanner();
			KeyringController.submitQRHardwareSignature(QRState.sign.request?.requestId as string, ur);
			successCallback?.();
		},
		[KeyringController, QRState.sign.request?.requestId, hideScanner, successCallback]
	);
	const onScanError = useCallback(
		(error: string) => {
			hideScanner();
			failureCallback?.(error);
		},
		[failureCallback, hideScanner]
	);

	return (
		<Fragment>
			{QRState?.sign?.request && (
				<View style={styles.wrapper}>
					<ActionView
						showCancelButton={showCancelButton}
						confirmButtonMode={confirmButtonMode}
						cancelText={strings('transaction.reject')}
						confirmText={strings('transactions.sign_get_signature')}
						onCancelPress={onCancel}
						onConfirmPress={showScanner}
					>
						<View style={styles.container}>
							<AccountInfoCard />
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
					</ActionView>
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

export default QRSigningDetails;
