import React, { PureComponent } from 'react';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, TouchableOpacity, InteractionManager } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import { connect } from 'react-redux';
import {
	toBN,
	isBN,
	weiToFiat,
	weiToFiatNumber,
	balanceToFiatNumber,
	renderFromTokenMinimalUnit,
	renderFromWei
} from '../../../../util/number';
import { strings } from '../../../../../locales/i18n';
import { getTicker, getNormalizedTxState } from '../../../../util/transactions';
import TransactionReviewFeeCard from '../TransactionReviewFeeCard';
import Analytics from '../../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';
import { withNavigation } from 'react-navigation';
import { getNetworkName, isMainNet } from '../../../../util/networks';
import { capitalize } from '../../../../util/general';
import Engine from '../../../../core/Engine';
import { util } from '@metamask/controllers';
import CustomNonceModal from '../../../UI/CustomNonceModal';
import { setNonce, setProposedNonce } from '../../../../actions/transaction';

const styles = StyleSheet.create({
	overviewAlert: {
		alignItems: 'center',
		backgroundColor: colors.red000,
		borderColor: colors.red,
		borderRadius: 4,
		borderWidth: 1,
		flexDirection: 'row',
		height: 32,
		paddingHorizontal: 16,
		marginHorizontal: 24,
		marginTop: 12
	},
	overviewAlertText: {
		...fontStyles.normal,
		color: colors.red,
		flex: 1,
		fontSize: 12,
		marginLeft: 8
	},
	overviewAlertIcon: {
		color: colors.red,
		flex: 0
	},
	overviewPrimary: {
		...fontStyles.bold,
		color: colors.fontPrimary,
		fontSize: 24,
		textAlign: 'right',
		textTransform: 'uppercase'
	},
	overviewAccent: {
		color: colors.blue
	},
	overviewEth: {
		...fontStyles.bold,
		color: colors.fontPrimary,
		fontSize: 14,
		textAlign: 'right',
		textTransform: 'uppercase'
	},
	over: {
		color: colors.red
	},
	assetName: {
		maxWidth: 200
	},
	totalValue: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'flex-end'
	},
	collectibleName: {
		maxWidth: '30%'
	},
	viewDataWrapper: {
		flex: 1,
		marginTop: 16
	},
	viewDataButton: {
		alignSelf: 'center'
	},
	viewDataText: {
		color: colors.blue,
		textAlign: 'center',
		fontSize: 12,
		...fontStyles.bold,
		alignSelf: 'center'
	},
	errorWrapper: {
		marginHorizontal: 24,
		marginTop: 12,
		paddingHorizontal: 10,
		paddingVertical: 6,
		backgroundColor: colors.red000,
		borderColor: colors.red,
		borderRadius: 8,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	error: {
		color: colors.red,
		fontSize: 12,
		lineHeight: 16,
		...fontStyles.normal,
		textAlign: 'center'
	},
	underline: {
		textDecorationLine: 'underline',
		...fontStyles.bold
	}
});

/**
 * PureComponent that supports reviewing a transaction information
 */
class TransactionReviewInformation extends PureComponent {
	static propTypes = {
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Transaction object associated with this transaction
		 */
		transaction: PropTypes.object,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		contractExchangeRates: PropTypes.object,
		/**
		 * Callback for transaction edition
		 */
		edit: PropTypes.func,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Transaction amount in selected asset before gas
		 */
		assetAmount: PropTypes.string,
		/**
		 * Transaction amount in fiat before gas
		 */
		fiatValue: PropTypes.string,
		/**
		 * ETH or fiat, depending on user setting
		 */
		primaryCurrency: PropTypes.string,
		/**
		 * Hides or shows transaction data
		 */
		toggleDataView: PropTypes.func,
		/**
		 * Whether or not basic gas estimates have been fetched
		 */
		ready: PropTypes.bool,
		/**
		 * Transaction error
		 */
		error: PropTypes.string,
		/**
		 * True if transaction is over the available funds
		 */
		over: PropTypes.bool,
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * Called when the cancel button is clicked
		 */
		onCancelPress: PropTypes.func,
		/**
		 * Network id
		 */
		network: PropTypes.string,
		showCustomNonce: PropTypes.bool,
		/**
		 * Set transaction nonce
		 */
		setNonce: PropTypes.func,
		/**
		 * Set proposed nonce (from network)
		 */
		setProposedNonce: PropTypes.func,
		nonce: PropTypes.number,
		proposedNonce: PropTypes.number
	};

