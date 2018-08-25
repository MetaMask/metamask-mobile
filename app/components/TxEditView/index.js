import React, { Component } from 'react';
import AccountInput from '../AccountInput';
import AccountSelect from '../AccountSelect';
import ActionView from '../ActionView';
import EthInput from '../EthInput';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../../styles/common';
import { connect } from 'react-redux';
import { isValidAddress } from 'ethereumjs-util';

const styles = StyleSheet.create({
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
	}
});

/**
 * Component that renders an ActionView for editing transactions
 */
class TransactionEditor extends Component {
	state = {
		amount: undefined,
		from: undefined,
		gas: '0.00',
		to: undefined,
		toError: undefined
	};

	fillMax = () => {
		// TODO: Subtract gas properly using hex math
		const { accounts, selectedAddress } = this.props;
		const { balance } = accounts[this.state.from || selectedAddress];
		this.setState({ amount: String(balance) });
	};

	updateAmount = amount => {
		this.setState({
			amount,
			amountError: Boolean(amount && amount.length > 0 && isNaN(amount - parseFloat(amount)))
		});
	};

	updateData = data => {
		this.setState({ data });
	};

	updateFromAddress = from => {
		this.setState({ from });
	};

	updateToAddress = (to) => {
		this.setState({
			to,
			toError: Boolean(to && to.length > 0 && !isValidAddress(to))
		});
	};

	render() {
		const { conversionRate, currentCurrency, selectedAddress } = this.props;
		const { amount, amountError, data, from = selectedAddress, gas, to, toError } = this.state;

		return (
			<ActionView
				confirmText="Next"
				onCancelPress={() => {}}
				onConfirmPress={this.review}
			>
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
							{toError && <Text style={styles.error}>Invalid address</Text>}
						</View>
						<AccountInput onChange={this.updateToAddress} placeholder="Receipient Address" value={to} />
					</View>
					<View style={{ ...styles.formRow, ...styles.amountRow }}>
						<View style={styles.label}>
							<Text style={styles.labelText}>Amount:</Text>
							{amountError ? (
								<Text style={styles.error}>Invalid amount</Text>
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
						</View>
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
							value={data} />
					</View>
				</View>
			</ActionView>
		);
	}
}

const mapStateToProps = ({ backgroundState: { CurrencyRateController, PreferencesController, TransactionController } }) => ({
	accounts: PreferencesController.identities,
	conversionRate: CurrencyRateController.conversionRate,
	currentCurrency: CurrencyRateController.currentCurrency,
	selectedAddress: PreferencesController.selectedAddress,
	transactions: TransactionController.transactions
});

export default connect(mapStateToProps)(TransactionEditor);
