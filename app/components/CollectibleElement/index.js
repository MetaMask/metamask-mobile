import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import CollectibleImage from '../CollectibleImage';

const styles = StyleSheet.create({
	itemWrapper: {
		flex: 1,
		flexDirection: 'row',
		paddingHorizontal: 15,
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.borderColor
	},
	balances: {
		flex: 1
	},
	name: {
		fontSize: 16,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	tokenId: {
		fontSize: 12,
		color: colors.fontPrimary,
		...fontStyles.normal
	}
});

/**
 * View that renders a list of Collectibles
 * also known as ERC-721 Tokens
 */
export default class CollectibleElement extends Component {
	static propTypes = {
		/**
		 * Asset object (in this case ERC721 token)
		 */
		asset: PropTypes.object
	};

	render = () => {
		const { asset } = this.props;
		return (
			<TouchableOpacity style={styles.itemWrapper} key={`asset-${asset.tokenId}`}>
				<CollectibleImage asset={asset} />
				<View style={styles.balances}>
					<Text style={styles.name}>{asset.name}</Text>
					<Text style={styles.tokenId}>
						{strings('collectible.collectible_token_id')}: {asset.tokenId}
					</Text>
				</View>
			</TouchableOpacity>
		);
	};
}
