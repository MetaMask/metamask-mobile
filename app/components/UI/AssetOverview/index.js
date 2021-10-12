import React, { PureComponent } from 'react';
import { InteractionManager, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import { swapsUtils } from '@metamask/swaps-controller';
import AssetIcon from '../AssetIcon';
import Identicon from '../Identicon';
import AssetActionButton from '../AssetActionButton';
import AppConstants from '../../../core/AppConstants';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { toggleReceiveModal } from '../../../actions/modals';
import { connect } from 'react-redux';
import { renderFromTokenMinimalUnit, balanceToFiat, renderFromWei, weiToFiat, hexToBN } from '../../../util/number';
import { safeToChecksumAddress } from '../../../util/address';
import { getEther } from '../../../util/transactions';
import { newAssetTransaction } from '../../../actions/transaction';
import { isSwapsAllowed } from '../Swaps/utils';
import { swapsLivenessSelector, swapsTokensObjectSelector } from '../../../reducers/swaps';
import { getTokenList } from '../../../reducers/tokens';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import Analytics from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { allowedToBuy } from '../FiatOrders';
import AssetSwapButton from '../Swaps/components/AssetSwapButton';
import NetworkMainAssetLogo from '../NetworkMainAssetLogo';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		padding: 20,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.grey100,
		alignContent: 'center',
		alignItems: 'center',
		paddingBottom: 30,
	},
	assetLogo: {
		marginTop: 15,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 10,
		marginBottom: 10,
	},
	ethLogo: {
		width: 70,
		height: 70,
	},
	balance: {
		alignItems: 'center',
		marginTop: 10,
		marginBottom: 20,
	},
	amount: {
		fontSize: 30,
		color: colors.fontPrimary,
		...fontStyles.normal,
		textTransform: 'uppercase',
	},
	amountFiat: {
		fontSize: 18,
		color: colors.fontSecondary,
		...fontStyles.light,
		textTransform: 'uppercase',
	},
	actions: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'flex-start',
		flexDirection: 'row',
	},
	warning: {
		borderRadius: 8,
		color: colors.black,
		...fontStyles.normal,
		fontSize: 14,
		lineHeight: 20,
		borderWidth: 1,
		borderColor: colors.yellow,
		backgroundColor: colors.yellow100,
		padding: 20,
	},
	warningLinks: {
		color: colors.blue,
	},
});

/**
 * View that displays the information of a specific asset (Token or ETH)
 * including the overview (Amount, Balance, Symbol, Logo)
 */
class AssetOverview extends PureComponent {
	static propTypes = {
		/**
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object,
		/**
		/* navigation object required to access the props
		/* passed by the parent component
		*/
		navigation: PropTypes.object,
		/**
		 * Object that represents the asset to be displayed
		 */
		asset: PropTypes.object,
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Start transaction with asset
		 */
		newAssetTransaction: PropTypes.func,
		/**
		 * An object containing token balances for current account and network in the format address => balance
		 */
		tokenBalances: PropTypes.object,
		/**
		 * An object containing token exchange rates in the format address => exchangeRate
		 */
		tokenExchangeRates: PropTypes.object,
		/**
		 * Action that toggles the receive modal
		 */
		toggleReceiveModal: PropTypes.func,
		/**
		 * Primary currency, either ETH or Fiat
		 */
		primaryCurrency: PropTypes.string,
		/**
		 * Chain id
		 */
		chainId: PropTypes.string,
		/**
		 * Wether Swaps feature is live or not
		 */
		swapsIsLive: PropTypes.bool,
		/**
		 * Object that contains swaps tokens addresses as key
		 */
		swapsTokens: PropTypes.object,
		/**
		 * Network ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Object that contains tokens by token addresses as key
		 */
		tokenList: PropTypes.object,
	};

	onReceive = () => {
		const { asset } = this.props;
		this.props.toggleReceiveModal(asset);
	};

