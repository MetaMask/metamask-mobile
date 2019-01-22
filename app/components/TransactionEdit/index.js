import React, { Component } from 'react';
import AccountInput from '../AccountInput';
import AccountSelect from '../AccountSelect';
import ActionView from '../ActionView';
import EthInput from '../EthInput';
import PropTypes from 'prop-types';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import {
	toBN,
	isBN,
	hexToBN,
	fromWei,
	isDecimal,
	toWei,
	toTokenMinimalUnit,
	fromTokenMinimalUnit
} from '../../util/number';
import { strings } from '../../../locales/i18n';
import CustomGas from '../CustomGas';

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
		marginTop: 30
	},
	toRow: {
		right: 15,
		left: 15,
		marginTop: Platform.OS === 'android' ? 125 : 120,
		position: 'absolute',
		zIndex: 4
	},
	row: {
		marginTop: 18,
		zIndex: 3
	},
	amountRow: {
		right: 15,
		left: 15,
		marginTop: Platform.OS === 'android' ? 205 : 190,
		position: 'absolute',
		zIndex: 4
	},
	notAbsolute: {
		marginTop: Platform.OS === 'android' ? 270 : 240
	},
	label: {
		flex: 0,
		paddingRight: 18,
		width: 106
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
		padding: 16,
		flexDirection: 'column'
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
	}
});

/**
 * Component that supports editing and reviewing a transaction
 */
class TransactionEdit extends Component {
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
		 * Callback triggered when this transaction is cancelled
		 */
		onCancel: PropTypes.func,
		/**
		 * Called when a user changes modes
		 */
		onModeChange: PropTypes.func,
		/**
		 * Transaction object associated with this transaction, if sending token it includes assetSymbol
		 */
		transactionData: PropTypes.object,
		/**
		 * Callback to open the qr scanner
		 */
		onScanSuccess: PropTypes.func,
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
		 * A string that represents the value un a readable format (decimal)
		 */
		readableValue: PropTypes.string,
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
		gasError: '',
		fillMax: false
	};

	componentDidMount() {
		const { transactionData } = this.props;
		if (transactionData && transactionData.amount) {
			this.props.handleUpdateAmount(transactionData.amount);
		}
	}

	fillMax = () => {
		const { gas, gasPrice, from, asset } = this.props.transactionData;
		const { balance } = this.props.accounts[from];
		const { contractBalances } = this.props;
		const totalGas = isBN(gas) && isBN(gasPrice) ? gas.mul(gasPrice) : fromWei(0);
		const ethMaxAmount = hexToBN(balance)
			.sub(totalGas)
			.gt(fromWei(0))
			? hexToBN(balance).sub(totalGas)
			: fromWei(0);
		this.props.handleUpdateAmount(asset ? hexToBN(contractBalances[asset.address].toString(16)) : ethMaxAmount);
		const readableValue = asset
			? fromTokenMinimalUnit(hexToBN(contractBalances[asset.address].toString(16)), asset.decimals)
			: fromWei(ethMaxAmount);
		this.props.handleUpdateReadableValue(readableValue);
		this.setState({ fillMax: true });
	};

	updateFillMax = fillMax => {
		this.setState({ fillMax });
	};

	onFocusToAddress = () => {
		this.setState({ toFocused: true });
	};

	review = async () => {
		const { onModeChange } = this.props;
		await this.setState({ toFocused: true });
		!this.validate() && onModeChange && onModeChange('review');
	};

	validate = () => {
		const amountError = this.props.validateAmount(false);
		const gasError = this.props.validateGas();
		const toAddressError = this.props.validateToAddress();
		this.setState({ amountError, gasError, toAddressError });
		return amountError || gasError || toAddressError;
	};

	updateAmount = async amount => {
		const { asset } = this.props.transactionData;
		let processedAmount;
		if (asset) {
			processedAmount = isDecimal(amount) ? toTokenMinimalUnit(amount, asset.decimals) : undefined;
		} else {
			processedAmount = isDecimal(amount) ? toWei(amount) : undefined;
		}
		await this.props.handleUpdateAmount(processedAmount);
		this.props.handleUpdateReadableValue(amount);
		const amountError = this.props.validateAmount(true);
		this.setState({ amountError });
	};

	updateGas = async (gas, gasLimit) => {
		await this.props.handleGasFeeSelection(gas, gasLimit);
		const gasError = this.props.validateGas();
		this.setState({ gasError });
	};

	updateData = data => {
		this.props.handleUpdateData(data);
	};

	updateFromAddress = from => {
		this.props.handleUpdateFromAddress(from);
	};

	updateToAddress = async to => {
		await this.props.handleUpdateToAddress(to);
		const toAddressError = this.props.validateToAddress();
		this.setState({ toAddressError });
	};

	onScanSuccess = () => {
		this.props.navigation.navigate('QRScanner', {
			onScanSuccess: this.props.onScanSuccess,
			addressOnly: true
		});
	};

	render = () => {
		const {
			transactionData: { amount, gas, gasPrice, data, from, to, asset },
			showHexData
		} = this.props;
		const { amountError, gasError, toAddressError } = this.state;
		const totalGas = isBN(gas) && isBN(gasPrice) ? gas.mul(gasPrice) : toBN('0x0');
		return (
			<View style={styles.root}>
				<ActionView confirmText="Next" onCancelPress={this.props.onCancel} onConfirmPress={this.review}>
					<View style={styles.form}>
						<View style={[styles.formRow, styles.fromRow]}>
							<View style={styles.label}>
								<Text style={styles.labelText}>{strings('transaction.from')}:</Text>
							</View>
							<AccountSelect value={from} onChange={this.updateFromAddress} enabled={false} />
						</View>
						<View style={[styles.formRow, styles.row, styles.amountRow]}>
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
							<EthInput
								onChange={this.updateAmount}
								value={amount}
								asset={asset}
								handleUpdateAsset={this.props.handleUpdateAsset}
								readableValue={this.props.readableValue}
								fillMax={this.state.fillMax}
								updateFillMax={this.updateFillMax}
							/>
						</View>
						<View style={[styles.formRow, styles.toRow]}>
							<View style={styles.label}>
								<Text style={styles.labelText}>{strings('transaction.to')}:</Text>
								{toAddressError ? <Text style={styles.error}>{toAddressError}</Text> : null}
							</View>
							<AccountInput
								onChange={this.updateToAddress}
								onFocus={this.onFocusToAddress}
								placeholder={strings('transaction.recipient_address')}
								showQRScanner={this.onScanSuccess}
								value={to}
							/>
						</View>
						<View style={[styles.formRow, styles.row, styles.notAbsolute]}>
							<View style={styles.label}>
								<Text style={styles.labelText}>{strings('transaction.gas_fee')}:</Text>
								{gasError ? <Text style={styles.error}>{gasError}</Text> : null}
							</View>
							<CustomGas
								handleGasFeeSelection={this.updateGas}
								totalGas={totalGas}
								gas={gas}
								gasPrice={gasPrice}
							/>
						</View>
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
									placeholder="Optional"
									style={styles.hexData}
									value={data}
								/>
							)}
						</View>
					</View>
				</ActionView>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	contractBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	showHexData: state.settings.showHexData
});

export default connect(mapStateToProps)(TransactionEdit);
