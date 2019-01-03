import React, { Component } from 'react';
import ActionView from '../ActionView';
import Identicon from '../Identicon';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import { toBN, isBN, weiToFiat, fromWei, balanceToFiat, weiToFiatNumber, balanceToFiatNumber } from '../../util/number';
import { strings } from '../../../locales/i18n';

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
		borderBottomWidth: 1,
		borderColor: colors.lightGray,
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
		padding: 16
	},
	overviewRow: {
		alignItems: 'center',
		flexDirection: 'row',
		paddingVertical: 15
	},
	overviewAlert: {
		alignItems: 'center',
		backgroundColor: colors.lightRed,
		borderColor: colors.borderRed,
		borderRadius: 4,
		borderWidth: 1,
		flexDirection: 'row',
		height: 32,
		paddingHorizontal: 16
	},
	overviewAlertText: {
		...fontStyles.normal,
		color: colors.borderRed,
		flex: 1,
		fontSize: 12,
		marginLeft: 8
	},
	overviewAlertIcon: {
		color: colors.borderRed,
		flex: 0
	},
	topOverviewRow: {
		borderBottomWidth: 1,
		borderColor: colors.lightGray
	},
	overviewLabel: {
		...fontStyles.bold,
		color: colors.gray,
		flex: 1,
		fontSize: 12,
		width: 60
	},
	overviewFiat: {
		...fontStyles.bold,
		color: colors.copy,
		fontSize: 24,
		textAlign: 'right'
	},
	overviewAccent: {
		color: colors.primary
	},
	overviewEth: {
		...fontStyles.normal,
		color: colors.subtleGray,
		fontSize: 16,
		textAlign: 'right'
	},
	overviewInfo: {
		...fontStyles.normal,
		fontSize: 12,
		marginBottom: 6,
		textAlign: 'right'
	},
	overviewAction: {
		...fontStyles.nold,
		color: colors.primary
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
		amountError: ''
	};

	componentDidMount = () => {
		const { validateAmount } = this.props;
		const amountError = validateAmount && validateAmount();
		this.setState({ amountError });
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
		const assetAmount = isBN(amount) && asset ? fromWei(amount) : undefined;
		const conversionRate = asset ? contractExchangeRates[asset.address] : this.props.conversionRate;
		return (
			<View style={styles.summary}>
				<Text style={styles.confirmBadge}>{strings('transaction.confirm').toUpperCase()}</Text>

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

	getTotalAmount = (totalGas, amount, conversionRate, exchangeRate, currentCurrency) => {
		let total = 0;
		const gasFeeFiat = weiToFiatNumber(totalGas, conversionRate);
		let balanceFiat;
		if (exchangeRate) {
			balanceFiat = balanceToFiatNumber(parseFloat(amount), conversionRate, exchangeRate);
		} else {
			balanceFiat = weiToFiatNumber(amount, conversionRate, exchangeRate);
		}
		total = parseFloat(gasFeeFiat) + parseFloat(balanceFiat);
		return `${total} ${currentCurrency.toUpperCase()}`;
	};

	render = () => {
		const {
			transactionData: { amount, gas, gasPrice, from = this.props.selectedAddress, to, asset },
			currentCurrency,
			conversionRate,
			contractExchangeRates
		} = this.props;

		const conversionRateAsset = asset ? contractExchangeRates[asset.address] : undefined;
		const { amountError } = this.state;
		const totalGas = isBN(gas) && isBN(gasPrice) ? gas.mul(gasPrice) : toBN('0x0');
		const ethTotal = isBN(amount) && !asset ? amount.add(totalGas) : totalGas;
		const assetAmount = isBN(amount) && asset ? fromWei(amount) : undefined;

		return (
			<View style={styles.root}>
				<ActionView
					confirmButtonMode="confirm"
					cancelText={strings('transaction.reject')}
					onCancelPress={this.props.onCancel}
					onConfirmPress={this.props.onConfirm}
				>
					<View style={styles.reviewForm}>
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
						{this.renderSummary()}
						<View style={styles.overview}>
							<View style={{ ...styles.overviewRow, ...styles.topOverviewRow }}>
								<Text style={styles.overviewLabel}>{strings('transaction.gas_fee').toUpperCase()}</Text>
								<View style={styles.overviewContent}>
									<TouchableOpacity onPress={this.edit}>
										<Text style={{ ...styles.overviewInfo, ...styles.overviewAction }}>
											{strings('transaction.edit').toUpperCase()}
										</Text>
									</TouchableOpacity>
									<Text style={styles.overviewFiat}>
										{weiToFiat(totalGas, conversionRate, currentCurrency).toUpperCase()}
									</Text>
									<Text style={styles.overviewEth}>
										{fromWei(totalGas).toString()} {strings('unit.eth')}
									</Text>
								</View>
							</View>

							<View style={styles.overviewRow}>
								<Text style={styles.overviewLabel}>{strings('transaction.total').toUpperCase()}</Text>
								<View style={styles.overviewContent}>
									<Text style={styles.overviewInfo}>
										{strings('transaction.amount').toUpperCase()} +{' '}
										{strings('transaction.gas_fee').toUpperCase()}
									</Text>
									<Text style={{ ...styles.overviewFiat, ...styles.overviewAccent }}>
										{this.getTotalAmount(
											totalGas,
											asset ? assetAmount : ethTotal,
											conversionRate,
											conversionRateAsset,
											currentCurrency
										)}
									</Text>

									<Text style={styles.overviewEth}>
										{asset && assetAmount} {asset && asset.symbol} {asset && ' + '}
										{fromWei(ethTotal).toString()} {strings('unit.eth')}
									</Text>
								</View>
							</View>
							{amountError ? (
								<View style={styles.overviewAlert}>
									<MaterialIcon name={'error'} size={20} style={styles.overviewAlertIcon} />
									<Text style={styles.overviewAlertText}>
										{strings('transaction.alert')}: {amountError}.
									</Text>
								</View>
							) : null}
						</View>
					</View>
				</ActionView>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates
});

export default connect(mapStateToProps)(TransactionReview);
