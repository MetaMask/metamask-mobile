import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Image, RefreshControl, FlatList, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import TokenImage from '../TokenImage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import contractMap from 'eth-contract-metadata';
import ActionSheet from 'react-native-actionsheet';
import { renderFromTokenMinimalUnit, balanceToFiat } from '../../util/number';
import Engine from '../../core/Engine';
import AssetElement from '../AssetElement';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		minHeight: 500
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
	},
	balances: {
		flex: 1,
		justifyContent: 'center'
	},
	balance: {
		fontSize: 16,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	balanceFiat: {
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	ethLogo: {
		width: 50,
		height: 50,
		overflow: 'hidden',
		marginRight: 20
	}
});

const ethLogo = require('../../images/eth-logo.png'); // eslint-disable-line

/**
 * View that renders a list of ERC-20 Tokens
 */
export default class Tokens extends PureComponent {
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
		const actions = [AssetsDetectionController.detectAssets(), AccountTrackerController.refresh()];
		await Promise.all(actions);
		this.setState({ refreshing: false });
	};

	renderItem = ({ item }) => {
		const { conversionRate, currentCurrency, tokenBalances, tokenExchangeRates } = this.props;
		const logo = item.logo || ((contractMap[item.address] && contractMap[item.address].logo) || undefined);
		const exchangeRate = item.address in tokenExchangeRates ? tokenExchangeRates[item.address] : undefined;
		const balance =
			item.balance ||
			(item.address in tokenBalances
				? renderFromTokenMinimalUnit(tokenBalances[item.address], item.decimals)
				: 0);
		const balanceFiat = item.balanceFiat || balanceToFiat(balance, conversionRate, exchangeRate, currentCurrency);
		item = { ...item, ...{ logo, balance, balanceFiat } };
		return (
			<AssetElement onPress={this.onItemPress} onLongPress={this.showRemoveMenu} asset={item}>
				{item.symbol === 'ETH' ? (
					<Image source={ethLogo} style={styles.ethLogo} />
				) : (
					<TokenImage asset={item} />
				)}
				<View style={styles.balances}>
					<Text style={styles.balance}>
						{balance} {item.symbol}
					</Text>
					{balanceFiat ? <Text style={styles.balanceFiat}>{balanceFiat}</Text> : null}
				</View>
			</AssetElement>
		);
	};

	renderList() {
		const { tokens } = this.props;

		return (
			<FlatList
				data={tokens}
				keyExtractor={this.keyExtractor}
				refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
				renderItem={this.renderItem}
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

	onActionSheetPress = index => (index === 0 ? this.removeToken() : null);

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
					onPress={this.onActionSheetPress}
				/>
			</View>
		);
	};
}
