import React, { Component } from 'react';
import Engine from '../../core/Engine';
import PropTypes from 'prop-types';
import TransactionEditor from '../TransactionEditor';
import { Alert, Platform, StyleSheet, TextInput, View } from 'react-native';
import { colors, baseStyles } from '../../styles/common';
import { connect } from 'react-redux';

const styles = StyleSheet.create({

});

/**
 * Component that manages transaction approval from the dapp browser
 */
class Approval extends Component {
	static propTypes = {
		/**
		 * List of recent TransactionMeta objects
		 */
		transactions: PropTypes.arrayOf(PropTypes.object)
	}

	cancel = () => {
		const transactionMeta = this.getTransactionMeta();
		Engine.context.TransactionController.cancelTransaction(transactionMeta.id);
	};

	confirm = () => {
		const transactionMeta = this.getTransactionMeta();
		Engine.context.TransactionController.approveTransaction(transactionMeta.id);
	};

	getTransactionMeta() {
		return [...this.props.transactions].reverse().find(meta => meta.status === 'unapproved');
	}

	prepareTransactionmeta(meta) {

	}

	sanitizeTransactionMeta(meta) {

	}

	render() {
		return (
			<TransactionEditor
				onCancel={this.cancel}
				onConfirm={this.confirm}
				transactionMeta={this.sanitizeTransactionMeta(this.getTransactionMeta())}
			/>
		);
	}
}

const mapStateToProps = ({ backgroundState: { TransactionController } }) => ({
	transactions: TransactionController.transactions
});

export default connect(mapStateToProps)(Approval);
