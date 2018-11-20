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
 * Copmonent that provides ability to add custom collectibles.
 */
export default class AddCustomCollectible extends Component {
	state = {
		address: '',
		tokenId: ''
	};

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};

	addCollectible = () => {
		if (!this.validateCustomCollectible()) return;
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

	validateCustomCollectibleAddress = () => {
		let validated = true;
		const address = this.state.address;
		if (address.length === 0) {
			this.setState({ warningAddress: strings('collectible.address_cant_be_empty') });
			validated = false;
		} else if (!isValidAddress(address)) {
			this.setState({ warningAddress: strings('collectible.address_must_be_valid') });
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

	validateCustomCollectible = () => {
		const validatedAddress = this.validateCustomCollectibleAddress();
		const validatedTokenId = this.validateCustomCollectibleTokenId();
		return validatedAddress && validatedTokenId;
	};

	assetTokenIdInput = React.createRef();

	jumpToAssetTokenId = () => {
		const { current } = this.assetTokenIdInput;
		current && current.focus();
	};

	render() {
		return (
			<View style={styles.wrapper} testID={'add-custom-token-screen'}>
				<ActionView
					cancelTestID={'add-custom-asset-cancel-button'}
					confirmTestID={'add-custom-asset-confirm-button'}
					cancelText={strings('add_asset.collectibles.cancel_add_collectible')}
					confirmText={strings('add_asset.collectibles.add_collectible')}
					onCancelPress={this.cancelAddCollectible}
					onConfirmPress={this.addCollectible}
				>
					<View style={styles.rowWrapper}>
						<Text style={fontStyles.normal}>{strings('collectible.collectible_address')}</Text>
						<TextInput
							style={styles.textInput}
							placeholder={'0x...'}
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
							style={styles.textInput}
							value={this.state.tokenId}
							keyboardType="numeric"
							placeholder={''}
							onChangeText={this.onTokenIdChange}
							onBlur={this.validateCustomCollectibleTokenId}
							testID={'input-token-decimals'}
							ref={this.assetTokenIdInput}
							onSubmitEditing={this.addCollectible}
							returnKeyType={'done'}
						/>
						<Text style={styles.warningText}>{this.state.warningTokenId}</Text>
					</View>
				</ActionView>
			</View>
		);
	}
}
