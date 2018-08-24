import React, { Component } from 'react';
import AccountInput from '../AccountInput';
import AccountSelect from '../AccountSelect';
import Button from '../Button';
import EthInput from '../EthInput';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../styles/common';
import { connect } from 'react-redux';
import { isValidAddress } from 'ethereumjs-util';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		flex: 1
	},
	fromRow: {
		flexDirection: 'row',
		zIndex: 5
	},
	toRow: {
		flexDirection: 'row',
		marginTop: 16,
		zIndex: 4
	},
	amountRow: {
		flexDirection: 'row',
		marginTop: 16,
		zIndex: 3
	},
	label: {
		flex: 0,
		paddingRight: 18,
		width: 88
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
	actionContainer: {
		borderTopColor: colors.lightGray,
		borderTopWidth: 1,
		flex: 0,
		flexDirection: 'row',
		padding: 16
	},
	button: {
		borderRadius: 4,
		borderWidth: 2,
		height: 'auto',
		paddingVertical: 16
	},
	buttonText: {
		fontSize: 15,
		fontWeight: '500',
		textTransform: 'uppercase'
	},
	cancel: {
		backgroundColor: colors.white,
		borderColor: colors.accentGray,
		marginRight: 8
	},
	cancelText: {
		color: colors.gray
	},
	next: {
		backgroundColor: colors.white,
		borderColor: colors.blue,
		marginLeft: 8
	},
	nextText: {
		color: colors.blue
	},
	form: {
		padding: 16,
		flex: 1
	},
	editView: {
		flex: 1
	}
});

/**
 * View that wraps the transaction approval screen
 */
class TransactionEditor extends Component {
	state = {
		amount: undefined,
		from: undefined,
		gas: undefined,
		to: undefined,
		toError: undefined
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

	updateAmount = amount => {
		this.setState({
			amount,
			amountError: Boolean(amount && amount.length > 0 && isNaN(amount - parseFloat(amount)))
		});
	};

	fillMax = () => {
		// TODO: Subtract gas properly using hex math
		const { accounts, selectedAddress } = this.props;
		const { balance } = accounts[this.state.from || selectedAddress];
		this.setState({ amount: String(balance) });
	};

	render() {
		const { amount, amountError, from = this.props.selectedAddress, to, toError } = this.state;

		return (
			<View style={styles.root}>
				<View style={styles.editView}>
					<View style={styles.form}>
						<View style={styles.fromRow}>
							<View style={styles.label}>
								<Text style={styles.labelText}>From:</Text>
							</View>
							<AccountSelect value={from} onChange={this.updateFromAddress} />
						</View>
						<View style={styles.toRow}>
							<View style={styles.label}>
								<Text style={styles.labelText}>To:</Text>
								{toError && <Text style={styles.error}>Invalid address</Text>}
							</View>
							<AccountInput onChange={this.updateToAddress} placeholder="Receipient Address" value={to} />
						</View>
						<View style={styles.amountRow}>
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
						<View style={styles.amountRow}>
							<View style={styles.label}>
								<Text style={styles.labelText}>Gas Fee:</Text>
							</View>
							<EthInput readonly value={'0.00'} />
						</View>
					</View>
					<View style={styles.actionContainer}>
						<Button style={{ ...styles.button, ...styles.cancel }}>
							<Text style={{ ...styles.buttonText, ...styles.cancelText}}>Cancel</Text>
						</Button>
						<Button style={{ ...styles.button, ...styles.next}}>
							<Text style={{ ...styles.buttonText, ...styles.nextText}}>Next</Text>
						</Button>
					</View>
				</View>
				<View>

				</View>
			</View>
		);
	}
}

const mapStateToProps = ({ backgroundState: { PreferencesController, TransactionController } }) => ({
	accounts: PreferencesController.identities,
	selectedAddress: PreferencesController.selectedAddress,
	transactions: TransactionController.transactions
});

export default connect(mapStateToProps)(TransactionEditor);
