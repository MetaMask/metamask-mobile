import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ScrollView, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import contractMap from 'eth-contract-metadata';
import TokenElement from '../TokenElement';
import { calcTokenValue, balanceToFiat } from '../../util/number';

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
		assets: PropTypes.array,
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Object containing token balances in the format address => balance
		 */
		tokenBalances: PropTypes.object,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		tokenExchangeRates: PropTypes.object
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
		const { assets, conversionRate, currentCurrency, tokenBalances, tokenExchangeRates } = this.props;
		return assets.map(asset => {
			const logo = asset.logo || ((contractMap[asset.address] && contractMap[asset.address].logo) || undefined);
			const exchangeRate = asset.address in tokenExchangeRates ? tokenExchangeRates[asset.address] : undefined;
			const balance =
				asset.balance ||
				(asset.address in tokenBalances
					? calcTokenValue(tokenBalances[asset.address], asset.decimals)
					: undefined);
			const balanceFiat =
				asset.balanceFiat || balanceToFiat(balance, conversionRate, exchangeRate, currentCurrency);
			asset = { ...asset, ...{ logo, balance, balanceFiat } };

			return (
				<TokenElement onPress={() => this.onItemPress(asset)} asset={asset} key={`asset_${asset.symbol}`} /> // eslint-disable-line
			);
		});
	}

	goToAddToken = () => {
		this.props.navigation.push('AddAsset', { assetType: 'token' });
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
