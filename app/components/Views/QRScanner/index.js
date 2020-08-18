'use strict';
import React, { PureComponent } from 'react';
import { InteractionManager, SafeAreaView, Image, Text, TouchableOpacity, View, StyleSheet, Alert } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { colors } from '../../../styles/common';
import Icon from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';
import { parse } from 'eth-url-parser';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.black
	},
	preview: {
		flex: 1
	},
	innerView: {
		flex: 1
	},
	closeIcon: {
		marginTop: 20,
		marginRight: 20,
		width: 40,
		alignSelf: 'flex-end'
	},
	frame: {
		width: 250,
		height: 250,
		alignSelf: 'center',
		justifyContent: 'center',
		marginTop: 100,
		opacity: 0.5
	},
	text: {
		flex: 1,
		fontSize: 17,
		color: colors.white,
		textAlign: 'center',
		justifyContent: 'center',
		marginTop: 100
	}
});

const frameImage = require('../../../images/frame.png'); // eslint-disable-line import/no-commonjs

/**
 * View that wraps the QR code scanner screen
 */
export default class QrScanner extends PureComponent {
	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object
	};

	mounted = false;
	shouldReadBarCode = true;

	componentDidMount() {
		this.mounted = true;
	}

	goBack = () => {
		this.props.navigation.goBack();
		if (this.props.navigation.state.params.onScanError) {
			this.props.navigation.state.params.onScanError('USER_CANCELLED');
		}
	};

	onBarCodeRead = response => {
		if (!this.mounted) return false;
		const content = response.data;

		if (!content) return false;

		let data = {};

		if (content.split('metamask-sync:').length > 1) {
			this.shouldReadBarCode = false;
			data = { content };
			if (this.props.navigation.state.params.onStartScan) {
				this.props.navigation.state.params.onStartScan(data).then(() => {
					this.props.navigation.state.params.onScanSuccess(data);
				});
				this.mounted = false;
				this.props.navigation.goBack();
			} else {
				Alert.alert(strings('qr_scanner.error'), strings('qr_scanner.attempting_sync_from_wallet_error'));
				this.mounted = false;
				this.props.navigation.goBack();
			}
		} else {
			if (content.split('ethereum:').length > 1) {
				this.shouldReadBarCode = false;
				data = parse(content);
				let action = 'send-eth';
				if (data.function_name === 'transfer') {
					// Send erc20 token
					action = 'send-token';
				}
				data = { ...data, action };
			} else if (
				content.length === 64 ||
				(content.substring(0, 2).toLowerCase() === '0x' && content.length === 66)
			) {
				this.shouldReadBarCode = false;
				data = { private_key: content.length === 64 ? content : content.substr(2) };
			} else if (content.substring(0, 2).toLowerCase() === '0x') {
				this.shouldReadBarCode = false;
				data = { target_address: content, action: 'send-eth' };
			} else if (content.split('wc:').length > 1) {
				this.shouldReadBarCode = false;
				data = { walletConnectURI: content };
			} else if (content.split(' ').length === 12) {
				this.shouldReadBarCode = false;
				data = { seed: content };
			} else {
				// EIP-945 allows scanning arbitrary data
				data = content;
			}
			this.mounted = false;
			this.props.navigation.goBack();
			this.props.navigation.state.params.onScanSuccess(data);
		}
	};

	onError = error => {
		this.props.navigation.goBack();
		InteractionManager.runAfterInteractions(() => {
			if (this.props.navigation.state.params.onScanError && error) {
				this.props.navigation.state.params.onScanError(error.message);
			}
		});
	};

	onStatusChange = event => {
		if (event.cameraStatus === 'NOT_AUTHORIZED') {
			this.props.navigation.goBack();
		}
	};

	render = () => (
		<View style={styles.container}>
			<RNCamera
				onMountError={this.onError}
				captureAudio={false}
				style={styles.preview}
				type={RNCamera.Constants.Type.back}
				onBarCodeRead={this.shouldReadBarCode ? this.onBarCodeRead : null}
				flashMode={RNCamera.Constants.FlashMode.auto}
				androidCameraPermissionOptions={{
					title: strings('qr_scanner.allow_camera_dialog_title'),
					message: strings('qr_scanner.allow_camera_dialog_message'),
					buttonPositive: strings('qr_scanner.ok'),
					buttonNegative: strings('qr_scanner.cancel')
				}}
				onStatusChange={this.onStatusChange}
			>
				<SafeAreaView style={styles.innerView}>
					<TouchableOpacity style={styles.closeIcon} onPress={this.goBack}>
						<Icon name={'ios-close'} size={50} color={'white'} />
					</TouchableOpacity>
					<Image source={frameImage} style={styles.frame} />
					<Text style={styles.text}>{strings('qr_scanner.scanning')}</Text>
				</SafeAreaView>
			</RNCamera>
		</View>
	);
}