	state = {
		toFocused: false,
		amountError: '',
		actionKey: strings('transactions.tx_review_confirm'),
		nonceModalVisible: false
	};

	componentDidMount = async () => {
		await this.getNetworkNonce();
	};

	getNetworkNonce = async () => {
		const { setNonce, setProposedNonce, proposedNonce } = this.props;
		if (!proposedNonce) {
			const { TransactionController } = Engine.context;
			const { from } = this.props.transaction;
			const networkNonce = await util.query(TransactionController.ethQuery, 'getTransactionCount', [
				from,
				'pending'
			]);
			const proposedNonce = parseInt(networkNonce, 16);
			setNonce(proposedNonce);
			setProposedNonce(proposedNonce);
		} else {
			Promise.resolve();
		}
	};

	toggleNonceModal = () => this.setState(state => ({ nonceModalVisible: !state.nonceModalVisible }));

	renderCustomNonceModal = () => {
		const { proposedNonce, nonce } = this.props;
		const { setNonce } = this.props;
		return (
			<CustomNonceModal
				proposedNonce={proposedNonce}
				nonceValue={nonce}
				close={() => this.toggleNonceModal()}
				save={setNonce}
			/>
		);
	};

	getTotalFiat = (asset, totalGas, conversionRate, exchangeRate, currentCurrency, amountToken) => {
		let total = 0;
		const gasFeeFiat = weiToFiatNumber(totalGas, conversionRate);
		const balanceFiat = balanceToFiatNumber(parseFloat(amountToken), conversionRate, exchangeRate);
		const base = Math.pow(10, 5);
		total = ((parseFloat(gasFeeFiat) + parseFloat(balanceFiat)) * base) / base;
		return `${total} ${currentCurrency}`;
	};

