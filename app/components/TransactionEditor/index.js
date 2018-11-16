import React, { Component } from 'react';
import AccountInput from '../AccountInput';
import AccountSelect from '../AccountSelect';
import ActionView from '../ActionView';
import EthInput from '../EthInput';
import Identicon from '../Identicon';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import { toBN, isBN, hexToBN, weiToFiat, fromWei } from '../../util/number';
import { isValidAddress, toChecksumAddress } from 'ethereumjs-util';
import { strings } from '../../../locales/i18n';
import { withNavigation } from 'react-navigation';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		flex: 1
	},
	formRow: {
		flexDirection: 'row'
	},
	fromRow: {
		marginRight: 0,
		position: 'absolute',
		zIndex: 5,
		right: 15,
		left: 15,
		marginTop: Platform.OS === 'android' ? 0 : 30
	},
	toRow: {
		right: 15,
		left: 15,
		marginTop: Platform.OS === 'android' ? 100 : 120,
		position: 'absolute',
		zIndex: 4
	},
	notAbsolute: {
		marginTop: 170
	},
	amountRow: {
		zIndex: 3,
		marginTop: 20
	},
	label: {
		flex: 0,
		paddingRight: 18,
		width: 96
	},
	labelText: {
		...fontStyles.bold,
		color: colors.gray,
		fontSize: 16
	},
	max: {
		...fontStyles.bold,
		color: colors.primary,
		fontSize: 12,
		paddingTop: 6
	},
	error: {
		...fontStyles.bold,
		color: colors.red,
		fontSize: 12,
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
	hexData: {
		...fontStyles.bold,
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		flex: 1,
		fontSize: 16,
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
 * Component that supports editing and reviewing a transaction
 */
class TransactionEditor extends Component {
	static propTypes = {
		/**
		 * List of accounts from the AccountTrackerController
		 */
		accounts: PropTypes.object,
		/**
		 * react-navigation object used for switching between screens
		 */
		navigation: PropTypes.object,
		/**
		 * ETH to currnt currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Hids the "data" field
		 */
		hideData: PropTypes.bool,
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
		transaction: PropTypes.object,
		/**
		 * Callback to open the qr scanner
		 */
		onScanSuccess: PropTypes.func
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
		this.setState({
			amount: !isBN(gas) || !isBN(gasPrice) ? hexToBN(balance) : hexToBN(balance).sub(gas.mul(gasPrice))
		});
	};

	onFocusToAddress = () => {
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

	review = async () => {
		const { onModeChange } = this.props;
		await this.setState({ toFocused: true });
		!this.validate() && onModeChange && onModeChange('review');
	};

	updateAmount = amount => {
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

	validateGas() {
		let error;
		const { gas, gasPrice } = this.state;
		gas && !isBN(gas) && (error = strings('transaction.invalidGas'));
		gasPrice && !isBN(gasPrice) && (error = strings('transaction.invalidGasPrice'));
		return error;
	}

	validateToAddress() {
		let error;
		const { to } = this.state;
		!to && this.state.toFocused && (error = strings('transaction.required'));
		to && !isValidAddress(to) && (error = strings('transaction.invalidAddress'));
		return error;
	}

	onScanSuccess = () => {
		this.props.navigation.navigate('QRScanner', {
			onScanSuccess: this.props.onScanSuccess,
			addressOnly: true
		});
	};

	render() {
		const { amount, data, from = this.props.selectedAddress, gas, gasPrice, to } = this.state;
		const { conversionRate, currentCurrency, hideData, mode } = this.props;
		const totalGas = isBN(gas) && isBN(gasPrice) ? gas.mul(gasPrice) : toBN('0x0');
		const total = isBN(amount) ? amount.add(totalGas) : totalGas;

		return (
			<View style={styles.root}>
				{mode === 'edit' && (
					<ActionView confirmText="Next" onCancelPress={this.onCancel} onConfirmPress={this.review}>
						<View style={styles.form}>
							<View style={{ ...styles.formRow, ...styles.fromRow }}>
								<View style={styles.label}>
									<Text style={styles.labelText}>{strings('transaction.from')}:</Text>
								</View>
								<AccountSelect value={from} onChange={this.updateFromAddress} />
							</View>
							<View style={{ ...styles.formRow, ...styles.toRow }}>
								<View style={styles.label}>
									<Text style={styles.labelText}>{strings('transaction.to')}:</Text>
									{this.validateToAddress() && (
										<Text style={styles.error}>{this.validateToAddress()}</Text>
									)}
								</View>
								<AccountInput
									onChange={this.updateToAddress}
									onFocus={this.onFocusToAddress}
									placeholder={strings('transaction.recipientAddress')}
									onScanSuccess={this.onScanSuccess}
									value={to}
								/>
							</View>
							<View style={{ ...styles.formRow, ...styles.amountRow, ...styles.notAbsolute }}>
								<View style={styles.label}>
									<Text style={styles.labelText}>{strings('transaction.amount')}:</Text>
									{this.validateAmount() ? (
										<Text style={styles.error}>{this.validateAmount()}</Text>
									) : (
										<TouchableOpacity onPress={this.fillMax}>
											<Text style={styles.max}>{strings('transaction.max')}</Text>
										</TouchableOpacity>
									)}
								</View>
								<EthInput onChange={this.updateAmount} value={amount} />
							</View>
							<View style={{ ...styles.formRow, ...styles.amountRow }}>
								<View style={styles.label}>
									<Text style={styles.labelText}>{strings('transaction.gasFee')}:</Text>
									{this.validateGas() && <Text style={styles.error}>{this.validateGas()}</Text>}
								</View>
								<EthInput readonly value={totalGas} />
							</View>
							{!hideData && (
								<View style={{ ...styles.formRow, ...styles.amountRow }}>
									<View style={styles.label}>
										<Text style={styles.labelText}>{strings('transaction.hexData')}:</Text>
									</View>
									<TextInput
										multiline
										onChangeText={this.updateData}
										placeholder="Optional"
										style={styles.hexData}
										value={data}
									/>
								</View>
							)}
						</View>
					</ActionView>
				)}
				{mode === 'review' && (
					<ActionView
						confirmButtonMode="confirm"
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
									<Text style={styles.overviewLabel}>
										{strings('transaction.gasFee').toUpperCase()}
									</Text>
									<View style={styles.overviewContent}>
										<TouchableOpacity>
											<Text style={{ ...styles.overviewInfo, ...styles.overviewAction }}>
												{strings('transaction.edit').toUpperCase()}
											</Text>
										</TouchableOpacity>
										<Text style={styles.overviewFiat}>
											{weiToFiat(totalGas, conversionRate, currentCurrency).toUpperCase()}
										</Text>
										{/* TODO: Use real gas */}
										<Text style={styles.overviewEth}>{fromWei(gas).toString()}</Text>
									</View>
								</View>
								<View style={styles.overviewRow}>
									<Text style={styles.overviewLabel}>
										{strings('transaction.total').toUpperCase()}
									</Text>
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

export default withNavigation(connect(mapStateToProps)(TransactionEditor));
