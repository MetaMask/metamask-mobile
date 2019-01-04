import React, { Component } from 'react';
import ActionView from '../ActionView';
import Identicon from '../Identicon';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import { isBN, weiToFiat, fromWei, balanceToFiat } from '../../util/number';
import { strings } from '../../../locales/i18n';
import { getTransactionReviewActionKey } from '../../util/transactions';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import TransactionReviewInformation from './TransactionReviewInformation';
import TransactionReviewData from './TransactionReviewData';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		flex: 1
	},
	graphic: {
		borderBottomWidth: 1,
		borderColor: colors.inputBorderColor,
		borderTopWidth: 1,
		flexDirection: 'row',
		flexGrow: 0,
		flexShrink: 0,
		paddingHorizontal: 16
	},
	addressText: {
		...fontStyles.bold,
		flex: 1,
		fontSize: 16,
		marginLeft: 9
	},
	arrow: {
		backgroundColor: colors.white,
		borderColor: colors.lightGray,
		borderRadius: 15,
		borderWidth: 1,
		flex: 0,
		height: 30,
		left: '50%',
		marginTop: -15,
		position: 'absolute',
		top: '50%',
		width: 30,
		zIndex: 1
	},
	arrowIcon: {
		color: colors.gray,
		marginLeft: 3,
		marginTop: 3
	},
	addressGraphic: {
		alignItems: 'center',
		flexDirection: 'row',
		flexGrow: 1,
		flexShrink: 1,
		height: 42,
		width: '50%'
	},
	fromGraphic: {
		borderColor: colors.inputBorderColor,
		borderRightWidth: 1,
		paddingRight: 32
	},
	toGraphic: {
		paddingLeft: 32
	},
	reviewForm: {
		flex: 1
	},
	confirmBadge: {
		...fontStyles.normal,
		alignItems: 'center',
		borderColor: colors.subtleGray,
		borderRadius: 4,
		borderWidth: 1,
		color: colors.subtleGray,
		fontSize: 12,
		lineHeight: 22,
		textAlign: 'center',
		width: 74
	},
	summary: {
		backgroundColor: colors.beige,
		padding: 16
	},
	summaryFiat: {
		...fontStyles.normal,
		color: colors.copy,
		fontSize: 44,
		paddingVertical: 4
	},
	summaryEth: {
		...fontStyles.normal,
		color: colors.subtleGray,
		fontSize: 24
	},
	overview: {
		flex: 1
	},
	goBack: {
		alignItems: 'center',
		flexDirection: 'row',
		left: -8,
		marginTop: 8,
		position: 'relative',
		width: 150
	},
	goBackText: {
		...fontStyles.bold,
		color: colors.primary,
		fontSize: 22
	},
	goBackIcon: {
		color: colors.primary,
		flex: 0
	},
	tabUnderlineStyle: {
		height: 2,
		backgroundColor: colors.primary
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
});

/**
 * Component that supports reviewing a transaction
 */
