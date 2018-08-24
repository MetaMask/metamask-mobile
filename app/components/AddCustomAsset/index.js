import React, { Component } from 'react';
import { Text, TextInput, View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import Engine from '../../core/Engine';
import PropTypes from 'prop-types';
const isValidAddress = require('ethereumjs-util').isValidAddress;

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 20
	},
	textInput: {
		borderWidth: 1,
		borderRadius: 4,
		borderColor: colors.borderColor,
		padding: 16
	},
	textAddToken: {
		color: colors.primary
	},
	button: {
		alignItems: 'center',
		padding: 16,
		borderWidth: 2,
		borderRadius: 4,
		width: '45%',
		marginTop: 10,
		marginBottom: 10
	},
	buttonCancel: {
		borderColor: colors.asphalt
	},
	buttonAddToken: {
		backgroundColor: colors.white,
		borderColor: colors.primary
	},
	footer: {
		flexDirection: 'row',
		justifyContent: 'space-evenly',
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		borderTopWidth: 1,
		borderColor: colors.borderColor
	},
	warningText: {
		color: colors.primaryFox
	}
});

/**
 * View that provides ability to add custom assets.
 */
export default class AddCustomAsset extends Component {
	state = {
		address: '',
		symbol: '',
		decimals: '',
		warningAddress: '',
		warningSymbol: '',
		warningDecimals: ''
	};

	static navigationOptions = {
		title: 'Custom Token',
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	};

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};

	addToken = () => {
		if (!this.validateCustomToken()) return;
		const { PreferencesController } = Engine.context;
		PreferencesController.addToken(this.state.address, this.state.symbol, this.state.decimals);
		this.props.navigation.push('Wallet');
	};

	cancelAddToken = () => {
		this.props.navigation.push('Wallet');
	};

	onAddressChange = address => {
		this.setState({ address });
	};

	onSymbolChange = symbol => {
		this.setState({ symbol });
	};

	onDecimalsChange = decimals => {
		this.setState({ decimals });
	};

	validateCustomToken = () => {
		let validated = true;
		if (this.state.address.length === 0) {
			this.setState({ warningAddress: `Token address can't be empty.` });
			validated = false;
		} else if (!isValidAddress(this.state.address)) {
			this.setState({ warningAddress: `Token address have to be a valid address.` });
			validated = false;
		} else {
			this.setState({ warningAddress: `` });
		}
		if (this.state.symbol.length === 0) {
			this.setState({ warningSymbol: `Token symbol can't be empty.` });
			validated = false;
		} else {
			this.setState({ warningSymbol: `` });
		}
		if (this.state.decimals.length === 0) {
			this.setState({ warningDecimals: `Token precision can't be empty.` });
			validated = false;
		} else {
			this.setState({ warningDecimals: `` });
		}
		return validated;
	};

	render() {
		return (
			<View style={styles.wrapper} testID={'add-custom-token-screen'}>
				<Text>Token Address</Text>
				<TextInput style={styles.textInput} value={this.state.address} onChangeText={this.onAddressChange} />
				<Text style={styles.warningText}>{this.state.warningAddress}</Text>

				<Text>Token Symbol</Text>
				<TextInput style={styles.textInput} value={this.state.symbol} onChangeText={this.onSymbolChange} />
				<Text style={styles.warningText}>{this.state.warningSymbol}</Text>

				<Text>Token of Precision</Text>
				<TextInput
					style={styles.textInput}
					value={this.state.decimals}
					keyboardType="numeric"
					maxLength={2}
					onChangeText={this.onDecimalsChange}
				/>
				<Text style={styles.warningText}>{this.state.warningDecimals}</Text>

				<View style={styles.footer}>
					<TouchableOpacity style={[styles.buttonCancel, styles.button]} onPress={this.cancelAddToken}>
						<Text>CANCEL</Text>
					</TouchableOpacity>
					<TouchableOpacity style={[styles.buttonAddToken, styles.button]} onPress={this.addToken}>
						<Text style={styles.textAddToken}>ADD TOKEN</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}
}
