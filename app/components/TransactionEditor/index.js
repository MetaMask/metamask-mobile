import React, { Component } from 'react';
import AccountInput from '../AccountInput';
import AccountSelect from '../AccountSelect';
import ActionView from '../ActionView';
import EthInput from '../EthInput';
import Identicon from '../Identicon';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../../styles/common';
import { connect } from 'react-redux';
import { isBN, hexToBN, weiToFiat, fromWei } from '../../util/number';
import { isValidAddress, toChecksumAddress } from 'ethereumjs-util';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		flex: 1
	},
	formRow: {
		flexDirection: 'row'
	},
	fromRow: {
		zIndex: 5
	},
	toRow: {
		marginTop: 16,
		zIndex: 4
	},
	amountRow: {
		marginTop: 16,
		zIndex: 3
	},
	label: {
		flex: 0,
		paddingRight: 18,
		width: 96
	},
	labelText: {
		color: colors.gray,
		fontSize: 16,
		fontWeight: '500'
	},
	max: {
		color: colors.blue,
		fontSize: 12,
		fontWeight: '500',
		paddingTop: 6
	},
	error: {
		color: colors.red,
		fontSize: 12,
		fontWeight: '500',
		lineHeight: 12,
		paddingTop: 6
	},
	form: {
		flex: 1,
		padding: 16
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
		flex: 1,
		fontSize: 16,
		fontWeight: '500',
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
		alignItems: 'center',
		borderColor: colors.subtleGray,
		borderRadius: 4,
		borderWidth: 1,
		color: colors.subtleGray,
		fontSize: 12,
		lineHeight: 22,
		textAlign: 'center',
		textTransform: 'uppercase',
		width: 74
	},
	summary: {
		backgroundColor: colors.beige,
		borderBottomWidth: 1,
		borderColor: colors.lightGray,
		padding: 16
	},
	summaryFiat: {
		color: colors.copy,
		fontSize: 44,
		paddingVertical: 4,
		textTransform: 'uppercase'
	},
	summaryEth: {
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
		color: colors.gray,
		flex: 1,
		fontSize: 12,
		fontWeight: '500',
		textTransform: 'uppercase',
		width: 60
	},
	overviewFiat: {
		color: colors.copy,
		fontSize: 24,
		fontWeight: '500',
		textAlign: 'right',
		textTransform: 'uppercase'
	},
	overviewAccent: {
		color: colors.blue
	},
	overviewEth: {
		color: colors.subtleGray,
		fontSize: 16,
		textAlign: 'right'
	},
	overviewInfo: {
		fontSize: 12,
		marginBottom: 6,
		textAlign: 'right',
		textTransform: 'uppercase'
	},
	overviewAction: {
		color: colors.blue,
		fontWeight: '500'
	},
	hexData: {
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		flex: 1,
		fontSize: 16,
		fontWeight: '500',
		minHeight: 64,
		paddingLeft: 10,
		paddingVertical: 6
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
		color: colors.blue,
		fontSize: 22,
		fontWeight: '500'
	},
	goBackIcon: {
		color: colors.blue,
		flex: 0
	}
});

/**
 * Component that supports editing and reviewing a transaction
 */