	onBuy = () => {
		this.props.navigation.navigate('FiatOnRamp');
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.WALLET_BUY_ETH);
			AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_OPENED, {
				button_location: 'Token Screen',
				button_copy: 'Buy',
			});
		});
	};

	onSend = async () => {
		const { asset, ticker } = this.props;
		if (asset.isETH) {
			this.props.newAssetTransaction(getEther(ticker));
			this.props.navigation.navigate('SendFlowView');
		} else {
			this.props.newAssetTransaction(asset);
			this.props.navigation.navigate('SendFlowView');
		}
	};

	goToSwaps = () => {
		this.props.navigation.navigate('Swaps', {
			screen: 'SwapsAmountView',
			params: {
				sourceToken: this.props.asset.isETH ? swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS : this.props.asset.address,
			},
		});
	};

	goToBrowserUrl(url) {
		this.props.navigation.navigate('BrowserTabHome', {
			screen: 'BrowserView',
			params: {
				newTabUrl: url,
			},
		});
	}

	renderLogo = () => {
		const {
			tokenList,
			asset: { address, isETH },
		} = this.props;
		if (isETH) {
			return <NetworkMainAssetLogo biggest style={styles.ethLogo} />;
		}
		const iconUrl = tokenList[address]?.iconUrl || tokenList[address?.toLowerCase()]?.iconUrl || '';

		return iconUrl ? <AssetIcon logo={iconUrl} /> : <Identicon address={address} />;
	};

	componentDidMount = async () => {
		const { SwapsController } = Engine.context;
		try {
			await SwapsController.fetchTokenWithCache();
		} catch (error) {
			Logger.error(error, 'Swaps: error while fetching tokens with cache in AssetOverview');
		}
	};

	renderWarning = () => {
		const {
			asset: { symbol },
		} = this.props;

		const supportArticleUrl =
			'https://metamask.zendesk.com/hc/en-us/articles/360028059272-What-to-do-when-your-balance-of-ETH-and-or-ERC20-tokens-is-incorrect-inaccurate';
		return (
			<TouchableOpacity onPress={() => this.goToBrowserUrl(supportArticleUrl)}>
				<Text style={styles.warning}>
					{strings('asset_overview.were_unable')} {symbol} {strings('asset_overview.balance')}{' '}
					<Text style={styles.warningLinks}>{strings('asset_overview.troubleshooting_missing')}</Text>{' '}
					{strings('asset_overview.for_help')}
				</Text>
			</TouchableOpacity>
		);
	};

	render() {
		const {
			accounts,
			asset: { address, isETH = undefined, decimals, symbol, balanceError = null },
			primaryCurrency,
			selectedAddress,
			tokenExchangeRates,
			tokenBalances,
			conversionRate,
			currentCurrency,
			chainId,
			swapsIsLive,
			swapsTokens,
		} = this.props;
		let mainBalance, secondaryBalance;
		const itemAddress = safeToChecksumAddress(address);
		let balance, balanceFiat;
		if (isETH) {
			balance = renderFromWei(accounts[selectedAddress] && accounts[selectedAddress].balance);
			balanceFiat = weiToFiat(hexToBN(accounts[selectedAddress].balance), conversionRate, currentCurrency);
		} else {
			const exchangeRate = itemAddress in tokenExchangeRates ? tokenExchangeRates[itemAddress] : undefined;
			balance =
				itemAddress in tokenBalances ? renderFromTokenMinimalUnit(tokenBalances[itemAddress], decimals) : 0;
			balanceFiat = balanceToFiat(balance, conversionRate, exchangeRate, currentCurrency);
		}
		// choose balances depending on 'primaryCurrency'
		if (primaryCurrency === 'ETH') {
			mainBalance = `${balance} ${symbol}`;
			secondaryBalance = balanceFiat;
		} else {
			mainBalance = !balanceFiat ? `${balance} ${symbol}` : balanceFiat;
			secondaryBalance = !balanceFiat ? balanceFiat : `${balance} ${symbol}`;
		}
		return (
			<View style={styles.wrapper} testID={'token-asset-overview'}>
				<View style={styles.assetLogo}>{this.renderLogo()}</View>
				<View style={styles.balance}>
					{balanceError ? (
						this.renderWarning()
					) : (
						<>
							<Text style={styles.amount} testID={'token-amount'}>
								{mainBalance}
							</Text>
							{secondaryBalance && <Text style={styles.amountFiat}>{secondaryBalance}</Text>}
						</>
					)}
				</View>

				{!balanceError && (
					<View style={styles.actions}>
						<AssetActionButton
							icon="receive"
							onPress={this.onReceive}
							label={strings('asset_overview.receive_button')}
						/>
						{isETH && allowedToBuy(chainId) && (
							<AssetActionButton
								icon="buy"
								onPress={this.onBuy}
								label={strings('asset_overview.buy_button')}
							/>
						)}
						<AssetActionButton
							testID={'token-send-button'}
							icon="send"
							onPress={this.onSend}
							label={strings('asset_overview.send_button')}
						/>
						{AppConstants.SWAPS.ACTIVE && (
							<AssetSwapButton
								isFeatureLive={swapsIsLive}
								isNetworkAllowed={isSwapsAllowed(chainId)}
								isAssetAllowed={isETH || address?.toLowerCase() in swapsTokens}
								onPress={this.goToSwaps}
							/>
						)}
					</View>
				)}
			</View>
		);
	}
}

const mapStateToProps = (state) => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	primaryCurrency: state.settings.primaryCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	tokenBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	tokenExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	swapsIsLive: swapsLivenessSelector(state),
	swapsTokens: swapsTokensObjectSelector(state),
	tokenList: getTokenList(state),
});

const mapDispatchToProps = (dispatch) => ({
	toggleReceiveModal: (asset) => dispatch(toggleReceiveModal(asset)),
	newAssetTransaction: (selectedAsset) => dispatch(newAssetTransaction(selectedAsset)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AssetOverview);
