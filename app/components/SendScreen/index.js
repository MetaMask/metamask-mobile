import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
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
		selectedAddress: PropTypes.string,
		/**
		 * Object containing tx metadata for coming from an external source,
		 * for ex. deeplinks
		 */
		txMeta: PropTypes.object
	};

	constructor(props){
		super(props);

		let txMeta = {
			gas: toBN('0'),
			gasPrice: toBN('0'),
			value: toBN('0'),
			to: '',
			from: props.selectedAddress,
			source: null,
			transaction: null,
			status: ''
		};

		if(props.txMeta){
			txMeta = {
				...txMeta,
				...props.txMeta,
			}
		}

		this.state = {
			to: '',
			fullTo: '',
			mode: 'edit',
			txMeta
		}
	}

	handleNewTxMeta =  ({ target_address, chain_id = null, function_name = null, parameters = null }) => { // eslint-disable-line no-unused-vars
		const newTxMeta = this.state.txMeta;
		newTxMeta.to = toChecksumAddress(target_address);

		if (parameters) {
			const { value, gas, gasPrice, gasLimit } = parameters;
			if (value) {
				newTxMeta.value = toBN(value);
			}
			if (gas) {
				newTxMeta.gas =  toBN(gas);
			}
			if (gasPrice) {
				newTxMeta.gasPrice =  toBN(gas);
			}
			if (gasLimit) {
				// Don't see a gasLimit anywhere...
			}

			// TODO: We should add here support for sending tokens
			// or calling smart contract functions
		}
		this.setState({txMeta: newTxMeta});
	};

	componentDidUpdate() {
		if (this.props.txMeta && this.props.txMeta.source !== this.state.txMeta.source) {
			this.handleNewTxMeta(this.props.txMeta);
		}
	}

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

	showQrScanner = () => {
		this.props.navigation.navigate('QrScanner', {
			onScanSuccess: this.handleNewTxMeta
		});
	};

	onCancel = id => {
		Engine.context.TransactionController.cancelTransaction(id);
		this.setState({mode: 'edit'});
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

	render() {
		return (
			<View style={styles.wrapper}>
				<TransactionEditor
					mode={this.state.mode}
					onCancel={this.onCancel}
					onConfirm={this.onConfirm}
					onModeChange={this.onModeChange}
					transaction={this.state.txMeta}
				/>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(withNavigation(SendScreen));
