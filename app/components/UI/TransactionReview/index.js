import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, InteractionManager } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import {
	getTransactionReviewActionKey,
	getNormalizedTxState,
	APPROVE_FUNCTION_SIGNATURE,
	decodeTransferData,
	getTicker
} from '../../../util/transactions';
import {
	weiToFiat,
	balanceToFiat,
	renderFromTokenMinimalUnit,
	renderFromWei,
	fromTokenMinimalUnit
} from '../../../util/number';
import { safeToChecksumAddress } from '../../../util/address';
import Device from '../../../util/Device';
import contractMap from 'eth-contract-metadata';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import TransactionReviewInformation from './TransactionReviewInformation';
import TransactionReviewSummary from './TransactionReviewSummary';
import TransactionReviewData from './TransactionReviewData';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import TransactionHeader from '../TransactionHeader';
import AccountInfoCard from '../AccountInfoCard';
import ActionView from '../ActionView';

const styles = StyleSheet.create({
	tabUnderlineStyle: {
		height: 2,
		backgroundColor: colors.blue
	},
	tabStyle: {
		paddingBottom: 0,
		backgroundColor: colors.beige
	},
	textStyle: {
		fontSize: 12,
		letterSpacing: 0.5,
		...fontStyles.bold
	},
	actionViewWrapper: {
		height: Device.isMediumDevice() ? 200 : 385
	},
	actionViewChildren: {
		height: 300
	},
	accountInfoCardWrapper: {
		paddingHorizontal: 24,
		paddingBottom: 12
	},
	errorWrapper: {
		marginHorizontal: 24,
		marginBottom: 12,
		paddingHorizontal: 10,
		paddingVertical: 8,
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
		...fontStyles.normal
	}
});

/**
 * PureComponent that supports reviewing a transaction
 */
class TransactionReview extends PureComponent {
	static propTypes = {
		/**
		 * Callback triggered when this transaction is cancelled
		 */
		onCancel: PropTypes.func,
		/**
		 * Called when a user changes modes
		 */
		onModeChange: PropTypes.func,
		/**
		 * Callback triggered when this transaction is cancelled
		 */
		onConfirm: PropTypes.func,
		/**
		 * Indicates whether hex data should be shown in transaction editor
		 */
		showHexData: PropTypes.bool,
		/**
		 * Whether the transaction was confirmed or not
		 */
		transactionConfirmed: PropTypes.bool,
		/**
		 * Transaction object associated with this transaction
		 */
		transaction: PropTypes.object,
		/**
		 * Callback to validate transaction in parent state
		 */
		validate: PropTypes.func,
		/**
		 * Browser/tab information
		 */
		browser: PropTypes.object,
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		contractExchangeRates: PropTypes.object,
		/**
		 * Array of ERC20 assets
		 */
		tokens: PropTypes.array,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string
	};

	state = {
		toFocused: false,
		actionKey: strings('transactions.tx_review_confirm'),
		showHexData: false,
		dataVisible: false,
		error: undefined,
		assetAmount: undefined,
		conversionRate: undefined,
		fiatValue: undefined
	};

