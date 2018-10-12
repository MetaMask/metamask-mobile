'use strict';
import React, { Component } from 'react';
import { InteractionManager, SafeAreaView, Alert, Image, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { colors } from '../../styles/common';
import Icon from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';
import { parse } from 'eth-url-parser';
import { strings } from '../../../locales/i18n';

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

const frameImage = require('../../images/frame.png'); // eslint-disable-line import/no-commonjs

/**
 * View that wraps the QR code scanner screen
 */
export default class QrScanner extends Component {
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
	};

	onBarCodeRead = response => {
		if (!this.mounted) return false;
		const content = response.data;

		let data = {};

		if (content.split('ethereum:').length > 1) {
			this.shouldReadBarCode = false;
			data = parse(content);
		} else if (content.substring(0, 2).toLowerCase() === '0x') {
			this.shouldReadBarCode = false;
			data = { target_address: content };
		} else if (content.split('metamask-sync:').length > 1) {
			this.shouldReadBarCode = false;
			data = { content };
		} else {
			Alert.alert(strings('qrScanner.invalidQrCodeTitle'), strings('qrScanner.invalidQrCodeMessage'));
			return false;
		}
		this.mounted = false;
		this.props.navigation.goBack();
		InteractionManager.runAfterInteractions(() => {
			this.props.navigation.state.params.onScanSuccess(data);
		});
	};

	render() {
		return (
			<View style={styles.container}>
				<RNCamera
					style={styles.preview}
					type={'back'}
					onBarCodeRead={this.shouldReadBarCode ? this.onBarCodeRead : null}
					flashMode={'auto'}
					permissionDialogTitle={strings('qrScanner.allowCameraDialogTitle')}
					permissionDialogMessage={strings('qrScanner.allowCameraDialogMessage')}
				>
					<SafeAreaView style={styles.innerView}>
						<TouchableOpacity style={styles.closeIcon} onPress={this.goBack}>
							<Icon name={'ios-close'} size={50} color={'white'} />
						</TouchableOpacity>
						<Image source={frameImage} style={styles.frame} />
						<Text style={styles.text}>{strings('qrScanner.scanning')}</Text>
					</SafeAreaView>
				</RNCamera>
			</View>
		);
	}
}
