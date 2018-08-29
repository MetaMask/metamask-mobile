import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { withNavigation } from 'react-navigation';
import { colors, fontStyles } from '../../styles/common';
import Icon from 'react-native-vector-icons/FontAwesome';

const styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		backgroundColor: colors.white,
		flex: 1,
		paddingTop: 30
	},
	field: {
		marginBottom: Platform.OS === 'android' ? 0 : 10
	},
	label: {
		fontSize: 16,
		marginBottom: Platform.OS === 'android' ? 0 : 10,
		marginTop: 10
	},
	input: {
		width: 300,
		height: 50,
		paddingRight: 40,
		borderWidth: Platform.OS === 'android' ? 0 : 1,
		borderColor: colors.borderColor,
		padding: 10,
		borderRadius: 4,
		fontSize: Platform.OS === 'android' ? 12 : 14,
		...fontStyles.normal
	},
	icon: {
		alignSelf: 'flex-end',
		marginTop: -40,
		marginRight: 5,
		width: 30,
		height: 30,
		color: colors.primary
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class SendScreen extends Component {
	static propTypes = {
		navigation: PropTypes.object
	};
	state = {
		to: '',
		fullTo: ''
	};

	onScanSuccess = ({ type, values }) => {
		if (type === 'address' && values.address) {
			const shortAddress = `${values.address.substr(0, 15)}...${values.address.substr(-15)}`;
			this.setState({ to: shortAddress, fullTo: values.address });
		}
	};

	showQrScanner = () => {
		this.props.navigation.navigate('QrScanner', {
			onScanSuccess: this.onScanSuccess
		});
	};
	render() {
		return (
			<View style={styles.wrapper}>
				<View style={styles.field}>
					<Text style={styles.label}>TO:</Text>
					<TextInput
						style={styles.input}
						value={this.state.to}
						onChangeText={val => this.setState({ password: val })} // eslint-disable-line  react/jsx-no-bind
						placeholder={'0x....'}
						underlineColorAndroid={colors.borderColor}
						testID={'input-password'}
					/>
					<Icon name="qrcode" onPress={this.showQrScanner} size={30} style={styles.icon} />
				</View>
			</View>
		);
	}
}

export default withNavigation(SendScreen);
