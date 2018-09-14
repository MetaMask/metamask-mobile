import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { withNavigation } from 'react-navigation';
import { colors } from '../../styles/common';
import Engine from '../../core/Engine';
import TransactionEditor from '../TransactionEditor';
import { toBN, BNToHex, hexToBN } from '../../util/number';
import { connect } from 'react-redux';
import { toChecksumAddress } from 'ethereumjs-util';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		paddingTop: 30
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class SendScreen extends Component {
	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * String representing the selected adddress
		 */
		selectedAddress: PropTypes.string
	};

	state = {
		to: '',
		fullTo: '',
		mode: 'edit',
		txMeta: {
			gas: toBN('0'),
			gasPrice: toBN('0'),
			value: toBN('0'),
			to: '',
			from: this.props.selectedAddress,
			source: null,
			transaction: null,
			status: ''
		},
		ready: false
	};

	checkForDeeplinks() {
		const { navigation } = this.props;
		if (navigation) {
			const txMeta = navigation.getParam('txMeta', null);
			if (txMeta) {
				this.handleNewTxMeta(txMeta);
			}
		}

		this.setState({ ready: true });
	}

	componentDidMount() {
		this.checkForDeeplinks();
	}

	componentDidUpdate(prevProps) {
		const prevNavigation = prevProps.navigation;
		const { navigation } = this.props;
		if (prevNavigation && navigation) {
			const prevTxMeta = prevNavigation.getParam('txMeta', null);
			const currentTxMeta = navigation.getParam('txMeta', null);
			if (currentTxMeta.source && (!prevTxMeta.source || prevTxMeta.source !== currentTxMeta.source)) {
				this.handleNewTxMeta(currentTxMeta);
			}
		}
	}

	handleNewTxMeta = ({
		target_address,
		chain_id = null, // eslint-disable-line no-unused-vars
		function_name = null, // eslint-disable-line no-unused-vars
		parameters = null
	}) => {
		const newTxMeta = this.state.txMeta;
		newTxMeta.to = toChecksumAddress(target_address);

		if (parameters) {
			const { value, gas, gasPrice, gasLimit } = parameters;
			if (value) {
				newTxMeta.value = toBN(value);
			}
			if (gas) {
				newTxMeta.gas = toBN(gas);
			}
			if (gasPrice) {
				newTxMeta.gasPrice = toBN(gas);
			}
			if (gasLimit) {
				// Don't see a gasLimit anywhere...
			}

			// TODO: We should add here support for sending tokens
			// or calling smart contract functions
		}
		this.setState({ txMeta: newTxMeta });
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

	onCancel = id => {
		Engine.context.TransactionController.cancelTransaction(id);
		this.setState({ mode: 'edit' });
	};

	onConfirm = transaction => {
		const { TransactionController } = Engine.context;
		const transactionMeta = this.state.txMeta;
		transactionMeta.transaction = transaction;
		TransactionController.updateTransaction(this.prepareTransactionMeta(transactionMeta));
		TransactionController.approveTransaction(transactionMeta.id);
		this.props.navigation.goBack();
	};

	onModeChange = mode => {
		this.setState({ mode });
	};

	renderLoader() {
		return (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	render() {
		return (
			<View style={styles.wrapper}>
				{this.state.ready ? (
					<TransactionEditor
						mode={this.state.mode}
						onCancel={this.onCancel}
						onConfirm={this.onConfirm}
						onModeChange={this.onModeChange}
						onScanSuccess={this.handleNewTxMeta}
						transaction={this.state.txMeta}
					/>
				) : (
					this.renderLoader()
				)}
			</View>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(withNavigation(SendScreen));
