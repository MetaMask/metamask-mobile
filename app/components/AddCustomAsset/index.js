import React, { Component } from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import { colors } from '../../styles/common';
import Engine from '../../core/Engine';
import PropTypes from 'prop-types';
import { strings } from '../../../locales/i18n';
import { isValidAddress } from 'ethereumjs-util';
import ActionView from '../ActionView';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	rowWrapper: {
		padding: 20
	},
	textInput: {
		borderWidth: 1,
		borderRadius: 4,
		borderColor: colors.borderColor,
		padding: 16
	},
	warningText: {
		color: colors.error
	}
});

/**
 * Copmonent that provides ability to add custom assets.
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

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};

	addToken = () => {
		if (!this.validateCustomToken()) return;
		const { PreferencesController } = Engine.context;
		const { address, symbol, decimals } = this.state;
		PreferencesController.addToken(address, symbol, decimals);
		this.props.navigation.goBack();
	};

	cancelAddToken = () => {
		this.props.navigation.goBack();
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

	validateCustomTokenAddress = () => {
		let validated = true;
		const address = this.state.address;
		if (address.length === 0) {
			this.setState({ warningAddress: `Token address can't be empty.` });
			validated = false;
		} else if (!isValidAddress(address)) {
			this.setState({ warningAddress: `Token address have to be a valid address.` });
			validated = false;
		} else {
			this.setState({ warningAddress: `` });
		}
		return validated;
	};

	validateCustomTokenSymbol = () => {
		let validated = true;
		const symbol = this.state.symbol;
		if (symbol.length === 0) {
			this.setState({ warningSymbol: `Token symbol can't be empty.` });
			validated = false;
		} else {
			this.setState({ warningSymbol: `` });
		}
		return validated;
	};

	validateCustomTokenDecimals = () => {
		let validated = true;
		const decimals = this.state.decimals;
		if (decimals.length === 0) {
			this.setState({ warningDecimals: `Token precision can't be empty.` });
			validated = false;
		} else {
			this.setState({ warningDecimals: `` });
		}
		return validated;
	};

	validateCustomToken = () => {
		const validatedAddress = this.validateCustomTokenAddress();
		const validatedSymbol = this.validateCustomTokenSymbol();
		const validatedDecimals = this.validateCustomTokenDecimals();
		return validatedAddress && validatedSymbol && validatedDecimals;
	};

	render() {
		return (
			<View style={styles.wrapper} testID={'add-custom-token-screen'}>
				<ActionView
					confirmButtonMode={'confirm'}
					cancelText={strings('wallet.cancel_add_token')}
					confirmText={strings('wallet.add_token')}
					onCancelPress={this.cancelAddToken}
					onConfirmPress={this.addToken}
				>
					<View style={styles.rowWrapper}>
						<Text>{strings('token.token_address')}</Text>
						<TextInput
							style={styles.textInput}
							placeholder={'0x...'}
							value={this.state.address}
							onChangeText={this.onAddressChange}
							onBlur={this.validateCustomTokenAddress}
						/>
						<Text style={styles.warningText}>{this.state.warningAddress}</Text>
					</View>
					<View style={styles.rowWrapper}>
						<Text>{strings('token.token_symbol')}</Text>
						<TextInput
							style={styles.textInput}
							placeholder={'GNO'}
							value={this.state.symbol}
							onChangeText={this.onSymbolChange}
							onBlur={this.validateCustomTokenSymbol}
						/>
						<Text style={styles.warningText}>{this.state.warningSymbol}</Text>
					</View>
					<View style={styles.rowWrapper}>
						<Text>{strings('token.token_precision')}</Text>
						<TextInput
							style={styles.textInput}
							value={this.state.decimals}
							keyboardType="numeric"
							maxLength={2}
							placeholder={'18'}
							onChangeText={this.onDecimalsChange}
							onBlur={this.validateCustomTokenDecimals}
						/>
						<Text style={styles.warningText}>{this.state.warningDecimals}</Text>
					</View>
				</ActionView>
			</View>
		);
	}
}