	buyEth = () => {
		const { navigation } = this.props;
		/* this is kinda weird, we have to reject the transaction to collapse the modal */
		this.onCancelPress();
		navigation.navigate('PaymentMethodSelector');
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.RECEIVE_OPTIONS_PAYMENT_REQUEST);
		});
	};

	edit = () => {
		const { edit } = this.props;
		edit && edit();
	};

	getRenderTotals = (totalGas, totalGasFiat) => {
		const {
			transaction: { value, selectedAsset, assetType },
			currentCurrency,
			conversionRate,
			contractExchangeRates,
			ticker,
			over
		} = this.props;

		const totals = {
			ETH: () => {
				const totalEth = isBN(value) ? value.add(totalGas) : totalGas;
				const totalFiat = (
					<Text style={[styles.overviewEth, over && styles.over]}>
						{weiToFiat(totalEth, conversionRate, currentCurrency)}
					</Text>
				);
				const totalValue = (
					<Text
						style={
							totalFiat
								? [styles.overviewEth, over && styles.over]
								: [styles.overviewPrimary, styles.overviewAccent]
						}
					>{`${renderFromWei(totalEth)} ${getTicker(ticker)}`}</Text>
				);
				return [totalFiat, totalValue];
			},
			ERC20: () => {
				const amountToken = renderFromTokenMinimalUnit(value, selectedAsset.decimals);
				const conversionRateAsset = contractExchangeRates[selectedAsset.address];
				const totalFiat = this.getTotalFiat(
					selectedAsset,
					totalGas,
					conversionRate,
					conversionRateAsset,
					currentCurrency,
					amountToken
				);
				const totalValue = (
					<View style={styles.totalValue}>
						<Text numberOfLines={1} style={[styles.overviewEth, styles.assetName]}>
							{amountToken + ' ' + selectedAsset.symbol}
						</Text>
						<Text
							style={totalFiat ? styles.overviewEth : [styles.overviewPrimary, styles.overviewAccent]}
						>{` + ${renderFromWei(totalGas)} ${getTicker(ticker)}`}</Text>
					</View>
				);
				return [totalFiat, totalValue];
			},
			ERC721: () => {
				const totalFiat = totalGasFiat;
				const totalValue = (
					<View style={styles.totalValue}>
						<Text numberOfLines={1} style={[styles.overviewEth, styles.collectibleName]}>
							{selectedAsset.name}
						</Text>
						<Text numberOfLines={1} style={styles.overviewEth}>
							{' (#' + selectedAsset.tokenId + ')'}
						</Text>
						<Text style={styles.overviewEth}>{` + ${renderFromWei(totalGas)} ${getTicker(ticker)}`}</Text>
					</View>
				);
				return [totalFiat, totalValue];
			},
			default: () => [undefined, undefined]
		};
		return totals[assetType] || totals.default;
	};

	onCancelPress = () => {
		const { onCancelPress } = this.props;
		onCancelPress && onCancelPress();
	};

	gotoFaucet = () => {
		const mmFaucetUrl = 'https://faucet.metamask.io/';
		InteractionManager.runAfterInteractions(() => {
			this.onCancelPress();
			this.props.navigation.navigate('BrowserView', {
				newTabUrl: mmFaucetUrl
			});
		});
	};

	render() {
		const { amountError, nonceModalVisible } = this.state;
		const { nonce } = this.props.transaction;
		const {
			fiatValue,
			assetAmount,
			primaryCurrency,
			toggleDataView,
			ready,
			transaction: { gas, gasPrice, warningGasPriceHigh },
			currentCurrency,
			conversionRate,
			ticker,
			error,
			over,
			network,
			showCustomNonce
		} = this.props;
		const is_main_net = isMainNet(network);
		const totalGas = isBN(gas) && isBN(gasPrice) ? gas.mul(gasPrice) : toBN('0x0');
		const totalGasFiat = weiToFiat(totalGas, conversionRate, currentCurrency);
		const totalGasEth = `${renderFromWei(totalGas)} ${getTicker(ticker)}`;
		const [totalFiat, totalValue] = this.getRenderTotals(totalGas, totalGasFiat)();
		const errorPress = is_main_net ? this.buyEth : this.gotoFaucet;
		const networkName = capitalize(getNetworkName(network));
		const errorLinkText = is_main_net
			? strings('transaction.buy_more_eth')
			: strings('transaction.get_ether', { networkName });

		return (
			<React.Fragment>
				{nonceModalVisible && this.renderCustomNonceModal()}
				<TransactionReviewFeeCard
					totalGasFiat={totalGasFiat}
					totalGasEth={totalGasEth}
					totalFiat={totalFiat}
					fiat={fiatValue}
					totalValue={totalValue}
					transactionValue={assetAmount}
					primaryCurrency={primaryCurrency}
					gasEstimationReady={ready}
					edit={this.edit}
					over={over}
					warningGasPriceHigh={warningGasPriceHigh}
					showCustomNonce={showCustomNonce}
					nonceValue={nonce}
					onNonceEdit={this.toggleNonceModal}
				/>
				{!!amountError && (
					<View style={styles.overviewAlert}>
						<MaterialIcon name={'error'} size={20} style={styles.overviewAlertIcon} />
						<Text style={styles.overviewAlertText}>
							{strings('transaction.alert')}: {amountError}.
						</Text>
					</View>
				)}
				{!!error && (
					<View style={styles.errorWrapper}>
						<TouchableOpacity onPress={errorPress}>
							<Text style={styles.error}>{error}</Text>
							{/* only show buy more on mainnet */}
							{over && is_main_net && (
								<Text style={[styles.error, styles.underline]}>{errorLinkText}</Text>
							)}
						</TouchableOpacity>
					</View>
				)}
				{!!warningGasPriceHigh && (
					<View style={styles.errorWrapper}>
						<Text style={styles.error}>{warningGasPriceHigh}</Text>
					</View>
				)}
				{!over && !showCustomNonce && (
					<View style={styles.viewDataWrapper}>
						<TouchableOpacity style={styles.viewDataButton} onPress={toggleDataView}>
							<Text style={styles.viewDataText}>{strings('transaction.view_data')}</Text>
						</TouchableOpacity>
					</View>
				)}
			</React.Fragment>
		);
	}
}

const mapStateToProps = state => ({
	network: state.engine.backgroundState.NetworkController.network,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	transaction: getNormalizedTxState(state),
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	primaryCurrency: state.settings.primaryCurrency,
	showCustomNonce: state.settings.showCustomNonce
});

const mapDispatchToProps = dispatch => ({
	setNonce: nonce => dispatch(setNonce(nonce)),
	setProposedNonce: nonce => dispatch(setProposedNonce(nonce))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withNavigation(TransactionReviewInformation));
