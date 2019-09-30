import React, { PureComponent } from 'react';
import { Platform, Alert, Text, TextInput, View, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { isValidAddress } from 'ethereumjs-util';
import ActionView from '../ActionView';
import { isSmartContractAddress } from '../../../util/transactions';
import { connect } from 'react-redux';

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
 * PureComponent that provides ability to add custom collectibles.
 */
class AddCustomCollectible extends PureComponent {
	state = {
		address: '',
		tokenId: '',
		inputWidth: Platform.OS === 'android' ? '99%' : undefined
	};

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Collectible contract object of collectible to add
		 */
		collectibleContract: PropTypes.object
	};

	componentDidMount = () => {
		this.mounted = true;
		// Workaround https://github.com/facebook/react-native/issues/9958
		this.state.inputWidth &&
			setTimeout(() => {
				this.mounted && this.setState({ inputWidth: '100%' });
			}, 100);
		const { collectibleContract } = this.props;
		collectibleContract && this.setState({ address: collectibleContract.address });
	};

	componentWillUnmount = () => {
		this.mounted = false;
	};

	addCollectible = async () => {
		if (!(await this.validateCustomCollectible())) return;
		const isOwner = await this.validateCollectibleOwnership();
		if (!isOwner) {
			this.handleNotCollectibleOwner();
			return;
		}
		const { AssetsController } = Engine.context;
		const { address, tokenId } = this.state;
		AssetsController.addCollectible(address, tokenId);
		this.props.navigation.goBack();
	};

	cancelAddCollectible = () => {
		this.props.navigation.goBack();
	};

	onAddressChange = address => {
		this.setState({ address });
	};

	onTokenIdChange = tokenId => {
		this.setState({ tokenId });
	};

	validateCustomCollectibleAddress = async () => {
		let validated = true;
		const address = this.state.address;
		const isValidEthAddress = isValidAddress(address);
		if (address.length === 0) {
			this.setState({ warningAddress: strings('collectible.address_cant_be_empty') });
			validated = false;
		} else if (!isValidEthAddress) {
			this.setState({ warningAddress: strings('collectible.address_must_be_valid') });
			validated = false;
		} else if (!(await isSmartContractAddress(address))) {
			this.setState({ warningAddress: strings('collectible.address_must_be_smart_contract') });
			validated = false;
		} else {
			this.setState({ warningAddress: `` });
		}
		return validated;
	};

	validateCustomCollectibleTokenId = () => {
		let validated = true;
		const tokenId = this.state.tokenId;
		if (tokenId.length === 0) {
			this.setState({ warningTokenId: strings('collectible.token_id_cant_be_empty') });
			validated = false;
		} else {
			this.setState({ warningTokenId: `` });
		}
		return validated;
	};

	validateCustomCollectible = async () => {
		const validatedAddress = await this.validateCustomCollectibleAddress();
		const validatedTokenId = this.validateCustomCollectibleTokenId();
		return validatedAddress && validatedTokenId;
	};

	assetTokenIdInput = React.createRef();

	jumpToAssetTokenId = () => {
		const { current } = this.assetTokenIdInput;
		current && current.focus();
	};

	handleNotCollectibleOwner = () => {
		Alert.alert(strings('collectible.ownership_error_title'), strings('collectible.ownership_error'));
	};

	validateCollectibleOwnership = async () => {
		const { AssetsContractController } = Engine.context;
		const { address, tokenId } = this.state;
		const { selectedAddress } = this.props;
		try {
			const owner = await AssetsContractController.getOwnerOf(address, tokenId);
			const isOwner = owner.toLowerCase() === selectedAddress.toLowerCase();
			return isOwner;
		} catch (e) {
			return false;
		}
	};

	render = () => {
		const { address, tokenId } = this.state;

		return (
			<View style={styles.wrapper} testID={'add-custom-token-screen'}>
				<ActionView
					cancelTestID={'add-custom-asset-cancel-button'}
					confirmTestID={'add-custom-asset-confirm-button'}
					cancelText={strings('add_asset.collectibles.cancel_add_collectible')}
					confirmText={strings('add_asset.collectibles.add_collectible')}
					onCancelPress={this.cancelAddCollectible}
					onConfirmPress={this.addCollectible}
					confirmDisabled={!address && !tokenId}
				>
					<View>
						<View style={styles.rowWrapper}>
							<Text style={fontStyles.normal}>{strings('collectible.collectible_address')}</Text>
							<TextInput
								style={[
									styles.textInput,
									this.state.inputWidth ? { width: this.state.inputWidth } : {}
								]}
								placeholder={'0x...'}
								placeholderTextColor={colors.grey100}
								value={this.state.address}
								onChangeText={this.onAddressChange}
								onBlur={this.validateCustomCollectibleAddress}
								testID={'input-collectible-address'}
								onSubmitEditing={this.jumpToAssetTokenId}
							/>
							<Text style={styles.warningText}>{this.state.warningAddress}</Text>
						</View>
						<View style={styles.rowWrapper}>
							<Text style={fontStyles.normal}>{strings('collectible.collectible_token_id')}</Text>
							<TextInput
								style={[
									styles.textInput,
									this.state.inputWidth ? { width: this.state.inputWidth } : {}
								]}
								value={this.state.tokenId}
								keyboardType="numeric"
								onChangeText={this.onTokenIdChange}
								onBlur={this.validateCustomCollectibleTokenId}
								testID={'input-token-decimals'}
								ref={this.assetTokenIdInput}
								onSubmitEditing={this.addCollectible}
								returnKeyType={'done'}
								placeholder={strings('collectible.id_placeholder')}
								placeholderTextColor={colors.grey100}
							/>
							<Text style={styles.warningText}>{this.state.warningTokenId}</Text>
						</View>
					</View>
				</ActionView>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(AddCustomCollectible);
