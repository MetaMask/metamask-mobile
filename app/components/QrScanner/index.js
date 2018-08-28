'use strict';
import React, { Component } from 'react';
import { Alert, Image, Text, TouchableOpacity, View, Dimensions, StyleSheet } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { colors } from '../../styles/common';
import Icon from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'column',
		backgroundColor: colors.black
	},
	preview: {
		flex: 1,
		justifyContent: 'flex-end',
		alignItems: 'center'
	},
	innerView: {
		flex: 1
	},
	closeIcon: {
		marginTop: 20,
		marginLeft: 10,
		width: 40
	},
	frame: {
		position: 'absolute',
		top: Dimensions.get('window').height / 2 - 100,
		width: Dimensions.get('window').width * 0.8,
		height: 200,
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
		marginTop: Dimensions.get('window').height / 2 - 80
	}
});

export default class QrScanner extends Component {
	static propTypes = {
		navigation: PropTypes.object
	};

	goBack = () => {
		this.props.navigation.goBack();
	};
	onBarcodeRead = response => {
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
			Alert.alert('Invalid QR Code', 'The QR code that you are trying to scan it is not valid.');
		}

		this.props.navigation.getParam('onScanSuccess').call({ type, values });
	};
	render() {
		return (
			<View style={styles.container}>
				<RNCamera
					style={styles.preview}
					type={RNCamera.Constants.Type.back}
					flashMode={RNCamera.Constants.FlashMode.auto}
					permissionDialogTitle={'Allow camera access'}
					permissionDialogMessage={'We need your permission to scan QR codes'}
				>
					<View style={styles.innerView}>
						<TouchableOpacity style={styles.closeIcon} onPress={this.goBack}>
							<Icon name={'ios-close-outline'} size={40} color={'white'} />
						</TouchableOpacity>
						<Image source={require('../../images/frame.png')} style={styles.frame} />
						<Text style={styles.text}>scanning...</Text>
					</View>
				</RNCamera>
			</View>
		);
	}
}
