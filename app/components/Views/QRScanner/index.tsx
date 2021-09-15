/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

'use strict';
import React, { useRef, useCallback } from 'react';
import { InteractionManager, SafeAreaView, Image, Text, TouchableOpacity, View, StyleSheet, Alert } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { colors } from '../../../styles/common';
import Icon from 'react-native-vector-icons/Ionicons';
import { parse } from 'eth-url-parser';
import { strings } from '../../../../locales/i18n';
import SharedDeeplinkManager from '../../../core/DeeplinkManager';
import AppConstants from '../../../core/AppConstants';
import { failedSeedPhraseRequirements, isValidMnemonic } from '../../../util/validators';
import Engine from '../../../core/Engine';

// TODO: This file needs typings
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.black,
	},
	preview: {
		flex: 1,
	},
	innerView: {
		flex: 1,
	},
	closeIcon: {
		marginTop: 20,
		marginRight: 20,
		width: 40,
		alignSelf: 'flex-end',
	},
	frame: {
		width: 250,
		height: 250,
		alignSelf: 'center',
		justifyContent: 'center',
		marginTop: 100,
		opacity: 0.5,
	},
	text: {
		flex: 1,
		fontSize: 17,
		color: colors.white,
		textAlign: 'center',
		justifyContent: 'center',
		marginTop: 100,
	},
});

const frameImage = require('../../../images/frame.png'); // eslint-disable-line import/no-commonjs

interface Props {
	/**
	 * Object that represents the navigator
	 */
	navigation: any;
	/**
	 * Object that represents the current route info like params passed to it
	 */
	route: any;
}

/**
 * View that wraps the QR code scanner screen
 */
const QRScanner = ({ navigation, route }: Props) => {
	const { onScanError, onScanSuccess, onStartScan } = route.params;
	const mountedRef = useRef(true);
	const shouldReadBarCodeRef = useRef(true);

	const goBack = useCallback(() => {
		navigation.goBack();
		onScanError?.('USER_CANCELLED');
	}, [onScanError, navigation]);

	const end = useCallback(() => {
		mountedRef.current = false;
		navigation.goBack();
	}, [mountedRef, navigation]);

	const onBarCodeRead = useCallback(
		(response) => {
			const content = response.data;
			/**
			 * Barcode read triggers multiple times
			 * shouldReadBarCodeRef controls how often the logic below runs
			 * Think of this as a allow or disallow bar code reading
			 */
			if (!shouldReadBarCodeRef.current || !mountedRef.current || !content) {
				return;
			}

			let data = {};

			if (content.split('metamask-sync:').length > 1) {
				shouldReadBarCodeRef.current = false;
				data = { content };
				if (onStartScan) {
					onStartScan(data).then(() => {
						onScanSuccess(data);
					});
					mountedRef.current = false;
				} else {
					Alert.alert(strings('qr_scanner.error'), strings('qr_scanner.attempting_sync_from_wallet_error'));
					mountedRef.current = false;
				}
			} else {
				if (!failedSeedPhraseRequirements(content) && isValidMnemonic(content)) {
					shouldReadBarCodeRef.current = false;
					data = { seed: content };
					end();
					onScanSuccess(data, content);
					return;
				}

				const { KeyringController } = Engine.context;
				const isUnlocked = KeyringController.isUnlocked();

				if (!isUnlocked) {
					navigation.goBack();
					Alert.alert(
						strings('qr_scanner.error'),
						strings('qr_scanner.attempting_to_scan_with_wallet_locked')
					);
					mountedRef.current = false;
					return;
				}
				// Let ethereum:address go forward
				if (content.split('ethereum:').length > 1 && !parse(content).function_name) {
					shouldReadBarCodeRef.current = false;
					data = parse(content);
					const action = 'send-eth';
					data = { ...data, action };
					end();
					onScanSuccess(data, content);
					return;
				}

				// Checking if it can be handled like deeplinks
				const handledByDeeplink = SharedDeeplinkManager.parse(content, {
					origin: AppConstants.DEEPLINKS.ORIGIN_QR_CODE,
					onHandled: () => navigation.pop(2),
				});

				if (handledByDeeplink) {
					mountedRef.current = false;
					return;
				}

				// I can't be handled by deeplinks, checking other options
				if (
					content.length === 64 ||
					(content.substring(0, 2).toLowerCase() === '0x' && content.length === 66)
				) {
					shouldReadBarCodeRef.current = false;
					data = { private_key: content.length === 64 ? content : content.substr(2) };
				} else if (content.substring(0, 2).toLowerCase() === '0x') {
					shouldReadBarCodeRef.current = false;
					data = { target_address: content, action: 'send-eth' };
				} else if (content.split('wc:').length > 1) {
					shouldReadBarCodeRef.current = false;
					data = { walletConnectURI: content };
				} else {
					// EIP-945 allows scanning arbitrary data
					data = content;
				}
				onScanSuccess(data, content);
			}

			end();
		},
		[onStartScan, end, mountedRef, navigation, onScanSuccess]
	);

	const onError = useCallback(
		(error) => {
			navigation.goBack();
			InteractionManager.runAfterInteractions(() => {
				if (onScanError && error) {
					onScanError(error.message);
				}
			});
		},
		[onScanError, navigation]
	);

	const onStatusChange = useCallback(
		(event) => {
			if (event.cameraStatus === 'NOT_AUTHORIZED') {
				navigation.goBack();
			}
		},
		[navigation]
	);

	return (
		<View style={styles.container}>
			<RNCamera
				onMountError={onError}
				captureAudio={false}
				style={styles.preview}
				type={RNCamera.Constants.Type.back}
				onBarCodeRead={onBarCodeRead}
				flashMode={RNCamera.Constants.FlashMode.auto}
				androidCameraPermissionOptions={{
					title: strings('qr_scanner.allow_camera_dialog_title'),
					message: strings('qr_scanner.allow_camera_dialog_message'),
					buttonPositive: strings('qr_scanner.ok'),
					buttonNegative: strings('qr_scanner.cancel'),
				}}
				onStatusChange={onStatusChange}
			>
				<SafeAreaView style={styles.innerView}>
					<TouchableOpacity style={styles.closeIcon} onPress={goBack}>
						<Icon name={'ios-close'} size={50} color={'white'} />
					</TouchableOpacity>
					<Image source={frameImage} style={styles.frame} />
					<Text style={styles.text}>{strings('qr_scanner.scanning')}</Text>
				</SafeAreaView>
			</RNCamera>
		</View>
	);
};

export default QRScanner;
