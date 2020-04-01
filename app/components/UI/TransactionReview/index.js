import React, { PureComponent } from 'react';
import ActionView from '../ActionView';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, InteractionManager, ActivityIndicator, TouchableOpacity } from 'react-native';
import { colors, baseStyles, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { getTransactionReviewActionKey } from '../../../util/transactions';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import TransactionReviewInformation from './TransactionReviewInformation';
import TransactionReviewData from './TransactionReviewData';
// import TransactionReviewSummary from './TransactionReviewSummary';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { AddressFrom, AddressTo } from '../../Views/SendFlow/AddressInputs';
import { weiToFiat } from '../../../util/number';
// import { prepareTransaction } from '../../../actions/newTransaction';
import ErrorMessage from '../../Views/SendFlow/ErrorMessage';

const styles = StyleSheet.create({
	actionTouchable: {
		padding: 12
	},
	actionText: {
		...fontStyles.normal,
		color: colors.blue,
		fontSize: 14,
		alignSelf: 'center'
	},
	actionsWrapper: {
		margin: 24
	},
	summaryWrapper: {
		flexDirection: 'column',
		borderWidth: 1,
		borderColor: colors.grey050,
		borderRadius: 8,
		padding: 16,
		marginHorizontal: 24
	},
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginVertical: 6
	},
	totalCryptoRow: {
		alignItems: 'flex-end',
		marginTop: 8
	},
	textSummary: {
		...fontStyles.normal,
		color: colors.black,
		fontSize: 12
	},
	textSummaryAmount: {
		textTransform: 'uppercase'
	},
	imputWrapper: {
		flex: 0,
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050,
		paddingHorizontal: 8
	},
	amountWrapper: {
		flexDirection: 'column',
		margin: 24
	},
	textAmountLabel: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center',
		color: colors.grey500,
		textTransform: 'uppercase',
		marginVertical: 3
	},
	textAmount: {
		fontFamily: 'Roboto-Light',
		fontWeight: fontStyles.light.fontWeight,
		color: colors.black,
		fontSize: 44,
		textAlign: 'center'
	},
	root: {
		backgroundColor: colors.white,
		flex: 1
	},
	// reviewForm: {
	// 	flex: 1
	// },
	overview: {
		flex: 1
	},
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
	}
	// error: {
	// 	backgroundColor: colors.red000,
	// 	color: colors.red,
	// 	marginTop: 5,
	// 	paddingVertical: 8,
	// 	paddingHorizontal: 5,
	// 	textAlign: 'center',
	// 	fontSize: 12,
	// 	letterSpacing: 0.5,
	// 	marginHorizontal: 14,
	// 	...fontStyles.normal
	// }
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
		conversionRate: PropTypes.number,
		currentCurrency: PropTypes.string
	};

	state = {
		gasEstimationReady: true /* TODO: Make this actually work */,
		toFocused: false,
		actionKey: strings('transactions.tx_review_confirm'),
		showHexData: false,
		error: undefined
	};

	componentDidMount = async () => {
		const {
			validate,
			transaction,
			transaction: { data }
		} = this.props;
		let { showHexData } = this.props;
		showHexData = showHexData || data;
		const error = validate && (await validate());
		const actionKey = await getTransactionReviewActionKey(transaction);
		this.setState({ error, actionKey, showHexData });
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.TRANSACTIONS_CONFIRM_STARTED);
		});
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

	renderTransactionDetails = () => {
		const { showHexData, actionKey } = this.state;
		const { transaction } = this.props;
		return (
			<View style={styles.overview}>
				{showHexData && transaction.data ? (
					<ScrollableTabView ref={this.scrollableTabViewRef} renderTabBar={this.renderTabBar}>
						<TransactionReviewInformation
							edit={this.edit}
							tabLabel={strings('transaction.review_details')}
						/>
						<TransactionReviewData actionKey={actionKey} tabLabel={strings('transaction.review_data')} />
					</ScrollableTabView>
				) : (
					<TransactionReviewInformation edit={this.edit} />
				)}
			</View>
		);
	};

	renderIfGastEstimationReady = children => {
		const { gasEstimationReady } = this.state;
		return !gasEstimationReady ? (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		) : (
			children
		);
	};

	render = () => {
		const {
			transactionConfirmed,
			transaction,
			currentCurrency,
			conversionRate,
			onCancel,
			onConfirm,
			transaction: { from, to, assetType, readableValue }
		} = this.props;
		console.log(currentCurrency, conversionRate);
		console.log(transaction);
		const { error, gasEstimationReady, showHexData } = this.state;
		const errorMessage = null;
		return (
			<View style={styles.root}>
				<View style={styles.imputWrapper}>
					<AddressFrom
						// eslint-disable-next-line react/jsx-no-bind
						onPressIcon={() => ({})}
						fromAccountAddress={from}
						fromAccountName={'Ricky'}
						fromAccountBalance={'0.12'}
					/>
					<AddressTo
						// inputRef={this.addressToInputRef}
						highlighted={false}
						addressToReady={false}
						toSelectedAddress={to}
						toAddressName={'Mark'}
						// eslint-disable-next-line react/jsx-no-bind
						onToSelectedAddressChange={() => ({})}
						// eslint-disable-next-line react/jsx-no-bind
						onScan={() => ({})}
						// eslint-disable-next-line react/jsx-no-bind
						onClear={() => ({})}
						// eslint-disable-next-line react/jsx-no-bind
						onInputFocus={() => ({})}
						// eslint-disable-next-line react/jsx-no-bind
						onInputBlur={() => ({})}
						// eslint-disable-next-line react/jsx-no-bind
						onSubmit={() => ({})}
						inputWidth={{ width: '100%' }}
					/>
				</View>
				<ActionView
					style={baseStyles.flexGrow}
					confirmButtonMode="confirm"
					cancelText={strings('transaction.reject')}
					onCancelPress={onCancel}
					onConfirmPress={onConfirm}
					confirmed={transactionConfirmed}
					confirmDisabled={error !== undefined}
				>
					<>
						<View style={styles.amountWrapper}>
							<Text style={styles.textAmountLabel}>{strings('transaction.amount')}</Text>
							<Text style={styles.textAmount} testID={'confirm-txn-amount'}>
								{readableValue} {assetType}
							</Text>
							<Text style={styles.textAmountLabel}>
								{weiToFiat(readableValue, conversionRate, currentCurrency)}
							</Text>
						</View>

						<View style={styles.summaryWrapper}>
							<View style={styles.summaryRow}>
								<Text style={styles.textSummary}>{strings('transaction.amount')}</Text>
								<Text style={[styles.textSummary, styles.textSummaryAmount]}>{`100`}</Text>
							</View>
							<View style={styles.summaryRow}>
								<Text style={styles.textSummary}>{strings('transaction.transaction_fee')}</Text>
								{this.renderIfGastEstimationReady(
									<Text style={[styles.textSummary, styles.textSummaryAmount]}>{`200`}</Text>
								)}
							</View>
							<View style={styles.separator} />
							<View style={styles.summaryRow}>
								<Text style={[styles.textSummary, styles.textBold]}>
									{strings('transaction.total_amount')}
								</Text>
								{this.renderIfGastEstimationReady(
									<Text style={[styles.textSummary, styles.textSummaryAmount, styles.textBold]}>
										{`200`}
									</Text>
								)}
							</View>
							<View style={styles.totalCryptoRow}>
								{this.renderIfGastEstimationReady(
									<Text style={[styles.textSummary, styles.textCrypto]}>{`200`}</Text>
								)}
							</View>
						</View>
						{errorMessage && (
							<View style={styles.errorMessageWrapper}>
								<ErrorMessage errorMessage={errorMessage} />
							</View>
						)}
						<View style={styles.actionsWrapper}>
							<TouchableOpacity
								style={styles.actionTouchable}
								disabled={!gasEstimationReady}
								onPress={this.toggleCustomGasModal}
							>
								<Text style={styles.actionText}>{strings('transaction.adjust_transaction_fee')}</Text>
							</TouchableOpacity>
							{showHexData && (
								<TouchableOpacity style={styles.actionTouchable} onPress={this.toggleHexDataModal}>
									<Text style={styles.actionText}>{strings('transaction.hex_data')}</Text>
								</TouchableOpacity>
							)}
						</View>
					</>
				</ActionView>
			</View>
		);
	};
}

const mapStateToProps = state => {
	console.log(state.engine.backgroundState.CurrencyRateController);
	return {
		conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
		currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
		accounts: state.engine.backgroundState.AccountTrackerController.accounts,
		showHexData: state.settings.showHexData,
		transaction: state.transaction
	};
};

export default connect(mapStateToProps)(TransactionReview);
