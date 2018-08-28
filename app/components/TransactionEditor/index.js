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
import { isValidAddress } from 'ethereumjs-util';

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
		 * Map of identites associated with the current keychain
		 */
		identities: PropTypes.object,
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
		transaction: PropTypes.obj,
		/**
		 * ID corresponding to a transaction meta object in TransactionController state
		 */
		transactionID: PropTypes.string
	};

	state = {
		amount: this.props.transaction.value,
		amountError: undefined,
		data: this.props.transaction.data,
		from: this.props.transaction.from,
		gas: this.props.transaction.gas, // TODO: Use real gas, make this default undefined
		gasError: undefined,
		to: this.props.transaction.to,
		toError: undefined,
		toFocused: false
	};

	edit = () => {
		const { onModeChange } = this.props;
		onModeChange && onModeChange('edit');
	};

	fillMax = () => {
		// TODO: Subtract gas properly (probably using hex math)
		const { gas, from } = this.state;
		const { balance } = this.props.identities[from];
		this.setState({ amount: hexToBN(balance).sub(gas) });
	};

	focusToAddress = () => {
		this.setState({ toFocused: true });
	};

	onCancel = () => {
		const { onCancel, transactionID } = this.props;
		onCancel && onCancel(transactionID);
	};

	onConfirm = () => {
		const { onConfirm, transaction, transactionID } = this.props;
		const { amount, data, from, gas, to } = this.state;
		onConfirm && onConfirm(transactionID, {
			...transaction,
			...{ value: amount, data, from, gas, to }
		});
	};

	review = () => {
		const { amountError, to, toError, gasError } = this.state;
		const { onModeChange } = this.props;
		if (amountError || toError || gasError || !to) {
			!to && this.setState({ toError: 'Required' });
			return;
		}
		onModeChange && onModeChange('review');
	};

	updateAmount = async amount => {
		// TODO: Subtract gas properly (probably using hex math);
		const { gas, from } = this.state;
		const { balance } = this.props.identities[from];
		let amountError;
		amount && !isBN(amount) && (amountError = 'Invalid amount');
		amount && isBN(amount) && hexToBN(balance).lt(amount.add(gas)) && (amountError = 'Insufficient funds');
		await this.setState({ amount, amountError });
	};

	updateData = async data => {
		await this.setState({ data });
	};

	updateFromAddress = async from => {
		await this.setState({ from });
	};

	updateToAddress = async to => {
		let toError;
		this.state.toFocused && !to && (toError = 'Required');
		to && !isValidAddress(to) && (toError = 'Invalid address');
		this.setState({ to, toError });
	};

	render() {
		// TODO: Use correct gas (probably converting from hex)
		const {
			amount,
			amountError,
			data,
			from = this.props.selectedAddress,
			gas,
			gasError,
			to,
			toError
		} = this.state;
		const { conversionRate, currentCurrency, mode } = this.props;
		const total = isBN(amount) ? amount.add(gas) : gas;

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
									{toError && <Text style={styles.error}>{toError}</Text>}
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
									{amountError ? (
										<Text style={styles.error}>{amountError}</Text>
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
									{gasError && <Text style={styles.error}>{gasError}</Text>}
								</View>
								{/* TODO: Use real gas */}
								<EthInput readonly value={gas} />
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
											{/* TODO: Use real gas */}
											{weiToFiat(gas, conversionRate, currentCurrency)}
										</Text>
										{/* TODO: Use real gas */}
										<Text style={styles.overviewEth}>{fromWei(gas).toString()}</Text>
									</View>
								</View>
								<View style={styles.overviewRow}>
									<Text style={styles.overviewLabel}>Total</Text>
									<View style={styles.overviewContent}>
										<Text style={styles.overviewInfo}>Amount + Gas Fee</Text>
										<Text style={styles.overviewFiat}>
											{/* TODO: Use real gas */}
											{weiToFiat(total, conversionRate, currentCurrency)}
										</Text>
										<Text style={styles.overviewEth}>{fromWei(total).toString()}</Text>
									</View>
								</View>
							</View>
						</View>
					</ActionView>
				)}
			</View>
		);
	}
}

const mapStateToProps = ({ backgroundState: { CurrencyRateController, PreferencesController } }) => ({
	// TODO: Update this to use balances
	identities: PreferencesController.identities,
	conversionRate: CurrencyRateController.conversionRate,
	currentCurrency: CurrencyRateController.currentCurrency,
	selectedAddress: PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(TransactionEditor);
