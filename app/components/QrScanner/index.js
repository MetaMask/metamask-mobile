'use strict';
import React, { Component } from 'react';
import { SafeAreaView, Alert, Image, Text, TouchableOpacity, View, Dimensions, StyleSheet } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { colors } from '../../styles/common';
import Icon from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';
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
		position: 'absolute',
		top: Dimensions.get('window').height / 2 - 150,
		width: Dimensions.get('window').width * 0.8,
		height: Dimensions.get('window').width * 0.8,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: Dimensions.get('window').width * 0.1,
		marginRight: Dimensions.get('window').width * 0.1,
		opacity: 0.5
	},
	text: {
		flex: 1,
		fontSize: 17,
		color: colors.white,
		textAlign: 'center',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: Dimensions.get('window').height / 2 + 150
	}
});

export default class QrScanner extends Component {
	static propTypes = {
		navigation: PropTypes.object
	};

	goBack = () => {
		this.props.navigation.goBack();
	};
	onBarCodeRead = response => {
		const content = response.data;

		let type = 'unknown';
		let values = {};
		// Here we could add more cases
		// To parse other type of links
		// For ex. EIP-681 (https://eips.ethereum.org/EIPS/eip-681)
		// Ethereum address links - fox ex. ethereum:0x.....1111
		if (content.split('ethereum:').length > 1) {
			type = 'address';
			values = { address: content.split('ethereum:')[1] };
			// Regular ethereum addresses - fox ex. 0x.....1111
		} else if (content.substring(0, 2).toLowerCase() === '0x') {
			type = 'address';
			values = { address: content };
		} else {
			Alert.alert(strings('qrScanner.invalidQrCodeTitle'), strings('qrScanner.invalidQrCodeMessage'));
		}
		this.props.navigation.state.params.onScanSuccess({ type, values });
		this.props.navigation.goBack();
	};
	render() {
		return (
			<View style={styles.container}>
				<RNCamera
					style={styles.preview}
					type={'back'}
					onBarCodeRead={this.onBarCodeRead}
					flashMode={'auto'}
					permissionDialogTitle={strings('qrScanner.allowCameraDialogTitle')}
					permissionDialogMessage={strings('qrScanner.allowCameraDialogMessage')}
				>
					<SafeAreaView style={styles.innerView}>
						<TouchableOpacity style={styles.closeIcon} onPress={this.goBack}>
							<Icon name={'ios-close'} size={50} color={'white'} />
						</TouchableOpacity>
						<Image source={require('../../images/frame.png')} style={styles.frame} />
						<Text style={styles.text}>{strings('qrScanner.scanning')}</Text>
					</SafeAreaView>
				</RNCamera>
			</View>
		);
	}
}
