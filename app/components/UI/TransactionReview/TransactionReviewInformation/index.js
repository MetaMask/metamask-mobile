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
	renderFromWei,
	BNToHex,
} from '../../../../util/number';
import { strings } from '../../../../../locales/i18n';
import {
	getTicker,
	getNormalizedTxState,
	calculateAmountsEIP1559,
	calculateEthEIP1559,
	calculateERC20EIP1559,
} from '../../../../util/transactions';
import Analytics from '../../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';
import { getNetworkName, getNetworkNonce, isMainNet } from '../../../../util/networks';
import { capitalize } from '../../../../util/general';
import CustomNonceModal from '../../../UI/CustomNonceModal';
import { setNonce, setProposedNonce } from '../../../../actions/transaction';
import TransactionReviewEIP1559 from '../TransactionReviewEIP1559';
import { GAS_ESTIMATE_TYPES } from '@metamask/controllers';
import CustomNonce from '../../../UI/CustomNonce';
import Logger from '../../../../util/Logger';

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
		marginTop: 12,
	},
	overviewAlertText: {
		...fontStyles.normal,
		color: colors.red,
		flex: 1,
		fontSize: 12,
		marginLeft: 8,
	},
	overviewAlertIcon: {
		color: colors.red,
		flex: 0,
	},
	viewDataWrapper: {
		flex: 1,
		marginTop: 16,
	},
	viewDataButton: {
		alignSelf: 'center',
	},
	viewDataText: {
		color: colors.blue,
		textAlign: 'center',
		fontSize: 12,
		...fontStyles.bold,
		alignSelf: 'center',
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
		alignItems: 'center',
	},
	error: {
		color: colors.red,
		fontSize: 12,
		lineHeight: 16,
		...fontStyles.normal,
		textAlign: 'center',
	},
	underline: {
		textDecorationLine: 'underline',
		...fontStyles.bold,
	},
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
		error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
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
		/**
		 * Indicates whether custom nonce should be shown in transaction editor
		 */
		showCustomNonce: PropTypes.bool,
		/**
		 * Set transaction nonce
		 */
		setNonce: PropTypes.func,
		/**
		 * Set proposed nonce (from network)
		 */
		setProposedNonce: PropTypes.func,
		nativeCurrency: PropTypes.string,
		gasEstimateType: PropTypes.string,
		EIP1559GasData: PropTypes.object,
		origin: PropTypes.string,
		/**
		 * Function to call when update animation starts
		 */
		onUpdatingValuesStart: PropTypes.func,
		/**
		 * Function to call when update animation ends
		 */
		onUpdatingValuesEnd: PropTypes.func,
		/**
		 * If the values should animate upon update or not
		 */
		animateOnChange: PropTypes.bool,
		/**
		 * Boolean to determine if the animation is happening
		 */
		isAnimating: PropTypes.bool,
		/**
		 * If it's a eip1559 network and dapp suggest legact gas then it should show a warning
		 */
		originWarning: PropTypes.bool,
	};

	state = {
		toFocused: false,
		amountError: '',
		actionKey: strings('transactions.tx_review_confirm'),
		nonceModalVisible: false,
	};

	componentDidMount = async () => {
		const { showCustomNonce } = this.props;
		showCustomNonce && (await this.setNetworkNonce());
	};

	setNetworkNonce = async () => {
		const { setNonce, setProposedNonce, transaction } = this.props;
		const proposedNonce = await getNetworkNonce(transaction);
		setNonce(proposedNonce);
		setProposedNonce(proposedNonce);
	};

	toggleNonceModal = () => this.setState((state) => ({ nonceModalVisible: !state.nonceModalVisible }));

	renderCustomNonceModal = () => {
		const { setNonce } = this.props;
		const { proposedNonce, nonce } = this.props.transaction;
		return (
			<CustomNonceModal
				proposedNonce={proposedNonce}
				nonceValue={nonce}
				close={this.toggleNonceModal}
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
		try {
			navigation.navigate('FiatOnRamp');
		} catch (error) {
			Logger.error(error, 'Navigation: Error when navigating to buy ETH.');
		}
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
		} = this.props;

		const totals = {
			ETH: () => {
				const totalEth = isBN(value) ? value.add(totalGas) : totalGas;
				const totalFiat = `${weiToFiat(totalEth, conversionRate, currentCurrency)}`;

				const totalValue = `${renderFromWei(totalEth)} ${getTicker(ticker)}`;

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
				const totalValue = `${amountToken + ' ' + selectedAsset.symbol} + ${renderFromWei(
					totalGas
				)} ${getTicker(ticker)}`;
				return [totalFiat, totalValue];
			},
			ERC721: () => {
				const totalFiat = totalGasFiat;
				const totalValue = `${selectedAsset.name}  (#${selectedAsset.tokenId}) + ${renderFromWei(
					totalGas
				)} ${getTicker(ticker)}`;
				return [totalFiat, totalValue];
			},
			default: () => [undefined, undefined],
		};
		return totals[assetType] || totals.default;
	};

	getRenderTotalsEIP1559 = ({ gasFeeMinNative, gasFeeMinConversion, gasFeeMaxNative, gasFeeMaxConversion }) => {
		const {
			transaction: { value, selectedAsset, assetType },
			nativeCurrency,
			currentCurrency,
			conversionRate,
			contractExchangeRates,
		} = this.props;

		let renderableTotalMinNative,
			renderableTotalMinConversion,
			renderableTotalMaxNative,
			renderableTotalMaxConversion;

		const totals = {
			ETH: () => {
				const { totalMinNative, totalMinConversion, totalMaxNative, totalMaxConversion } =
					calculateAmountsEIP1559({
						value: value && BNToHex(value),
						nativeCurrency,
						currentCurrency,
						conversionRate,
						gasFeeMinConversion,
						gasFeeMinNative,
						gasFeeMaxNative,
						gasFeeMaxConversion,
					});

				[
					renderableTotalMinNative,
					renderableTotalMinConversion,
					renderableTotalMaxNative,
					renderableTotalMaxConversion,
				] = calculateEthEIP1559({
					nativeCurrency,
					currentCurrency,
					totalMinNative,
					totalMinConversion,
					totalMaxNative,
					totalMaxConversion,
				});

				return [
					renderableTotalMinNative,
					renderableTotalMinConversion,
					renderableTotalMaxNative,
					renderableTotalMaxConversion,
				];
			},
			ERC20: () => {
				const { totalMinNative, totalMinConversion, totalMaxNative, totalMaxConversion } =
					calculateAmountsEIP1559({
						value: '0x0',
						nativeCurrency,
						currentCurrency,
						conversionRate,
						gasFeeMinConversion,
						gasFeeMinNative,
						gasFeeMaxNative,
						gasFeeMaxConversion,
					});

				const tokenAmount = renderFromTokenMinimalUnit(value, selectedAsset.decimals);
				const exchangeRate = contractExchangeRates[selectedAsset.address];
				const symbol = selectedAsset.symbol;

				[
					renderableTotalMinNative,
					renderableTotalMinConversion,
					renderableTotalMaxNative,
					renderableTotalMaxConversion,
				] = calculateERC20EIP1559({
					currentCurrency,
					nativeCurrency,
					conversionRate,
					exchangeRate,
					tokenAmount,
					totalMinConversion,
					totalMaxConversion,
					symbol,
					totalMinNative,
					totalMaxNative,
				});
				return [
					renderableTotalMinNative,
					renderableTotalMinConversion,
					renderableTotalMaxNative,
					renderableTotalMaxConversion,
				];
			},
			ERC721: () => {
				const { totalMinNative, totalMinConversion, totalMaxNative, totalMaxConversion } =
					calculateAmountsEIP1559({
						value: '0x0',
						nativeCurrency,
						currentCurrency,
						conversionRate,
						gasFeeMinConversion,
						gasFeeMinNative,
						gasFeeMaxNative,
						gasFeeMaxConversion,
					});

				[
					renderableTotalMinNative,
					renderableTotalMinConversion,
					renderableTotalMaxNative,
					renderableTotalMaxConversion,
				] = calculateEthEIP1559({
					nativeCurrency,
					currentCurrency,
					totalMinNative,
					totalMinConversion,
					totalMaxNative,
					totalMaxConversion,
				});

				renderableTotalMinNative = `${selectedAsset.name} ${
					' (#' + selectedAsset.tokenId + ')'
				} + ${renderableTotalMinNative}`;

				renderableTotalMaxNative = `${selectedAsset.name} ${
					' (#' + selectedAsset.tokenId + ')'
				} + ${renderableTotalMaxNative}`;

				return [
					renderableTotalMinNative,
					renderableTotalMinConversion,
					renderableTotalMaxNative,
					renderableTotalMaxConversion,
				];
			},
			default: () => [undefined, undefined],
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
				newTabUrl: mmFaucetUrl,
			});
		});
	};

	renderTransactionReviewEIP1559 = () => {
		const {
			EIP1559GasData,
			primaryCurrency,
			origin,
			originWarning,
			onUpdatingValuesStart,
			onUpdatingValuesEnd,
			animateOnChange,
			isAnimating,
			ready,
		} = this.props;
		let host;
		if (origin) {
			host = new URL(origin).hostname;
		}
		const [renderableTotalMinNative, renderableTotalMinConversion, renderableTotalMaxNative] =
			this.getRenderTotalsEIP1559(EIP1559GasData)();
		return (
			<TransactionReviewEIP1559
				totalNative={renderableTotalMinNative}
				totalConversion={renderableTotalMinConversion}
				totalMaxNative={renderableTotalMaxNative}
				gasFeeNative={EIP1559GasData.renderableGasFeeMinNative}
				gasFeeConversion={EIP1559GasData.renderableGasFeeMinConversion}
				gasFeeMaxNative={EIP1559GasData.renderableGasFeeMaxNative}
				gasFeeMaxConversion={EIP1559GasData.renderableGasFeeMaxConversion}
				primaryCurrency={primaryCurrency}
				timeEstimate={EIP1559GasData.timeEstimate}
				timeEstimateColor={EIP1559GasData.timeEstimateColor}
				timeEstimateId={EIP1559GasData.timeEstimateId}
				onEdit={this.edit}
				origin={host}
				originWarning={originWarning}
				onUpdatingValuesStart={onUpdatingValuesStart}
				onUpdatingValuesEnd={onUpdatingValuesEnd}
				animateOnChange={animateOnChange}
				isAnimating={isAnimating}
				gasEstimationReady={ready}
			/>
		);
	};

	renderTransactionReviewFeeCard = () => {
		const {
			primaryCurrency,
			ready,
			transaction: { gas, gasPrice },
			currentCurrency,
			conversionRate,
			ticker,
			over,
			onUpdatingValuesStart,
			onUpdatingValuesEnd,
			animateOnChange,
			isAnimating,
		} = this.props;

		const totalGas = isBN(gas) && isBN(gasPrice) ? gas.mul(gasPrice) : toBN('0x0');
		const totalGasFiat = weiToFiat(totalGas, conversionRate, currentCurrency);
		const totalGasEth = `${renderFromWei(totalGas)} ${getTicker(ticker)}`;
		const [totalFiat, totalValue] = this.getRenderTotals(totalGas, totalGasFiat)();
		return (
			<TransactionReviewEIP1559
				totalNative={totalValue}
				totalConversion={totalFiat}
				gasFeeNative={totalGasEth}
				gasFeeConversion={totalGasFiat}
				primaryCurrency={primaryCurrency}
				onEdit={() => this.edit()}
				over={over}
				onUpdatingValuesStart={onUpdatingValuesStart}
				onUpdatingValuesEnd={onUpdatingValuesEnd}
				animateOnChange={animateOnChange}
				isAnimating={isAnimating}
				gasEstimationReady={ready}
				legacy
			/>
		);
	};

	render() {
		const { amountError, nonceModalVisible } = this.state;
		const {
			toggleDataView,
			transaction: { warningGasPriceHigh },
			error,
			over,
			network,
			showCustomNonce,
			gasEstimateType,
		} = this.props;
		const { nonce } = this.props.transaction;

		const is_main_net = isMainNet(network);

		const errorPress = is_main_net ? this.buyEth : this.gotoFaucet;
		const networkName = capitalize(getNetworkName(network));
		const errorLinkText = is_main_net
			? strings('transaction.buy_more_eth')
			: strings('transaction.get_ether', { networkName });

		const showFeeMarket =
			!gasEstimateType ||
			gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET ||
			gasEstimateType === GAS_ESTIMATE_TYPES.NONE;

		return (
			<React.Fragment>
				{nonceModalVisible && this.renderCustomNonceModal()}
				{showFeeMarket ? this.renderTransactionReviewEIP1559() : this.renderTransactionReviewFeeCard()}
				{showCustomNonce && <CustomNonce nonce={nonce} onNonceEdit={this.toggleNonceModal} />}
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

const mapStateToProps = (state) => ({
	network: state.engine.backgroundState.NetworkController.network,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	transaction: getNormalizedTxState(state),
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	primaryCurrency: state.settings.primaryCurrency,
	showCustomNonce: state.settings.showCustomNonce,
	nativeCurrency: state.engine.backgroundState.CurrencyRateController.nativeCurrency,
});

const mapDispatchToProps = (dispatch) => ({
	setNonce: (nonce) => dispatch(setNonce(nonce)),
	setProposedNonce: (nonce) => dispatch(setProposedNonce(nonce)),
});

export default connect(mapStateToProps, mapDispatchToProps)(TransactionReviewInformation);
