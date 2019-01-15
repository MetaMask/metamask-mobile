import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { RefreshControl, FlatList, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import contractMap from 'eth-contract-metadata';
import TokenElement from '../TokenElement';
import ActionSheet from 'react-native-actionsheet';
import { renderFromTokenMinimalUnit, balanceToFiat } from '../../util/number';
import Engine from '../../core/Engine';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	emptyView: {
		backgroundColor: colors.white,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 50
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
	},
	footer: {
		flex: 1,
		paddingBottom: 30
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
		tokens: PropTypes.array,
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
		tokenExchangeRates: PropTypes.object,
		/**
		 * Array of transactions
		 */
		transactions: PropTypes.array
	};

	state = {
		refreshing: false
	};

	actionSheet = null;

	tokenToRemove = null;

	renderEmpty = () => (
		<View style={styles.emptyView}>
			<Text style={styles.text}>{strings('wallet.no_tokens')}</Text>
		</View>
	);

	onItemPress = token => {
		this.props.navigation.navigate('Asset', { ...token, transactions: this.props.transactions });
	};

	renderFooter = () => (
		<View style={styles.footer}>
			<TouchableOpacity style={styles.add} onPress={this.goToAddToken} testID={'add-token-button'}>
				<Icon name="plus" size={16} color={colors.primary} />
				<Text style={styles.addText}>{strings('wallet.add_tokens').toUpperCase()}</Text>
			</TouchableOpacity>
		</View>
	);

	keyExtractor = item => item.symbol;

	onRefresh = async () => {
		this.setState({ refreshing: true });
		const { AssetsDetectionController, AccountTrackerController } = Engine.context;
		await AssetsDetectionController.detectTokens();
		await AccountTrackerController.refresh();
		this.setState({ refreshing: false });
	};

	renderList() {
		const { tokens, conversionRate, currentCurrency, tokenBalances, tokenExchangeRates } = this.props;

		return (
			<FlatList
				data={tokens}
				extraData={this.state}
				keyExtractor={this.keyExtractor}
				refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
				// eslint-disable-next-line react/jsx-no-bind
				renderItem={({ item }) => {
					const logo =
						item.logo || ((contractMap[item.address] && contractMap[item.address].logo) || undefined);
					const exchangeRate =
						item.address in tokenExchangeRates ? tokenExchangeRates[item.address] : undefined;
					const balance =
						item.balance ||
						(item.address in tokenBalances
							? renderFromTokenMinimalUnit(tokenBalances[item.address], item.decimals)
							: undefined);
					const balanceFiat =
						item.balanceFiat || balanceToFiat(balance, conversionRate, exchangeRate, currentCurrency);
					item = { ...item, ...{ logo, balance, balanceFiat } };

					return <TokenElement onPress={this.onItemPress} onLongPress={this.showRemoveMenu} token={item} />;
				}}
				ListFooterComponent={this.renderFooter}
			/>
		);
	}

	goToAddToken = () => {
		this.props.navigation.push('AddAsset', { assetType: 'token' });
	};

	showRemoveMenu = token => {
		this.tokenToRemove = token;
		this.actionSheet.show();
	};

	removeToken = () => {
		const { AssetsController } = Engine.context;
		AssetsController.removeToken(this.tokenToRemove.address);
	};

	createActionSheetRef = ref => {
		this.actionSheet = ref;
	};

	render = () => {
		const { tokens } = this.props;
		return (
			<View style={styles.wrapper} testID={'tokens'}>
				{tokens && tokens.length ? this.renderList() : this.renderEmpty()}
				<ActionSheet
					ref={this.createActionSheetRef}
					title={strings('wallet.remove_token_title')}
					options={[strings('wallet.remove'), strings('wallet.cancel')]}
					cancelButtonIndex={1}
					destructiveButtonIndex={0}
					// eslint-disable-next-line react/jsx-no-bind
					onPress={index => (index === 0 ? this.removeToken() : null)}
				/>
			</View>
		);
	};
}
