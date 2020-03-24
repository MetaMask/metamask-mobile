import React, { PureComponent } from 'react';
import AccountInput from '../AccountInput';
import AccountSelect from '../AccountSelect';
import ActionView from '../ActionView';
import EthInput from '../EthInput';
import PropTypes from 'prop-types';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import { toBN, isBN, hexToBN, fromWei, fromTokenMinimalUnit, toTokenMinimalUnit } from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import CustomGas from '../CustomGas';
import { addHexPrefix } from 'ethereumjs-util';
import { getTransactionOptionsTitle } from '../../UI/Navbar';
import PaymentChannelsClient from '../../../core/PaymentChannelsClient';
import Device from '../../../util/Device';

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
		right: 24,
		left: 24,
		marginTop: 30
	},
	toRow: {
		right: 24,
		left: 24,
		marginTop: Device.isAndroid() ? 125 : 120,
		position: 'absolute',
		zIndex: 4
	},
	row: {
		marginTop: 18,
		zIndex: 3
	},
	amountRow: {
		right: 24,
		left: 24,
		marginTop: Device.isAndroid() ? 200 : 190,
		position: 'absolute',
		zIndex: 4
	},
	notAbsolute: {
		marginTop: Device.isAndroid() ? 270 : 240
	},
	label: {
		flex: 0,
		paddingRight: 18,
		width: 106
	},
	labelText: {
		...fontStyles.bold,
		color: colors.grey400,
		fontSize: 16
	},
	max: {
		...fontStyles.bold,
		color: colors.blue,
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
	warning: {
		...fontStyles.bold,
		color: colors.orange300,
		fontSize: 12,
		lineHeight: 12,
		paddingTop: 6
	},
	form: {
		flex: 1,
		paddingVertical: 16,
		paddingHorizontal: 24,
		flexDirection: 'column'
	},
	androidForm: {
		paddingBottom: 100,
		minHeight: 500
	},
	hexData: {
		...fontStyles.bold,
		backgroundColor: colors.white,
		borderColor: colors.grey100,
		borderRadius: 4,
		borderWidth: 1,
		flex: 1,
		fontSize: 16,
		minHeight: 64,
		paddingLeft: 10,
		paddingVertical: 6
	}
});

/**
 * PureComponent that supports editing and reviewing a transaction
 */
class TransactionEdit extends PureComponent {
	static navigationOptions = ({ navigation }) => getTransactionOptionsTitle('send.title', 'Cancel', navigation);

	static propTypes = {
		/**
		 * List of accounts from the AccountTrackerController
		 */
		accounts: PropTypes.object,
		/**
		 * Callback to warn if transaction to is a known contract address
		 */
		checkForAssetAddress: PropTypes.func,
		/**
		 * react-navigation object used for switching between screens
		 */
		navigation: PropTypes.object,
		/**
		 * Callback triggered when this transaction is cancelled
		 */
		onCancel: PropTypes.func,
		/**
		 * Called when a user changes modes
		 */
		onModeChange: PropTypes.func,
		/**
		 * Transaction object associated with this transaction,
		 */
		transaction: PropTypes.object.isRequired,
		/**
		 * Callback to update amount in parent state
		 */
		handleUpdateAmount: PropTypes.func,
		/**
		 * Callback to update gas and gasPrice in transaction in parent state
		 */
		handleGasFeeSelection: PropTypes.func,
		/**
		 * Callback to update data in transaction in parent state
		 */
		handleUpdateData: PropTypes.func,
		/**
		 * Callback to update from address in transaction in parent state
		 */
		handleUpdateFromAddress: PropTypes.func,
		/**
		 * Callback to update readable value in transaction in parent state
		 */
		handleUpdateReadableValue: PropTypes.func,
		/**
		 * Callback to update to address in transaction in parent state
		 */
		handleUpdateToAddress: PropTypes.func,
		/**
		 * Callback to update selected asset in transaction in parent state
		 */
		handleUpdateAsset: PropTypes.func,
		/**
		 * Callback to validate amount in transaction in parent state
		 */
		validateAmount: PropTypes.func,
		/**
		 * Callback to validate gas in transaction in parent state
		 */
		validateGas: PropTypes.func,
		/**
		 * Callback to validate to address in transaction in parent state
		 */
		validateToAddress: PropTypes.func,
		/**
		 * Object containing accounts balances
		 */
		contractBalances: PropTypes.object,
		/**
		 * Indicates whether hex data should be shown in transaction editor
		 */
		showHexData: PropTypes.bool
	};

