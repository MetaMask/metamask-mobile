import React, { Component } from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
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
		padding: 16,
		...fontStyles.normal
	},
	warningText: {
		color: colors.error,
		...fontStyles.normal
	}
});

/**
 * Copmonent that provides ability to add custom tokens.
 */
export default class AddCustomToken extends Component {
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
		const { AssetsController } = Engine.context;
		const { address, symbol, decimals } = this.state;
		AssetsController.addToken(address, symbol, decimals);
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
			this.setState({ warningAddress: strings('token.address_cant_be_empty') });
			validated = false;
		} else if (!isValidAddress(address)) {
			this.setState({ warningAddress: strings('token.address_must_be_valid') });
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
			this.setState({ warningSymbol: strings('token.symbol_cant_be_empty') });
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
			this.setState({ warningDecimals: strings('token.decimals_cant_be_empty') });
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

	assetSymbolInput = React.createRef();
	assetPrecisionInput = React.createRef();

	jumpToAssetSymbol = () => {
		const { current } = this.assetSymbolInput;
		current && current.focus();
	};

	jumpToAssetPrecision = () => {
		const { current } = this.assetPrecisionInput;
		current && current.focus();
	};

	render = () => (
		<View style={styles.wrapper} testID={'add-custom-token-screen'}>
			<ActionView
				cancelTestID={'add-custom-asset-cancel-button'}
				confirmTestID={'add-custom-asset-confirm-button'}
				cancelText={strings('add_asset.tokens.cancel_add_token')}
				confirmText={strings('add_asset.tokens.add_token')}
				onCancelPress={this.cancelAddToken}
				onConfirmPress={this.addToken}
			>
				<View style={styles.rowWrapper}>
					<Text style={fontStyles.normal}>{strings('token.token_address')}</Text>
					<TextInput
						style={styles.textInput}
						placeholder={'0x...'}
						value={this.state.address}
						onChangeText={this.onAddressChange}
						onBlur={this.validateCustomTokenAddress}
						testID={'input-token-address'}
						onSubmitEditing={this.jumpToAssetSymbol}
						returnKeyType={'next'}
					/>
					<Text style={styles.warningText}>{this.state.warningAddress}</Text>
				</View>
				<View style={styles.rowWrapper}>
					<Text style={fontStyles.normal}>{strings('token.token_symbol')}</Text>
					<TextInput
						style={styles.textInput}
						placeholder={'GNO'}
						value={this.state.symbol}
						onChangeText={this.onSymbolChange}
						onBlur={this.validateCustomTokenSymbol}
						testID={'input-token-symbol'}
						ref={this.assetSymbolInput}
						onSubmitEditing={this.jumpToAssetPrecision}
						returnKeyType={'next'}
					/>
					<Text style={styles.warningText}>{this.state.warningSymbol}</Text>
				</View>
				<View style={styles.rowWrapper}>
					<Text style={fontStyles.normal}>{strings('token.token_precision')}</Text>
					<TextInput
						style={styles.textInput}
						value={this.state.decimals}
						keyboardType="numeric"
						maxLength={2}
						placeholder={'18'}
						onChangeText={this.onDecimalsChange}
						onBlur={this.validateCustomTokenDecimals}
						testID={'input-token-decimals'}
						ref={this.assetPrecisionInput}
						onSubmitEditing={this.addToken}
						returnKeyType={'done'}
					/>
					<Text style={styles.warningText}>{this.state.warningDecimals}</Text>
				</View>
			</ActionView>
		</View>
	);
}
