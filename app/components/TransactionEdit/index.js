import React, { Component } from 'react';
import AccountInput from '../AccountInput';
import AccountSelect from '../AccountSelect';
import ActionView from '../ActionView';
import EthInput from '../EthInput';
import PropTypes from 'prop-types';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import { toBN, isBN, hexToBN, fromWei } from '../../util/number';
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
		marginTop: 16,
		zIndex: 3
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
		 * Hids the "data" field
		 */
		hideData: PropTypes.bool,
		/**
		 * Callback triggered when this transaction is cancelled
		 */
		onCancel: PropTypes.func,
		/**
		 * Called when a user changes modes
		 */
		onModeChange: PropTypes.func,
		/**
		 * Transaction object associated with this transaction
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
		 * Callback to update to address in transaction in parent state
		 */
		handleUpdateToAddress: PropTypes.func,
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
		validateToAddress: PropTypes.func
	};

	state = {
		toFocused: false,
		amountError: '',
		addressError: '',
		toAddressError: '',
		gasError: ''
	};

	componentDidMount() {
		const { transactionData } = this.props;
		if (transactionData && transactionData.amount) {
			this.props.handleUpdateAmount(transactionData.amount);
		}
	}

	fillMax = () => {
		const { gas, gasPrice, from } = this.props.transactionData;
		const { balance } = this.props.accounts[from];
		const totalGas = isBN(gas) && isBN(gasPrice) ? gas.mul(gasPrice) : fromWei(0);
		this.props.handleUpdateAmount(
			hexToBN(balance)
				.sub(totalGas)
				.gt(fromWei(0))
				? hexToBN(balance).sub(totalGas)
				: fromWei(0)
		);
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
		const amountError = this.props.validateAmount();
		const gasError = this.props.validateGas();
		const toAddressError = this.props.validateToAddress();
		this.setState({ amountError, gasError, toAddressError });
		return amountError || gasError || toAddressError;
	};

	updateAmount = async amount => {
		await this.props.handleUpdateAmount(amount);
		const amountError = this.props.validateAmount();
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
			hideData,
			transactionData: { amount, gas, gasPrice, data, from, to }
		} = this.props;
		const { amountError, gasError, toAddressError } = this.state;
		const totalGas = isBN(gas) && isBN(gasPrice) ? gas.mul(gasPrice) : toBN('0x0');
		return (
			<View style={styles.root}>
				<ActionView confirmText="Next" onCancelPress={this.props.onCancel} onConfirmPress={this.review}>
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
						<View style={{ ...styles.formRow, ...styles.amountRow, ...styles.notAbsolute }}>
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
							<EthInput onChange={this.updateAmount} value={amount} />
						</View>
						<View style={{ ...styles.formRow, ...styles.amountRow }}>
							<View style={styles.label}>
								<Text style={styles.labelText}>{strings('transaction.gas_fee')}:</Text>
								{gasError ? <Text style={styles.error}>{gasError}</Text> : null}
							</View>
							<CustomGas handleGasFeeSelection={this.updateGas} totalGas={totalGas} gas={gas} />
						</View>
						{!hideData && (
							<View style={{ ...styles.formRow, ...styles.amountRow }}>
								<View style={styles.label}>
									<Text style={styles.labelText}>{strings('transaction.hex_data')}:</Text>
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
			</View>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts
});

export default connect(mapStateToProps)(TransactionEdit);
