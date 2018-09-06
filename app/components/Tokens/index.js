import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ScrollView, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import AssetIcon from '../AssetIcon';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import contractMap from 'eth-contract-metadata';
import Identicon from '../Identicon';

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
	itemLogoWrapper: {
		width: 50,
		height: 50,
		overflow: 'hidden',
		borderRadius: 100,
		marginRight: 20
	},
	balances: {
		flex: 1
	},
	balance: {
		fontSize: 16,
		color: colors.fontPrimary
	},
	balanceFiat: {
		fontSize: 12,
		color: colors.fontSecondary
	},
	arrow: {
		flex: 1,
		alignSelf: 'flex-end'
	},
	arrowIcon: {
		marginTop: 8
	}
});

/**
 * View that renders a list of ERC-20 Tokens
 */
export default class Tokens extends Component {
	static propTypes = {
		/**
		 * Navigation object required to push
		 * the Asset detail view
		 */
		navigation: PropTypes.object,
		/**
		 * Array of assets (in this case ERC20 tokens)
		 */
		assets: PropTypes.array
	};

	renderEmpty() {
		return (
			<View style={styles.emptyView}>
				<Text style={styles.text}>{strings('wallet.no_tokens')}</Text>
			</View>
		);
	}

	onItemPress = asset => {
		this.props.navigation.navigate('Asset', asset);
	};

	renderList() {
		return this.props.assets.map(asset => {
			asset.logo = asset.address in contractMap ? contractMap[asset.address].logo : undefined;
			return (
				<TouchableOpacity
					onPress={() => this.onItemPress(asset)} // eslint-disable-line
					style={styles.itemWrapper}
					key={`asset-${asset.symbol}`}
				>
					<View style={styles.itemLogoWrapper}>
						{asset.logo ? <AssetIcon logo={asset.logo} /> : <Identicon address={asset.address} />}
					</View>
					<View style={styles.balances}>
						<Text style={styles.balance}>{asset.symbol}</Text>
						<Text style={styles.balanceFiat}>${asset.balanceFiat} USD</Text>
					</View>
					<View styles={styles.arrow}>
						<Icon name="chevron-right" size={24} color={colors.fontTertiary} style={styles.arrowIcon} />
					</View>
				</TouchableOpacity>
			);
		});
	}

	goToAddToken = () => {
		this.props.navigation.push('AddAsset');
	};

	render() {
		return (
			<ScrollView style={styles.wrapper}>
				<View testID={'tokens'}>
					{this.props.assets && this.props.assets.length ? this.renderList() : this.renderEmpty()}
					<TouchableOpacity style={styles.add} onPress={this.goToAddToken} testID={'add-token-button'}>
						<Icon name="plus" size={16} color={colors.primary} />
						<Text style={styles.addText}>{strings('wallet.add_tokens')}</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		);
	}
}