class TransactionEditor extends Component {
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
		 * Current mode this transaction editor is in
		 */
		mode: PropTypes.oneOf(['edit', 'review']),
		/**
		 * Callback triggered when this transaction is cancelled
		 */
		onCancel: PropTypes.func,
		/**
		 * Callback triggered when this transaction is cancelled
		 */
		onConfirm: PropTypes.func,
		/**
		 * Called when a user changes modes
		 */
		onModeChange: PropTypes.func,
		/**
		 * Currently-active account address in the current keychain
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Transaction object associated with this transaction
		 */
		transaction: PropTypes.obj
	};

	state = {
		amount: this.props.transaction.value,
		data: this.props.transaction.data,
		from: this.props.transaction.from,
		gas: this.props.transaction.gas,
		gasPrice: this.props.transaction.gasPrice,
		to: this.props.transaction.to,
		toFocused: false
	};

	edit = () => {
		const { onModeChange } = this.props;
		onModeChange && onModeChange('edit');
	};

	fillMax = () => {
		const { gas, gasPrice, from } = this.state;
		const { balance } = this.props.accounts[from];
		this.setState({ amount: hexToBN(balance).sub(gas.mul(gasPrice)) });
	};

	focusToAddress = () => {
		this.setState({ toFocused: true });
	};

	onCancel = () => {
		const { onCancel } = this.props;
		onCancel && onCancel();
	};

	onConfirm = () => {
		const { onConfirm, transaction } = this.props;
		const { amount, data, from, gas, gasPrice, to } = this.state;
		!this.validate() &&
			onConfirm &&
			onConfirm({
				...transaction,
				...{ value: amount, data, from, gas, gasPrice, to }
			});
	};

	review = () => {
		const { onModeChange } = this.props;
		!this.validate() && onModeChange && onModeChange('review');
	};

	updateAmount = async amount => {
		this.setState({ amount });
	};

	updateData = data => {
		this.setState({ data });
	};

	updateFromAddress = from => {
		this.setState({ from });
	};

	updateToAddress = to => {
		this.setState({ to });
	};

	validate() {
		if (this.validateAmount() || this.validateGas() || this.validateToAddress()) {
			return true;
		}
	}

	validateAmount() {
		let error;
		const { amount, gas, gasPrice, from } = this.state;
		const { accounts } = this.props;
		if (!accounts || !from || !accounts[toChecksumAddress(from)]) {
			return;
		}
		const { balance } = this.props.accounts[toChecksumAddress(from)];
		amount && !isBN(amount) && (error = 'Invalid amount');
		amount && isBN(amount) && hexToBN(balance).lt(amount.add(gas.mul(gasPrice))) && (error = 'Insufficient funds');
		return error;
	}

	validateGas() {
		let error;
		const { gas, gasPrice } = this.state;
		gas && !isBN(gas) && (error = 'Invalid gas amount');
		gasPrice && !isBN(gasPrice) && (error = 'Invalid gas price');
		return error;
	}

	validateToAddress() {
		let error;
		const { to } = this.state;
		!to && this.state.toFocused && (error = 'Required');
		to && !isValidAddress(to) && (error = 'Invalid address');
		return error;
	}

	render() {
		const { amount, data, from = this.props.selectedAddress, gas, gasPrice, to } = this.state;
		const { conversionRate, currentCurrency, mode } = this.props;
		const totalGas = gas.mul(gasPrice);
		const total = isBN(amount) ? amount.add(totalGas) : totalGas;

		return (
			<View style={styles.root}>
				{mode === 'edit' && (
					<ActionView confirmText="Next" onCancelPress={this.onCancel} onConfirmPress={this.review}>
						<View style={styles.form}>
							<View style={{ ...styles.formRow, ...styles.fromRow }}>
								<View style={styles.label}>
									<Text style={styles.labelText}>From:</Text>
								</View>
								<AccountSelect value={from} onChange={this.updateFromAddress} />
							</View>
							<View style={{ ...styles.formRow, ...styles.toRow }}>
								<View style={styles.label}>
									<Text style={styles.labelText}>To:</Text>
									{this.validateToAddress() && (
										<Text style={styles.error}>{this.validateToAddress()}</Text>
									)}
								</View>
								<AccountInput
									onChange={this.updateToAddress}
									onFocus={this.focusToAddress}
									placeholder="Receipient Address"
									value={to}
								/>
							</View>
							<View style={{ ...styles.formRow, ...styles.amountRow }}>
								<View style={styles.label}>
									<Text style={styles.labelText}>Amount:</Text>
									{this.validateAmount() ? (
										<Text style={styles.error}>{this.validateAmount()}</Text>
									) : (
										<TouchableOpacity onPress={this.fillMax}>
											<Text style={styles.max}>Max</Text>
										</TouchableOpacity>
									)}
								</View>
								<EthInput onChange={this.updateAmount} value={amount} />
							</View>
							<View style={{ ...styles.formRow, ...styles.amountRow }}>
								<View style={styles.label}>
									<Text style={styles.labelText}>Gas Fee:</Text>
									{this.validateGas() && <Text style={styles.error}>{this.validateGas()}</Text>}
								</View>
								<EthInput readonly value={totalGas} />
							</View>
							<View style={{ ...styles.formRow, ...styles.amountRow }}>
								<View style={styles.label}>
									<Text style={styles.labelText}>Hex Data:</Text>
								</View>
								<TextInput
									multiline
									onChangeText={this.updateData}
									placeholder="Optional"
									style={styles.hexData}
									value={data}
								/>
							</View>
						</View>
					</ActionView>
				)}
				{mode === 'review' && (
					<ActionView
						confirmButtonMode="filled"
						onCancelPress={this.onCancel}
						onConfirmPress={this.onConfirm}
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
								<Text style={styles.confirmBadge}>Confirm</Text>
								<Text style={styles.summaryFiat}>
									{weiToFiat(amount, conversionRate, currentCurrency)}
								</Text>
								<Text style={styles.summaryEth}>{fromWei(amount).toString()}</Text>
								<TouchableOpacity style={styles.goBack} onPress={this.edit}>
									<MaterialIcon name={'keyboard-arrow-left'} size={22} style={styles.goBackIcon} />
									<Text style={styles.goBackText}>Edit</Text>
								</TouchableOpacity>
							</View>
							<View style={styles.overview}>
								<View style={{ ...styles.overviewRow, ...styles.topOverviewRow }}>
									<Text style={styles.overviewLabel}>Gas Fee</Text>
									<View style={styles.overviewContent}>
										<TouchableOpacity>
											<Text style={{ ...styles.overviewInfo, ...styles.overviewAction }}>
												Edit
											</Text>
										</TouchableOpacity>
										<Text style={styles.overviewFiat}>
											{weiToFiat(totalGas, conversionRate, currentCurrency)}
										</Text>
										{/* TODO: Use real gas */}
										<Text style={styles.overviewEth}>{fromWei(gas).toString()}</Text>
									</View>
								</View>
								<View style={styles.overviewRow}>
									<Text style={styles.overviewLabel}>Total</Text>
									<View style={styles.overviewContent}>
										<Text style={styles.overviewInfo}>Amount + Gas Fee</Text>
										<Text style={{ ...styles.overviewFiat, ...styles.overviewAccent }}>
											{weiToFiat(total, conversionRate, currentCurrency)}
										</Text>
										<Text style={styles.overviewEth}>{fromWei(total).toString()}</Text>
									</View>
								</View>
								{this.validateAmount() && (
									<View style={styles.overviewAlert}>
										<MaterialIcon name={'error'} size={20} style={styles.overviewAlertIcon} />
										<Text style={styles.overviewAlertText}>ALERT: {this.validateAmount()}.</Text>
									</View>
								)}
							</View>
						</View>
					</ActionView>
				)}
			</View>
		);
	}
}

const mapStateToProps = ({
	backgroundState: { AccountTrackerController, CurrencyRateController, PreferencesController }
}) => ({
	accounts: AccountTrackerController.accounts,
	conversionRate: CurrencyRateController.conversionRate,
	currentCurrency: CurrencyRateController.currentCurrency,
	selectedAddress: PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(TransactionEditor);
