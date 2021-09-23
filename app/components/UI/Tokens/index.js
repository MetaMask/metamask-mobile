import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Alert, TouchableOpacity, StyleSheet, Text, View, InteractionManager } from 'react-native';
import TokenImage from '../TokenImage';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import ActionSheet from 'react-native-actionsheet';
import { renderFromTokenMinimalUnit, balanceToFiat } from '../../../util/number';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import AssetElement from '../AssetElement';
import { connect } from 'react-redux';
import { safeToChecksumAddress } from '../../../util/address';
import Analytics from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import NetworkMainAssetLogo from '../NetworkMainAssetLogo';
import { getTokenList } from '../../../reducers/tokens';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		minHeight: 500,
	},
	emptyView: {
		backgroundColor: colors.white,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 50,
	},
	text: {
		fontSize: 20,
		color: colors.fontTertiary,
		...fontStyles.normal,
	},
	add: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	addText: {
		fontSize: 14,
		color: colors.blue,
		...fontStyles.normal,
	},
	footer: {
		flex: 1,
		paddingBottom: 30,
		alignItems: 'center',
		marginTop: 24,
	},
	balances: {
		flex: 1,
		justifyContent: 'center',
	},
	balance: {
		fontSize: 16,
		color: colors.fontPrimary,
		...fontStyles.normal,
		textTransform: 'uppercase',
	},
	balanceFiat: {
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.normal,
		textTransform: 'uppercase',
	},
	balanceFiatTokenError: {
		textTransform: 'capitalize',
	},
	ethLogo: {
		width: 50,
		height: 50,
		overflow: 'hidden',
		marginRight: 20,
	},
	emptyText: {
		color: colors.greyAssetVisibility,
		marginBottom: 8,
		fontSize: 14,
	},
});

/**
 * View that renders a list of ERC-20 Tokens
 */
class Tokens extends PureComponent {
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
		transactions: PropTypes.array,
		/**
		 * Primary currency, either ETH or Fiat
		 */
		primaryCurrency: PropTypes.string,
		/**
		 * A bool that represents if the user wants to hide zero balance token
		 */
		hideZeroBalanceTokens: PropTypes.bool,
		/**
		 * List of tokens from TokenListController
		 */
		tokenList: PropTypes.object,
	};

	actionSheet = null;

	tokenToRemove = null;

	renderEmpty = () => (
		<View style={styles.emptyView}>
			<Text style={styles.text}>{strings('wallet.no_tokens')}</Text>
		</View>
	);

	onItemPress = (token) => {
		this.props.navigation.navigate('Asset', { ...token, transactions: this.props.transactions });
	};

	renderFooter = () => (
		<View style={styles.footer} key={'tokens-footer'}>
			<Text style={styles.emptyText}>{strings('wallet.no_available_tokens')}</Text>
			<TouchableOpacity style={styles.add} onPress={this.goToAddToken} testID={'add-token-button'}>
				<Text style={styles.addText}>{strings('wallet.add_tokens')}</Text>
			</TouchableOpacity>
		</View>
	);

	renderItem = (asset) => {
		const { conversionRate, currentCurrency, tokenBalances, tokenExchangeRates, primaryCurrency, tokenList } =
			this.props;
		const itemAddress = safeToChecksumAddress(asset.address);
		const logo = tokenList?.[itemAddress?.toLowerCase?.()]?.iconUrl;
		const exchangeRate = itemAddress in tokenExchangeRates ? tokenExchangeRates[itemAddress] : undefined;
		const balance =
			asset.balance ||
			(itemAddress in tokenBalances ? renderFromTokenMinimalUnit(tokenBalances[itemAddress], asset.decimals) : 0);
		const balanceFiat = asset.balanceFiat || balanceToFiat(balance, conversionRate, exchangeRate, currentCurrency);
		const balanceValue = `${balance} ${asset.symbol}`;

		// render balances according to primary currency
		let mainBalance, secondaryBalance;
		if (primaryCurrency === 'ETH') {
			mainBalance = balanceValue;
			secondaryBalance = balanceFiat;
		} else {
			mainBalance = !balanceFiat ? balanceValue : balanceFiat;
			secondaryBalance = !balanceFiat ? balanceFiat : balanceValue;
		}

		if (asset?.balanceError) {
			mainBalance = asset.symbol;
			secondaryBalance = strings('wallet.unable_to_load');
		}

		asset = { logo, ...asset, balance, balanceFiat };
		return (
			<AssetElement
				key={itemAddress || '0x'}
				testID={'asset'}
				onPress={this.onItemPress}
				onLongPress={asset.isETH ? null : this.showRemoveMenu}
				asset={asset}
			>
				{asset.isETH ? (
					<NetworkMainAssetLogo big style={styles.ethLogo} testID={'eth-logo'} />
				) : (
					<TokenImage asset={asset} containerStyle={styles.ethLogo} />
				)}

				<View style={styles.balances} testID={'balance'}>
					<Text style={styles.balance}>{mainBalance}</Text>
					{secondaryBalance ? (
						<Text style={[styles.balanceFiat, asset?.balanceError && styles.balanceFiatTokenError]}>
							{secondaryBalance}
						</Text>
					) : null}
				</View>
			</AssetElement>
		);
	};

	goToBuy = () => {
		this.props.navigation.navigate('FiatOnRamp');
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.WALLET_BUY_ETH);
			AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_OPENED, {
				button_location: 'Home Screen',
				button_copy: 'Buy ETH',
			});
		});
	};

	renderList() {
		const { tokens, hideZeroBalanceTokens, tokenBalances } = this.props;
		const tokensToDisplay = hideZeroBalanceTokens
			? tokens.filter((token) => {
					const { address, isETH } = token;
					return (tokenBalances[address] && !tokenBalances[address]?.isZero?.()) || isETH;
					// eslint-disable-next-line no-mixed-spaces-and-tabs
			  })
			: tokens;

		return (
			<View>
				{tokensToDisplay.map((item) => this.renderItem(item))}
				{this.renderFooter()}
			</View>
		);
	}

	goToAddToken = () => {
		this.props.navigation.push('AddAsset', { assetType: 'token' });
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.WALLET_ADD_TOKENS);
		});
	};

	showRemoveMenu = (token) => {
		this.tokenToRemove = token;
		this.actionSheet.show();
	};

	removeToken = () => {
		const { TokensController } = Engine.context;
		const tokenAddress = this.tokenToRemove?.address;
		try {
			TokensController.removeAndIgnoreToken(tokenAddress);
			Alert.alert(strings('wallet.token_removed_title'), strings('wallet.token_removed_desc'));
		} catch (error) {
			Logger.log('Error while trying to remove token', error, tokenAddress);
			Alert.alert(strings('wallet.token_removal_issue_title'), strings('wallet.token_removal_issue_desc'));
		}
	};

	createActionSheetRef = (ref) => {
		this.actionSheet = ref;
	};

	onActionSheetPress = (index) => (index === 0 ? this.removeToken() : null);

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

const mapStateToProps = (state) => ({
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	primaryCurrency: state.settings.primaryCurrency,
	tokenBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	tokenExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	hideZeroBalanceTokens: state.settings.hideZeroBalanceTokens,
	tokenList: getTokenList(state),
});

export default connect(mapStateToProps)(Tokens);
