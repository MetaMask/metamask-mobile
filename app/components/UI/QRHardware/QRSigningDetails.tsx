import React, { Fragment, useCallback, useMemo, useState } from 'react';
import Engine from '../../../core/Engine';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { strings } from '../../../../locales/i18n';
import AnimatedQRCode from './AnimatedQRCode';
import AnimatedQRScannerModal from './AnimatedQRScanner';
import { colors, fontStyles } from '../../../styles/common';
import AccountInfoCard from '../AccountInfoCard';
import ActionView from '../ActionView';
import { IQRState } from './types';
import { UR } from '@ngraveio/bc-ur';
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';
import { stringify as uuidStringify } from 'uuid';
import Alert, { AlertType } from '../../Base/Alert';
import AnalyticsV2 from '../../../util/analyticsV2';

interface IQRSigningDetails {
	QRState: IQRState;
	successCallback?: () => void;
	failureCallback?: (error: string) => void;
	cancelCallback?: () => void;
	confirmButtonMode?: 'normal' | 'sign' | 'confirm';
	showCancelButton?: boolean;
	tighten?: boolean;
	showHint?: boolean;
}

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		paddingBottom: 48,
	},
	container: {
		flex: 1,
		width: '100%',
		flexDirection: 'column',
		alignItems: 'center',
		paddingHorizontal: 32,
		backgroundColor: colors.white,
	},
	containerTighten: {
		paddingHorizontal: 8,
	},
	title: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginTop: 54,
		marginBottom: 30,
	},
	titleTighten: {
		marginTop: 12,
		marginBottom: 6,
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
	descriptionTighten: {
		marginVertical: 24,
		fontSize: 12,
	},
	padding: {
		height: 40,
	},
	descriptionText: {
		fontFamily: fontStyles.normal.fontFamily,
		fontWeight: 'normal',
		fontSize: 14,
		color: colors.black,
	},
	descriptionTextTighten: {
		fontSize: 12,
	},
	errorText: {
		fontSize: 12,
		color: colors.red,
	},
	alert: {
		marginTop: 12,
	},
});

const QRSigningDetails = ({
	QRState,
	successCallback,
	failureCallback,
	cancelCallback,
	confirmButtonMode = 'confirm',
	showCancelButton = false,
	tighten = false,
	showHint = true,
}: IQRSigningDetails) => {
	const KeyringController = useMemo(() => {
		const { KeyringController: keyring } = Engine.context as any;
		return keyring;
	}, []);
	const [scannerVisible, setScannerVisible] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const resetError = useCallback(() => {
		setErrorMessage('');
	}, []);

	const showScanner = useCallback(() => {
		setScannerVisible(true);
		resetError();
	}, [resetError]);

	const hideScanner = useCallback(() => {
		setScannerVisible(false);
	}, []);

	const onCancel = useCallback(async () => {
		await KeyringController.cancelQRSignRequest();
		hideScanner();
		cancelCallback?.();
	}, [KeyringController, hideScanner, cancelCallback]);

	const onScanSuccess = useCallback(
		(ur: UR) => {
			hideScanner();
			const signature = ETHSignature.fromCBOR(ur.cbor);
			const buffer = signature.getRequestId();
			const requestId = uuidStringify(buffer);
			if (QRState.sign.request?.requestId === requestId) {
				KeyringController.submitQRSignature(QRState.sign.request?.requestId as string, ur.cbor.toString('hex'));
				successCallback?.();
			} else {
				AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.HARDWARE_WALLET_ERROR, {
					error: 'received signature request id is not matched with origin request',
				});
				setErrorMessage(strings('transaction.mismatched_qr_request_id'));
				failureCallback?.(strings('transaction.mismatched_qr_request_id'));
			}
		},
		[KeyringController, QRState.sign.request?.requestId, failureCallback, hideScanner, successCallback]
	);
	const onScanError = useCallback(
		(_errorMessage: string) => {
			hideScanner();
			setErrorMessage(_errorMessage);
			failureCallback?.(_errorMessage);
		},
		[failureCallback, hideScanner]
	);

	const renderAlert = () =>
		errorMessage !== '' && (
			<Alert type={AlertType.Error} onPress={resetError} style={styles.alert}>
				<Text style={styles.errorText}>{errorMessage}</Text>
			</Alert>
		);

	return (
		<Fragment>
			{QRState?.sign?.request && (
				<ScrollView contentContainerStyle={styles.wrapper}>
					<ActionView
						showCancelButton={showCancelButton}
						confirmButtonMode={confirmButtonMode}
						cancelText={strings('transaction.reject')}
						confirmText={strings('transactions.sign_get_signature')}
						onCancelPress={onCancel}
						onConfirmPress={showScanner}
					>
						<View style={[styles.container, tighten ? styles.containerTighten : undefined]}>
							<AccountInfoCard showFiatBalance={false} />
							{renderAlert()}
							<View style={[styles.title, tighten ? styles.titleTighten : undefined]}>
								<Text style={styles.titleStrong}>{strings('transactions.sign_title_scan')}</Text>
								<Text style={styles.titleText}>{strings('transactions.sign_title_device')}</Text>
							</View>
							<AnimatedQRCode
								cbor={QRState.sign.request.payload.cbor}
								type={QRState.sign.request.payload.type}
							/>
							{showHint ? (
								<View style={[styles.description, tighten ? styles.descriptionTighten : undefined]}>
									<Text
										style={[
											styles.descriptionText,
											tighten ? styles.descriptionTextTighten : undefined,
										]}
									>
										{strings('transactions.sign_description_1')}
									</Text>
									<Text
										style={[
											styles.descriptionText,
											tighten ? styles.descriptionTextTighten : undefined,
										]}
									>
										{strings('transactions.sign_description_2')}
									</Text>
								</View>
							) : !tighten ? (
								<View style={styles.padding} />
							) : null}
						</View>
					</ActionView>
				</ScrollView>
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
