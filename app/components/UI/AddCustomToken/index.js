import React, { PureComponent } from 'react';
import { Text, TextInput, View, StyleSheet, InteractionManager } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { isValidAddress } from 'ethereumjs-util';
import ActionView from '../ActionView';
import { isSmartContractAddress } from '../../../util/transactions';
import AnalyticsV2 from '../../../util/analyticsV2';
import WarningMessage from '../../Views/SendFlow/WarningMessage';
import AppConstants from '../../../core/AppConstants';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
	rowWrapper: {
		padding: 20,
	},
	textInput: {
		borderWidth: 1,
		borderRadius: 4,
		borderColor: colors.grey100,
		padding: 16,
		...fontStyles.normal,
	},
	warningText: {
		marginTop: 15,
		color: colors.red,
		...fontStyles.normal,
	},
	warningContainer: { marginHorizontal: 20, marginTop: 20, paddingRight: 0 },
	warningLink: { color: colors.blue },
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
		warningDecimals: '',
	};

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
	};

	getAnalyticsParams = () => {
		try {
			const { NetworkController } = Engine.context;
			const { chainId, type } = NetworkController?.state?.provider || {};
			const { address, symbol } = this.state;
			return {
				token_address: address,
				token_symbol: symbol,
				network_name: type,
				chain_id: chainId,
				source: 'Custom token',
			};
		} catch (error) {
			return {};
		}
	};

	addToken = async () => {
		if (!(await this.validateCustomToken())) return;
		const { TokensController } = Engine.context;
		const { address, symbol, decimals } = this.state;
		await TokensController.addToken(address, symbol, decimals);

		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.TOKEN_ADDED, this.getAnalyticsParams());

		// Clear state before closing
		this.setState(
			{
				address: '',
				symbol: '',
				decimals: '',
				warningAddress: '',
				warningSymbol: '',
				warningDecimals: '',
			},
			() => {
				InteractionManager.runAfterInteractions(() => {
					this.props.navigation.goBack();
				});
			}
		);
	};

	cancelAddToken = () => {
		this.props.navigation.goBack();
	};

	onAddressChange = (address) => {
		this.setState({ address });
	};

	onSymbolChange = (symbol) => {
		this.setState({ symbol });
	};

	onDecimalsChange = (decimals) => {
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
		const { NetworkController } = Engine.context;
		const { chainId } = NetworkController?.state?.provider || {};
		const toSmartContract = isValidTokenAddress && (await isSmartContractAddress(address, chainId));
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

	renderWarning = () => (
		<WarningMessage
			style={styles.warningContainer}
			warningMessage={
				<>
					{strings('add_asset.warning_body_description')}
					<Text
						suppressHighlighting
						onPress={() => {
							// TODO: This functionality exists in a bunch of other places. We need to unify this into a utils function
							this.props.navigation.navigate('Webview', {
								screen: 'SimpleWebview',
								params: {
									url: AppConstants.URLS.SECURITY,
									title: strings('add_asset.security_tips'),
								},
							});
						}}
						style={styles.warningLink}
					>
						{strings('add_asset.warning_link')}
					</Text>
				</>
			}
		/>
	);

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
					testID={'add-asset-cancel-button'}
					onConfirmPress={this.addToken}
					confirmDisabled={!(address && symbol && decimals)}
				>
					<View>
						{this.renderWarning()}
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
							<Text style={styles.warningText} testID={'token-address-warning'}>
								{this.state.warningAddress}
							</Text>
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
							<Text style={styles.warningText} testID={'token-decimals-warning'}>
								{this.state.warningDecimals}
							</Text>
						</View>
					</View>
				</ActionView>
			</View>
		);
	};
}