class TransactionReview extends Component {
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
		 * Currently-active account address in the current keychain
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Indicates whether hex data should be shown in transaction editor
		 */
		showHexData: PropTypes.bool,
		/**
		 * Transaction object associated with this transaction
		 */
		transactionData: PropTypes.object,
		/**
		 * Callback to validate amount in transaction in parent state
		 */
		validateAmount: PropTypes.func,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		contractExchangeRates: PropTypes.object
	};

	state = {
		toFocused: false,
		amountError: '',
		actionKey: strings('transactions.tx_review_confirm'),
		showHexData: false
	};

	componentDidMount = async () => {
		const {
			validateAmount,
			transactionData,
			transactionData: { data }
		} = this.props;
		let { showHexData } = this.props;
		showHexData = showHexData || data;
		const amountError = validateAmount && validateAmount();
		const actionKey = await getTransactionReviewActionKey(transactionData);
		this.setState({ amountError, actionKey, showHexData });
	};

	edit = () => {
		const { onModeChange } = this.props;
		onModeChange && onModeChange('edit');
	};

	getAssetConversion(asset, amount, conversionRate, exchangeRate, currentCurrency) {
		let convertedAmount;
		if (asset) {
			if (exchangeRate) {
				convertedAmount = balanceToFiat(
					parseFloat(amount) || 0,
					conversionRate,
					exchangeRate,
					currentCurrency
				).toUpperCase();
			} else {
				convertedAmount = strings('transaction.conversion_not_available');
			}
		} else {
			convertedAmount = weiToFiat(amount, conversionRate, currentCurrency).toUpperCase();
		}
		return convertedAmount;
	}

	renderSummary = () => {
		const {
			transactionData: { amount, asset },
			currentCurrency,
			contractExchangeRates
		} = this.props;
		const { actionKey } = this.state;
		const assetAmount = isBN(amount) && asset ? fromWei(amount) : undefined;
		const conversionRate = asset ? contractExchangeRates[asset.address] : this.props.conversionRate;
		return (
			<View style={styles.summary}>
				<Text style={styles.confirmBadge}>{actionKey}</Text>

				{!conversionRate ? (
					<Text style={styles.summaryFiat}>
						{asset
							? assetAmount + ' ' + asset.symbol
							: fromWei(amount).toString() + ' ' + strings('unit.eth')}
					</Text>
				) : (
					<View>
						<Text style={styles.summaryFiat}>
							{this.getAssetConversion(
								asset,
								asset ? assetAmount : amount,
								this.props.conversionRate,
								(asset && contractExchangeRates[asset.address]) || null,
								currentCurrency
							)}
						</Text>
						<Text style={styles.summaryEth}>
							{asset
								? assetAmount + ' ' + asset.symbol
								: fromWei(amount).toString() + ' ' + strings('unit.eth')}
						</Text>
					</View>
				)}

				<TouchableOpacity style={styles.goBack} onPress={this.edit}>
					<MaterialIcon name={'keyboard-arrow-left'} size={22} style={styles.goBackIcon} />
					<Text style={styles.goBackText}>{strings('transaction.edit')}</Text>
				</TouchableOpacity>
			</View>
		);
	};

	renderTransactionDirection = () => {
		const {
			transactionData: { from = this.props.selectedAddress, to }
		} = this.props;
		return (
			<View style={styles.graphic}>
				<View style={{ ...styles.addressGraphic, ...styles.fromGraphic }}>
					<Identicon address={from} diameter={18} />
					<Text style={styles.addressText} numberOfLines={1}>
						{from}
					</Text>
				</View>
				<View style={styles.arrow}>
					<MaterialIcon name={'arrow-forward'} size={22} style={styles.arrowIcon} />
				</View>
				<View style={{ ...styles.addressGraphic, ...styles.toGraphic }}>
					<Identicon address={to} diameter={18} />
					<Text style={styles.addressText} numberOfLines={1}>
						{to}
					</Text>
				</View>
			</View>
		);
	};

	renderTabBar() {
		return (
			<DefaultTabBar
				underlineStyle={styles.tabUnderlineStyle}
				activeTextColor={colors.primary}
				inactiveTextColor={colors.fontTertiary}
				backgroundColor={colors.white}
				tabStyle={styles.tabStyle}
				textStyle={styles.textStyle}
			/>
		);
	}

	renderTransactionDetails = () => {
		const { showHexData, actionKey } = this.state;
		const { transactionData } = this.props;
		return (
			<View style={styles.overview}>
				{showHexData && (
					<ScrollableTabView ref={this.scrollableTabViewRef} renderTabBar={this.renderTabBar}>
						<TransactionReviewInformation
							edit={this.edit}
							transactionData={transactionData}
							tabLabel={strings('transaction.review_details')}
						/>
						<TransactionReviewData
							transactionData={transactionData}
							actionKey={actionKey}
							tabLabel={strings('transaction.review_data')}
						/>
					</ScrollableTabView>
				)}
				{!showHexData && <TransactionReviewInformation edit={this.edit} transactionData={transactionData} />}
			</View>
		);
	};

	render = () => (
		<View style={styles.root}>
			{this.renderTransactionDirection()}
			{this.renderSummary()}
			<ActionView
				confirmButtonMode="confirm"
				onCancelPress={this.props.onCancel}
				onConfirmPress={this.props.onConfirm}
				isScrollable={false}
			>
				<View style={styles.reviewForm}>{this.renderTransactionDetails()}</View>
			</ActionView>
		</View>
	);
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	showHexData: state.settings.showHexData
});

export default connect(mapStateToProps)(TransactionReview);
