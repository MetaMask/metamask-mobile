import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ScrollView, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import CollectibleElement from '../CollectibleElement';

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
		...fontStyles.normal
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

	renderEmpty = () => (
		<View style={styles.emptyView}>
			<Text style={styles.text}>{strings('wallet.no_collectibles')}</Text>
		</View>
	);

	renderList() {
		return this.props.assets.map(asset => <CollectibleElement asset={asset} key={asset.tokenId} />);
	}

	goToAddCollectible = () => {
		this.props.navigation.push('AddAsset', { assetType: 'collectible' });
	};

	render = () => (
		<ScrollView style={styles.wrapper}>
			<View testID={'collectibles'}>
				{this.props.assets && this.props.assets.length ? this.renderList() : this.renderEmpty()}
				<TouchableOpacity
					style={styles.add}
					onPress={this.goToAddCollectible}
					testID={'add-collectible-button'}
				>
					<Icon name="plus" size={16} color={colors.primary} />
					<Text style={styles.addText}>{strings('wallet.add_collectibles').toUpperCase()}</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
}
