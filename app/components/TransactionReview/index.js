import React, { Component } from 'react';
import ActionView from '../ActionView';
import Identicon from '../Identicon';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import { toBN, isBN, hexToBN, weiToFiat, fromWei } from '../../util/number';
import { toChecksumAddress } from 'ethereumjs-util';
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
		 * List of accounts from the AccountTrackerController
		 */
		accounts: PropTypes.object,
		/**
		 * ETH to currnt currency conversion rate
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
		transactionData: PropTypes.object
	};

	state = {
		toFocused: false
	};

	edit = () => {
		const { onModeChange } = this.props;
		onModeChange && onModeChange('edit');
	};

	validateAmount() {
		let error;
		const { amount, gas, gasPrice, from } = this.props.transactionData;
		const checksummedFrom = from ? toChecksumAddress(from) : '';
		const fromAccount = this.props.accounts[checksummedFrom];
		amount && !isBN(amount) && (error = strings('transaction.invalidAmount'));
		amount &&
			fromAccount &&
			isBN(gas) &&
			isBN(gasPrice) &&
			isBN(amount) &&
			hexToBN(fromAccount.balance).lt(amount.add(gas.mul(gasPrice))) &&
			(error = strings('transaction.insufficient'));
		return error;
	}

	render() {
		const {
			transactionData: { amount, gas, gasPrice, from = this.props.selectedAddress, to },
			conversionRate,
			currentCurrency
		} = this.props;
		const totalGas = isBN(gas) && isBN(gasPrice) ? gas.mul(gasPrice) : toBN('0x0');
		const total = isBN(amount) ? amount.add(totalGas) : totalGas;

		return (
			<View style={styles.root}>
				<ActionView
					confirmButtonMode="confirm"
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
						<View style={styles.summary}>
							<Text style={styles.confirmBadge}>{strings('transaction.confirm').toUpperCase()}</Text>
							<Text style={styles.summaryFiat}>
								{weiToFiat(amount, conversionRate, currentCurrency).toUpperCase()}
							</Text>
							<Text style={styles.summaryEth}>{fromWei(amount).toString()}</Text>
							<TouchableOpacity style={styles.goBack} onPress={this.edit}>
								<MaterialIcon name={'keyboard-arrow-left'} size={22} style={styles.goBackIcon} />
								<Text style={styles.goBackText}>{strings('transaction.edit')}</Text>
							</TouchableOpacity>
						</View>
						<View style={styles.overview}>
							<View style={{ ...styles.overviewRow, ...styles.topOverviewRow }}>
								<Text style={styles.overviewLabel}>{strings('transaction.gasFee').toUpperCase()}</Text>
								<View style={styles.overviewContent}>
									<TouchableOpacity onPress={this.edit}>
										<Text style={{ ...styles.overviewInfo, ...styles.overviewAction }}>
											{strings('transaction.edit').toUpperCase()}
										</Text>
									</TouchableOpacity>
									<Text style={styles.overviewFiat}>
										{weiToFiat(totalGas, conversionRate, currentCurrency).toUpperCase()}
									</Text>
									<Text style={styles.overviewEth}>{fromWei(totalGas).toString()}</Text>
								</View>
							</View>
							<View style={styles.overviewRow}>
								<Text style={styles.overviewLabel}>{strings('transaction.total').toUpperCase()}</Text>
								<View style={styles.overviewContent}>
									<Text style={styles.overviewInfo}>
										{strings('transaction.amount').toUpperCase()} +{' '}
										{strings('transaction.gasFee').toUpperCase()}
									</Text>
									<Text style={{ ...styles.overviewFiat, ...styles.overviewAccent }}>
										{weiToFiat(total, conversionRate, currentCurrency).toUpperCase()}
									</Text>
									<Text style={styles.overviewEth}>{fromWei(total).toString()}</Text>
								</View>
							</View>
							{this.validateAmount() && (
								<View style={styles.overviewAlert}>
									<MaterialIcon name={'error'} size={20} style={styles.overviewAlertIcon} />
									<Text style={styles.overviewAlertText}>
										{strings('transaction.alert')}: {this.validateAmount()}.
									</Text>
								</View>
							)}
						</View>
					</View>
				</ActionView>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	accounts: state.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.backgroundState.CurrencyRateController.currentCurrency,
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(TransactionReview);