	state = {
		toFocused: false,
		amountError: '',
		addressError: '',
		toAddressError: '',
		toAddressWarning: '',
		gasError: '',
		fillMax: false,
		ensRecipient: undefined,
		data: undefined,
		accountSelectIsOpen: false,
		ethInputIsOpen: false
	};

	openAccountSelect = isOpen => {
		this.setState({ accountSelectIsOpen: isOpen, ethInputIsOpen: false });
	};

	openEthInputIsOpen = isOpen => {
		this.setState({ ethInputIsOpen: isOpen, accountSelectIsOpen: false });
	};

	closeDropdowns = () => {
		this.setState({ accountSelectIsOpen: false, ethInputIsOpen: false });
	};

	componentDidMount = () => {
		const { transaction } = this.props;
		if (transaction && transaction.value) {
			this.props.handleUpdateAmount(transaction.value, true);
		}
		if (transaction && transaction.assetType === 'ETH') {
			this.props.handleUpdateReadableValue(fromWei(transaction.value));
		}
		if (transaction && transaction.data) {
			this.setState({ data: transaction.data });
		}
	};

	componentDidUpdate = prevProps => {
		if (this.props.transaction.data !== prevProps.transaction.data) {
			this.updateData(this.props.transaction.data);
		}
	};

	fillMax = () => {
		const { gas, gasPrice, from, selectedAsset, assetType, paymentChannelTransaction } = this.props.transaction;
		const { balance } = this.props.accounts[from];
		const { contractBalances } = this.props;
		let value, readableValue;
		if (assetType === 'ETH') {
			const totalGas = isBN(gas) && isBN(gasPrice) ? gas.mul(gasPrice) : fromWei(0);
			value = hexToBN(balance)
				.sub(totalGas)
				.gt(fromWei(0))
				? hexToBN(balance).sub(totalGas)
				: fromWei(0);
			readableValue = fromWei(value);
		} else if (paymentChannelTransaction) {
			const state = PaymentChannelsClient.getState();
			value = toTokenMinimalUnit(state.balance, selectedAsset.decimals);
			readableValue = state.balance;
		} else if (assetType === 'ERC20') {
			value = hexToBN(contractBalances[selectedAsset.address].toString(16));
			readableValue = fromTokenMinimalUnit(value, selectedAsset.decimals);
		}
		this.props.handleUpdateAmount(value);
		this.props.handleUpdateReadableValue(readableValue);
		this.setState({ fillMax: true });
	};

	updateFillMax = fillMax => {
		this.setState({ fillMax });
	};

	updateToAddressError = error => {
		this.setState({ toAddressError: error });
	};

	onFocusToAddress = () => {
		this.setState({ toFocused: true });
	};

	review = async () => {
		const { onModeChange } = this.props;
		const { data } = this.state;
		await this.setState({ toFocused: true });
		const validated = !(await this.validate());
		if (validated) {
			if (data && data.substr(0, 2) !== '0x') {
				this.updateData(addHexPrefix(data));
			}
			onModeChange && onModeChange('review');
		}
	};

	validate = async () => {
		const amountError = await this.props.validateAmount(false);
		const gasError = this.props.validateGas();
		const toAddressError = this.props.validateToAddress();
		this.setState({ amountError, gasError, toAddressError });
		return amountError || gasError || toAddressError;
	};

	updateAmount = async (amount, renderValue) => {
		await this.props.handleUpdateAmount(amount);
		this.props.handleUpdateReadableValue(renderValue);
		const amountError = await this.props.validateAmount(true);
		this.setState({ amountError });
	};

	updateGas = async (gas, gasLimit) => {
		await this.props.handleGasFeeSelection(gas, gasLimit);
		const gasError = this.props.validateGas();
		this.setState({ gasError });
	};

	updateData = data => {
		this.setState({ data });
		this.props.handleUpdateData(data);
	};

	updateFromAddress = from => {
		this.props.handleUpdateFromAddress(from);
	};

	updateToAddress = async to => {
		await this.props.handleUpdateToAddress(to);
		this.setState({ toAddressError: undefined });
	};

	updateAndValidateToAddress = async (to, ensRecipient) => {
		await this.props.handleUpdateToAddress(to, ensRecipient);
		let { toAddressError, toAddressWarning } = this.state;
		toAddressError = toAddressError || this.props.validateToAddress();
		toAddressWarning = toAddressWarning || this.props.checkForAssetAddress();
		this.setState({ toAddressError, toAddressWarning, ensRecipient });
	};

