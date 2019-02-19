import React, { Component } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import Engine from '../../../core/Engine';
import PropTypes from 'prop-types';
import TransactionEditor from '../../UI/TransactionEditor';
import { BNToHex, hexToBN } from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { colors } from '../../../styles/common';
import { newTransaction, setTransactionObject } from '../../../actions/transaction';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	}
});

/**
 * Component that manages transaction approval from the dapp browser
 */
class Approval extends Component {
	static navigationOptions = () => getNavigationOptionsTitle(strings('approval.title'));

	static propTypes = {
		/**
		 * react-navigation object used for switching between screens
		 */
		navigation: PropTypes.object,
		/**
		 * Action that cleans transaction state
		 */
		newTransaction: PropTypes.func.isRequired,
		/**
		 * Action that sets transaction attributes from object to a transaction
		 */
		setTransactionObject: PropTypes.func.isRequired,
		/**
		 * Transaction state
		 */
		transaction: PropTypes.object.isRequired
	};

	state = {
		mode: 'review'
	};

	componentDidMount = () => {
		let { transaction } = this.props;
		transaction = this.sanitizeTransaction(transaction);
		this.props.setTransactionObject(transaction);
	};

	/**
	 * Transaction state is erased, ready to create a new clean transaction
	 */
	clear = async () => {
		this.props.newTransaction();
	};

	onCancel = () => {
		const { transaction } = this.props;
		Engine.context.TransactionController.cancelTransaction(transaction.id);
		this.props.navigation.goBack();
		this.clear();
	};

	onConfirm = transaction => {
		const { TransactionController } = Engine.context;
		const {
			params: { transactionMeta }
		} = this.props.navigation.state;
		TransactionController.updateTransaction(this.prepareTransactionMeta(transaction));
		TransactionController.approveTransaction(transactionMeta.id);
		this.props.navigation.goBack();
		this.clear();
	};

	onModeChange = mode => {
		this.setState({ mode });
	};

	prepareTransaction(transaction) {
		transaction.gas = BNToHex(transaction.gas);
		transaction.gasPrice = BNToHex(transaction.gasPrice);
		transaction.value = BNToHex(transaction.value);
		return transaction;
	}

	sanitizeTransaction(transaction) {
		transaction.gas = hexToBN(transaction.gas);
		transaction.gasPrice = hexToBN(transaction.gasPrice);
		transaction.value = hexToBN(transaction.value);
		return transaction;
	}

	render = () => {
		const { transaction } = this.props;
		return (
			<SafeAreaView style={styles.wrapper}>
				<TransactionEditor
					mode={this.state.mode}
					onCancel={this.onCancel}
					onConfirm={this.onConfirm}
					onModeChange={this.onModeChange}
					transaction={transaction}
					navigation={this.props.navigation}
				/>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	transaction: state.transaction
});

const mapDispatchToProps = dispatch => ({
	newTransaction: () => dispatch(newTransaction()),
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Approval);