	componentDidMount = async () => {
		const {
			validate,
			transaction,
			transaction: { data, to },
			tokens
		} = this.props;
		let { showHexData } = this.props;
		let assetAmount, conversionRate, fiatValue;
		showHexData = showHexData || data;
		const approveTransaction = data && data.substr(0, 10) === APPROVE_FUNCTION_SIGNATURE;
		const error = validate && (await validate());
		const actionKey = await getTransactionReviewActionKey(transaction);
		if (approveTransaction) {
			let contract = contractMap[safeToChecksumAddress(to)];
			if (!contract) {
				contract = tokens.find(({ address }) => address === safeToChecksumAddress(to));
			}
			const symbol = (contract && contract.symbol) || 'ERC20';
			assetAmount = `${decodeTransferData('transfer', data)[1]} ${symbol}`;
		} else {
			[assetAmount, conversionRate, fiatValue] = this.getRenderValues()();
		}
		this.setState({ error, actionKey, showHexData, assetAmount, conversionRate, fiatValue, approveTransaction });
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.TRANSACTIONS_CONFIRM_STARTED);
		});
	};

	getRenderValues = () => {
		const {
			transaction: { value, selectedAsset, assetType },
			currentCurrency,
			contractExchangeRates,
			ticker
		} = this.props;
		const values = {
			ETH: () => {
				const assetAmount = `${renderFromWei(value)} ${getTicker(ticker)}`;
				const conversionRate = this.props.conversionRate;
				const fiatValue = weiToFiat(value, conversionRate, currentCurrency);
				return [assetAmount, conversionRate, fiatValue];
			},
			ERC20: () => {
				const assetAmount = `${renderFromTokenMinimalUnit(value, selectedAsset.decimals)} ${
					selectedAsset.symbol
				}`;
				const conversionRate = contractExchangeRates[selectedAsset.address];
				const fiatValue = balanceToFiat(
					(value && fromTokenMinimalUnit(value, selectedAsset.decimals)) || 0,
					this.props.conversionRate,
					conversionRate,
					currentCurrency
				);
				return [assetAmount, conversionRate, fiatValue];
			},
			ERC721: () => {
				const assetAmount = strings('unit.token_id') + selectedAsset.tokenId;
				const conversionRate = true;
				const fiatValue = selectedAsset.name;
				return [assetAmount, conversionRate, fiatValue];
			},
			default: () => [undefined, undefined, undefined]
		};
		return values[assetType] || values.default;
	};

	edit = () => {
		const { onModeChange } = this.props;
		Analytics.trackEvent(ANALYTICS_EVENT_OPTS.TRANSACTIONS_EDIT_TRANSACTION);
		onModeChange && onModeChange('edit');
	};

	renderTabBar() {
		return (
			<DefaultTabBar
				underlineStyle={styles.tabUnderlineStyle}
				activeTextColor={colors.blue}
				inactiveTextColor={colors.fontTertiary}
				backgroundColor={colors.white}
				tabStyle={styles.tabStyle}
				textStyle={styles.textStyle}
			/>
		);
	}

	toggleDataView = () => {
		this.setState({ dataVisible: !this.state.dataVisible });
	};

	getUrlFromBrowser() {
		const { browser } = this.props;
		let url;
		browser.tabs.forEach(tab => {
			if (tab.id === browser.activeTab) {
				url = tab.url;
			}
		});
		return url;
	}

	render = () => {
		const { transactionConfirmed } = this.props;
		const {
			actionKey,
			error,
			assetAmount,
			conversionRate,
			fiatValue,
			approveTransaction,
			dataVisible
		} = this.state;
		const currentPageInformation = { url: this.getUrlFromBrowser() };
		const content = !dataVisible ? (
			<>
				<TransactionHeader currentPageInformation={currentPageInformation} />
				<TransactionReviewSummary
					actionKey={actionKey}
					assetAmount={assetAmount}
					conversionRate={conversionRate}
					fiatValue={fiatValue}
					approveTransaction={approveTransaction}
				/>
				{!!error && (
					<View style={styles.errorWrapper}>
						<Text style={styles.error}>{error}</Text>
					</View>
				)}
				<View style={styles.actionViewWrapper}>
					<ActionView
						confirmButtonMode="confirm"
						cancelText={strings('transaction.reject')}
						onCancelPress={this.props.onCancel}
						onConfirmPress={this.props.onConfirm}
						confirmed={transactionConfirmed}
						confirmDisabled={error !== undefined}
					>
						<View style={styles.actionViewChildren}>
							<View style={styles.accountInfoCardWrapper}>
								<AccountInfoCard />
							</View>
							<TransactionReviewInformation
								edit={this.edit}
								assetAmount={assetAmount}
								fiatValue={fiatValue}
								toggleDataView={this.toggleDataView}
							/>
						</View>
					</ActionView>
				</View>
			</>
		) : (
			<TransactionReviewData actionKey={actionKey} toggleDataView={this.toggleDataView} />
		);
		return <>{content}</>;
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	tokens: state.engine.backgroundState.AssetsController.tokens,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	showHexData: state.settings.showHexData,
	transaction: getNormalizedTxState(state),
	browser: state.browser
});

export default connect(mapStateToProps)(TransactionReview);
