import React, { Component } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import StyledButton from '../StyledButton';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import CollectibleImage from '../CollectibleImage';
import contractMap from 'eth-contract-metadata';
import { renderShortAddress } from '../../util/address';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		padding: 20,
		alignItems: 'center',
		justifyContent: 'center'
	},
	assetLogo: {
		marginTop: 15,
		paddingVertical: 15,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.white,
		borderRadius: 20,
		width: 300
	},
	collectibleInformation: {
		flex: 1,
		alignItems: 'center',
		marginTop: 10,
		marginBottom: 10,
		padding: 20
	},
	buttons: {
		flex: 1,
		flexDirection: 'row',
		marginTop: 30
	},
	collectibleName: {
		fontSize: 20,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	collectibleAttribute: {
		fontSize: 18,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	button: {
		flex: 1,
		flexDirection: 'row'
	},
	buttonText: {
		marginLeft: 8,
		marginTop: Platform.OS === 'ios' ? 0 : -2,
		fontSize: 15,
		color: colors.white,
		...fontStyles.bold
	},
	buttonContent: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'center'
	},
	buttonIcon: {
		width: 15,
		height: 15,
		marginTop: 0
	},
	flexRow: {
		flexDirection: 'row'
	}
});

/**
 * View that displays the information of a specific ERC-721 Token
 */
export default class CollectibleOverview extends Component {
	static propTypes = {
		/**
		 * Object that represents the collectible to be displayed
		 */
		collectible: PropTypes.object
	};

	onDeposit = () => {
		Alert.alert(strings('drawer.coming_soon'));
	};

	onSend = async () => {
		Alert.alert(strings('drawer.coming_soon'));
	};

	renderImage = () => {
		const { collectible } = this.props;
		return <CollectibleImage renderFull collectible={collectible} />;
	};

	render = () => {
		const {
			collectible: { address, tokenId, name }
		} = this.props;
		return (
			<View style={styles.wrapper}>
				<View style={styles.assetLogo}>{this.renderImage()}</View>
				<View style={styles.collectibleInformation}>
					<Text style={styles.collectibleName}>{name}</Text>
					<Text style={styles.collectibleAttribute}>
						{strings('collectible.collectible_token_id')}: {tokenId}
					</Text>
					{contractMap[address] &&
						name !== contractMap[address].name && (
							<Text style={styles.collectibleAttribute}>
								{strings('collectible.collectible_type')}: {contractMap[address].name}
							</Text>
						)}
					<Text style={styles.collectibleAttribute}>
						{strings('collectible.collectible_address')}: {renderShortAddress(address)}
					</Text>
				</View>
				<View style={styles.buttons}>
					<StyledButton
						type={'confirm'}
						onPress={this.onSend}
						containerStyle={styles.button}
						style={styles.buttonContent}
						childGroupStyle={styles.flexRow}
					>
						<MaterialIcon name={'send'} size={15} color={colors.white} style={styles.buttonIcon} />
						<Text style={styles.buttonText}>{strings('asset_overview.send_button').toUpperCase()}</Text>
					</StyledButton>
				</View>
			</View>
		);
	};
}
