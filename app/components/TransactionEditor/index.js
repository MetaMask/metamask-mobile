import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../styles/common';
import TransactionReview from '../TransactionReview';
import TransactionEdit from '../TransactionEdit';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		flex: 1
	}
});

/**
 * Component that supports editing and reviewing a transaction
 */
export default class TransactionEditor extends Component {
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

	onCancel = () => {
		const { onCancel } = this.props;
		onCancel && onCancel();
	};

	onScanSuccess = () => {
		this.props.navigation.navigate('QRScanner', {
			onScanSuccess: this.props.onScanSuccess,
			addressOnly: true
		});
	};

	handleGasFeeSelection = (gasLimit, gasPrice) => {
		this.setState({ gas: gasLimit, gasPrice });
	};

	handleUpdateAmount = amount => {
		this.setState({ amount });
	};

	render() {
		const { amount, gas, gasPrice } = this.state;
		const { mode } = this.props;

		return (
			<View style={styles.root}>
				{mode === 'edit' && (
					<TransactionEdit
						accounts={this.props.accounts}
						navigation={this.props.navigation}
						hideData={this.props.hideData}
						onCancel={this.props.onCancel}
						onModeChange={this.props.onModeChange}
						transaction={this.props.transaction}
						handleUpdateAmount={this.handleUpdateAmount}
						handleGasFeeSelection={this.handleGasFeeSelection}
						amount={amount}
						gas={gas}
						gasPrice={gasPrice}
					/>
				)}
				{mode === 'review' && (
					<TransactionReview
						accounts={this.props.accounts}
						navigation={this.props.navigation}
						hideData={this.props.hideData}
						onCancel={this.props.onCancel}
						onConfirm={this.props.onConfirm}
						onModeChange={this.props.onModeChange}
						transaction={this.props.transaction}
						amount={amount}
						gas={gas}
						gasPrice={gasPrice}
					/>
				)}
			</View>
		);
	}
}