	renderAmountLabel = () => {
		const { amountError } = this.state;
		const { assetType } = this.props.transaction;
		if (assetType !== 'ERC721') {
			return (
				<View style={styles.label}>
					<Text style={styles.labelText}>{strings('transaction.amount')}:</Text>
					{amountError ? (
						<Text style={styles.error}>{amountError}</Text>
					) : (
						<TouchableOpacity onPress={this.fillMax}>
							<Text style={styles.max}>{strings('transaction.max')}</Text>
						</TouchableOpacity>
					)}
				</View>
			);
		}
		return (
			<View style={styles.label}>
				<Text style={styles.labelText}>Collectible:</Text>
				{amountError ? <Text style={styles.error}>{amountError}</Text> : undefined}
			</View>
		);
	};

	render() {
		const {
			navigation,
			transaction: {
				value,
				gas,
				gasPrice,
				from,
				to,
				selectedAsset,
				readableValue,
				ensRecipient,
				paymentChannelTransaction
			},
			showHexData
		} = this.props;
		const { gasError, toAddressError, toAddressWarning, data, accountSelectIsOpen, ethInputIsOpen } = this.state;
		const totalGas = isBN(gas) && isBN(gasPrice) ? gas.mul(gasPrice) : toBN('0x0');
		return (
			<View style={styles.root}>
				<ActionView
					confirmText={
						paymentChannelTransaction ? strings('transaction.confirm') : strings('transaction.next')
					}
					confirmButtonMode={paymentChannelTransaction ? 'confirm' : 'normal'}
					onCancelPress={this.props.onCancel}
					showCancelButton={!paymentChannelTransaction}
					onConfirmPress={this.review}
					onTouchablePress={this.closeDropdowns}
					keyboardShouldPersistTaps={'handled'}
				>
					<View style={[styles.form, Device.isAndroid() ? styles.androidForm : {}]}>
						<View style={[styles.formRow, styles.fromRow]}>
							<View style={styles.label}>
								<Text style={styles.labelText}>{strings('transaction.from')}:</Text>
							</View>
							<AccountSelect value={from} onChange={this.updateFromAddress} enabled={false} />
						</View>
						<View style={[styles.formRow, styles.row, styles.amountRow]}>
							{this.renderAmountLabel()}
							<EthInput
								onChange={this.updateAmount}
								value={value}
								asset={selectedAsset}
								handleUpdateAsset={this.props.handleUpdateAsset}
								readableValue={readableValue}
								fillMax={this.state.fillMax}
								updateFillMax={this.updateFillMax}
								openEthInput={this.openEthInputIsOpen}
								isOpen={ethInputIsOpen}
							/>
						</View>
						<View style={[styles.formRow, styles.toRow]}>
							<View style={styles.label}>
								<Text style={styles.labelText}>{strings('transaction.to')}:</Text>
								{toAddressError ? <Text style={styles.error}>{toAddressError}</Text> : null}
								{!toAddressError && toAddressWarning ? (
									<Text style={styles.warning}>{toAddressWarning}</Text>
								) : null}
							</View>
							<AccountInput
								onChange={this.updateToAddress}
								onBlur={this.updateAndValidateToAddress}
								onFocus={this.onFocusToAddress}
								placeholder={strings('transaction.recipient_address')}
								showQRScanner={this.onScan}
								closeDropdowns={this.closeDropdowns}
								address={to}
								updateToAddressError={this.updateToAddressError}
								ensRecipient={ensRecipient}
								navigation={navigation}
								openAccountSelect={this.openAccountSelect}
								isOpen={accountSelectIsOpen}
							/>
						</View>
						{!paymentChannelTransaction && (
							<View style={[styles.formRow, styles.row, styles.notAbsolute]}>
								<View>
									<Text style={styles.labelText}>{strings('transaction.gas_fee')}:</Text>
									{gasError ? <Text style={styles.error}>{gasError}</Text> : null}
								</View>
							</View>
						)}
						{!paymentChannelTransaction && (
							<View style={[styles.formRow, styles.row]}>
								<CustomGas
									handleGasFeeSelection={this.updateGas}
									totalGas={totalGas}
									gas={gas}
									gasPrice={gasPrice}
									onPress={this.closeDropdowns}
								/>
							</View>
						)}
						{!paymentChannelTransaction && (
							<View style={[styles.formRow, styles.row]}>
								{showHexData && (
									<View style={styles.label}>
										<Text style={styles.labelText}>{strings('transaction.hex_data')}:</Text>
									</View>
								)}
								{showHexData && (
									<TextInput
										multiline
										onChangeText={this.updateData}
										placeholder={strings('transaction.optional')}
										placeholderTextColor={colors.grey100}
										style={styles.hexData}
										value={data}
									/>
								)}
							</View>
						)}
					</View>
				</ActionView>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	contractBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	showHexData: state.settings.showHexData,
	transaction: state.transaction
});

export default connect(mapStateToProps)(TransactionEdit);
