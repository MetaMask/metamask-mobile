import React, { Component } from 'react';
import Engine from '../../core/Engine';
import PropTypes from 'prop-types';
import TransactionEditor from '../TransactionEditor';
import { Alert, Platform, StyleSheet, TextInput, View } from 'react-native';
import { colors, baseStyles } from '../../styles/common';
import { connect } from 'react-redux';
import { BN } from 'ethereumjs-util';
import { BNToHex, hexToBN } from '../../util/number';

const styles = StyleSheet.create({});

/**
 * Component that manages transaction approval from the dapp browser
 */
class Approval extends Component {
	static propTypes = {
		/**
		 * react-navigation object used for switching between screens
		 */
		navigation: PropTypes.object,
		/**
		 * List of recent TransactionMeta objects
		 */
		transactions: PropTypes.arrayOf(PropTypes.object)
	};

	state = {
		mode: 'review'
	};

	onCancel = id => {
		Engine.context.TransactionController.cancelTransaction(id);
		this.props.navigation.goBack();
	};

	onConfirm = (id, transaction) => {
		const { TransactionController } = Engine.context;
		const meta = this.props.transactions.find(meta => meta.id === id);
		meta.transaction = transaction;
		TransactionController.updateTransaction(this.prepareTransactionMeta(meta));
		TransactionController.approveTransaction(id);
		this.props.navigation.goBack();
	};

	onModeChange = mode => {
		this.setState({ mode });
	}

	getTransactionMeta() {
		return [...this.props.transactions].reverse().find(meta => meta.status === 'unapproved');
	}

	prepareTransactionMeta(meta) {
		meta.transaction.gas = BNToHex(meta.transaction.gas);
		meta.transaction.value = BNToHex(meta.transaction.value);
		return meta;
	}

	sanitizeTransactionMeta(meta) {
		meta.transaction.gas = hexToBN(meta.transaction.gas);
		meta.transaction.value = hexToBN(meta.transaction.value);
		return meta;
	}

	render() {
		const { id, transaction } = this.sanitizeTransactionMeta(this.getTransactionMeta());
		return (
			<TransactionEditor
				mode={this.state.mode}
				onCancel={this.onCancel}
				onConfirm={this.onConfirm}
				onModeChange={this.onModeChange}
				transactionID={id}
				transaction={transaction}
			/>
		);
	}
}

const mapStateToProps = ({ backgroundState: { TransactionController } }) => ({
	transactions: TransactionController.transactions
});

export default connect(mapStateToProps)(Approval);
