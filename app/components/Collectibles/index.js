import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ScrollView, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import Image from 'react-native-remote-svg';
import Identicon from '../Identicon';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	emptyView: {
		marginTop: 80,
		alignItems: 'center',
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center'
	},
	text: {
		fontSize: 20,
		color: colors.fontTertiary,
		...fontStyles.normal
	},
	add: {
		margin: 20,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	addText: {
		fontSize: 15,
		color: colors.primary,
		textTransform: 'uppercase',
		...fontStyles.normal
	},
	itemWrapper: {
		flex: 1,
		flexDirection: 'row',
		paddingHorizontal: 15,
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.borderColor
	},
	imageWrapper: {
		width: 50,
		height: 50,
		overflow: 'hidden',
		borderRadius: 100,
		marginRight: 20
	},
	image: {
		width: 50,
		height: 50
	},
	balances: {
		flex: 1
	},
	name: {
		fontSize: 16,
		color: colors.fontPrimary
	}
});

/**
 * View that renders a list of Collectibles
 * also known as ERC-721 Tokens
 */
export default class Collectibles extends Component {
	static propTypes = {
		/**
		 * Navigation object required to push
		 * the Asset detail view
		 */
		navigation: PropTypes.object,
		/**
		 * Array of assets (in this case Collectibles)
		 */
		assets: PropTypes.array
	};

	renderEmpty() {
		return (
			<View style={styles.emptyView}>
				<Text style={styles.text}>{strings('wallet.no_collectibles')}</Text>
			</View>
		);
	}

	renderList() {
		return this.props.assets.map(asset => (
			<TouchableOpacity style={styles.itemWrapper} key={`asset-${asset.tokenId}`}>
				<View style={styles.imageWrapper}>
					{asset.image ? (
						<Image source={{ uri: asset.image }} style={styles.image} />
					) : (
						<Identicon address={asset.tokenId} />
					)}
				</View>
				<View style={styles.balances}>
					<Text style={styles.name}>{asset.name}</Text>
					<Text>
						{strings('collectible.collectible_token_id')}: {asset.tokenId}
					</Text>
				</View>
			</TouchableOpacity>
		));
	}

	goToAddCollectible = () => {
		this.props.navigation.push('AddAsset', 'collectibles');
	};

	render() {
		return (
			<ScrollView style={styles.wrapper}>
				<View testID={'collectibles'}>
					{this.props.assets && this.props.assets.length ? this.renderList() : this.renderEmpty()}
					<TouchableOpacity
						style={styles.add}
						onPress={this.goToAddCollectible}
						testID={'add-collectible-button'}
					>
						<Icon name="plus" size={16} color={colors.primary} />
						<Text style={styles.addText}>{strings('wallet.add_collectibles')}</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		);
	}
}
