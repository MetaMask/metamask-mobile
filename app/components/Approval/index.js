import React, { Component } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import Engine from '../../core/Engine';
import PropTypes from 'prop-types';
import TransactionEditor from '../TransactionEditor';
import { BNToHex, hexToBN } from '../../util/number';
import { strings } from '../../../locales/i18n';
import { getNavigationOptionsTitle } from '../Navbar';
import { colors } from '../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	}
});

/**
 * Component that manages transaction approval from the dapp browser
 */
export default class Approval extends Component {
	static navigationOptions = () => getNavigationOptionsTitle(strings('approval.title'));

	static propTypes = {
		/**
		 * react-navigation object used for switching between screens
		 */
		navigation: PropTypes.object
	};

	state = {
		mode: 'review'
	};

	onCancel = () => {
		const {
			params: { transactionMeta }
		} = this.props.navigation.state;
		Engine.context.TransactionController.cancelTransaction(transactionMeta.id);
		this.props.navigation.goBack();
	};

	onConfirm = transaction => {
		const { TransactionController } = Engine.context;
		const {
			params: { transactionMeta }
		} = this.props.navigation.state;
		transactionMeta.transaction = transaction;
		TransactionController.updateTransaction(this.prepareTransactionMeta(transactionMeta));
		TransactionController.approveTransaction(transactionMeta.id);
		this.props.navigation.goBack();
	};

	onModeChange = mode => {
		this.setState({ mode });
	};

	prepareTransactionMeta(meta) {
		meta.transaction.gas = BNToHex(meta.transaction.gas);
		meta.transaction.gasPrice = BNToHex(meta.transaction.gasPrice);
		meta.transaction.value = BNToHex(meta.transaction.value);
		return meta;
	}

	sanitizeTransactionMeta(meta) {
		meta.transaction.gas = hexToBN(meta.transaction.gas);
		meta.transaction.gasPrice = hexToBN(meta.transaction.gasPrice);
		meta.transaction.value = hexToBN(meta.transaction.value);
		return meta;
	}

	render = () => {
		const {
			params: { transactionMeta }
		} = this.props.navigation.state;
		const { transaction } = this.sanitizeTransactionMeta(transactionMeta);
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
