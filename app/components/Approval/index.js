import React, { Component } from 'react';
import Button from '../Button';
import Engine from '../../core/Engine';
import getNavbarOptions from '../Navbar';
import AccountSelect from '../AccountSelect';
import AccountInput from '../AccountInput';
import EthInput from '../EthInput';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import { isValidAddress } from 'ethereumjs-util';

const styles = StyleSheet.create({
	fromRow: {
		flexDirection: 'row',
		marginTop: 15,
		zIndex: 5
	},
	toRow: {
		flexDirection: 'row',
		marginTop: 15,
		zIndex: 4
	},
	amountRow: {
		flexDirection: 'row',
		marginTop: 15,
		zIndex: 3
	},
	label: {
		flex: 0,
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
	}
});

/**
 * View that wraps the transaction approval screen
 */
class Approval extends Component {
	static navigationOptions = ({ navigation }) => getNavbarOptions('Approval', navigation);

	state = {
		amount: undefined,
		from: undefined,
		gas: undefined,
		to: undefined,
		toError: undefined
	};

	setFromAddress = (from) => {
		this.setState({ from });
	};

	setToAddress = (to) => {
		this.setState({
			to,
			toError: !isValidAddress(to)
		});
	};

	setAmount = (amount) => {
		this.setState({
			amount,
			amountError: amount && amount.length >= 0 && isNaN(amount - parseFloat(amount))
		});
	};

	render() {
		const { amount, amountError, from, to, toError } = this.state;

		return (
			<View style={{ backgroundColor: '#FFF', padding: 20 }}>
				{/* <Button onPress={this.approve}><Text>APPROVE</Text></Button>
				<Button onPress={this.reject}><Text>REJECT</Text></Button>
				<AccountSelect selectedAddress={this.state.selectedAddress} onAddressChange={selectedAddress => this.setState({ selectedAddress })}/>
				<AccountInput onChange={(textAddress) => this.setState({ textAddress })} placeholder="Receipient Address" value={this.state.textAddress} />
				<EthInput onChange={(eth) => this.setState({ eth })} value={this.state.eth} /> */}
				<View style={styles.fromRow}>
					<View style={styles.label}>
						<Text style={styles.labelText}>From:</Text>
					</View>
					<AccountSelect value={from} onChange={this.setFromAddress} />
				</View>
				<View style={styles.toRow}>
					<View style={styles.label}>
						<Text style={styles.labelText}>To:</Text>
						{toError && <Text style={styles.error}>Invalid address</Text>}
					</View>
					<AccountInput onChange={this.setToAddress} placeholder="Receipient Address" value={to} />
				</View>
				<View style={styles.amountRow}>
					<View style={styles.label}>
						<Text style={styles.labelText}>Amount:</Text>
						{amountError ? (
							<Text style={styles.error}>Invalid amount</Text>
						) : (
							<TouchableOpacity>
								<Text style={styles.max}>Max</Text>
							</TouchableOpacity>
						)}
					</View>
					<EthInput onChange={this.setAmount} value={amount} />
				</View>
				<View style={styles.amountRow}>
					<View style={styles.label}>
						<Text style={styles.labelText}>Gas Fee:</Text>
					</View>
					<EthInput readonly value={'0'} />
				</View>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	transactions: state.backgroundState.TransactionController.transactions
});

export default connect(mapStateToProps)(Approval);
