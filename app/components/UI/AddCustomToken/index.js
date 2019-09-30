import React, { PureComponent } from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { isValidAddress } from 'ethereumjs-util';
import ActionView from '../ActionView';
import { isSmartContractAddress } from '../../../util/transactions';

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
		borderColor: colors.grey100,
		padding: 16,
		...fontStyles.normal
	},
	warningText: {
		marginTop: 15,
		color: colors.red,
		...fontStyles.normal
	}
});

/**
 * Copmonent that provides ability to add custom tokens.
 */
export default class AddCustomToken extends PureComponent {
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

	addToken = async () => {
		if (!(await this.validateCustomToken())) return;
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

	onAddressBlur = async () => {
		const validated = await this.validateCustomTokenAddress();
		if (validated) {
			const address = this.state.address;
			const { AssetsContractController } = Engine.context;
			const decimals = await AssetsContractController.getTokenDecimals(address);
			const symbol = await AssetsContractController.getAssetSymbol(address);
			this.setState({ decimals: String(decimals), symbol });
		}
	};

	validateCustomTokenAddress = async () => {
		let validated = true;
		const address = this.state.address;
		const isValidTokenAddress = isValidAddress(address);
		const toSmartContract = isValidTokenAddress && (await isSmartContractAddress(address));
		if (address.length === 0) {
			this.setState({ warningAddress: strings('token.address_cant_be_empty') });
			validated = false;
		} else if (!isValidTokenAddress) {
			this.setState({ warningAddress: strings('token.address_must_be_valid') });
			validated = false;
		} else if (!toSmartContract) {
			this.setState({ warningAddress: strings('token.address_must_be_smart_contract') });
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

	validateCustomToken = async () => {
		const validatedAddress = await this.validateCustomTokenAddress();
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

	render = () => {
		const { address, symbol, decimals } = this.state;
		return (
			<View style={styles.wrapper} testID={'add-custom-token-screen'}>
				<ActionView
					cancelTestID={'add-custom-asset-cancel-button'}
					confirmTestID={'add-custom-asset-confirm-button'}
					cancelText={strings('add_asset.tokens.cancel_add_token')}
					confirmText={strings('add_asset.tokens.add_token')}
					onCancelPress={this.cancelAddToken}
					onConfirmPress={this.addToken}
					confirmDisabled={!(address && symbol && decimals)}
				>
					<View>
						<View style={styles.rowWrapper}>
							<Text style={fontStyles.normal}>{strings('token.token_address')}</Text>
							<TextInput
								style={styles.textInput}
								placeholder={'0x...'}
								placeholderTextColor={colors.grey100}
								value={this.state.address}
								onChangeText={this.onAddressChange}
								onBlur={this.onAddressBlur}
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
								placeholderTextColor={colors.grey100}
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
								placeholderTextColor={colors.grey100}
								onChangeText={this.onDecimalsChange}
								onBlur={this.validateCustomTokenDecimals}
								testID={'input-token-decimals'}
								ref={this.assetPrecisionInput}
								onSubmitEditing={this.addToken}
								returnKeyType={'done'}
							/>
							<Text style={styles.warningText}>{this.state.warningDecimals}</Text>
						</View>
					</View>
				</ActionView>
			</View>
		);
	};
}
