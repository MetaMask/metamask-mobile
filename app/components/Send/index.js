import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { SafeAreaView, ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { colors } from '../../styles/common';
import Engine from '../../core/Engine';
import TransactionEditor from '../TransactionEditor';
import { toBN, BNToHex, hexToBN } from '../../util/number';
import { toChecksumAddress } from 'ethereumjs-util';
import { strings } from '../../../locales/i18n';
import { getClosableNavigationOptions } from '../Navbar';
import { connect } from 'react-redux';
import { prepareTransaction, prepareTokenTransaction, sanitizeTransaction } from '../../actions/transaction';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
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
class Send extends Component {
	static navigationOptions = ({ navigation }) =>
		getClosableNavigationOptions(strings('send.title'), strings('navigation.cancel'), navigation);

	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * Action that prepares a transaction
		 */
		prepareTransaction: PropTypes.func.isRequired,
		/**
		 * Action that prepares a token transaction
		 */
		prepareTokenTransaction: PropTypes.func.isRequired,
		/**
		 * Action that sanitizes a transaction
		 */
		sanitizeTransaction: PropTypes.func.isRequired,
		/**
		 * Transaction state
		 */
		transaction: PropTypes.object.isRequired
	};

	state = {
		mode: 'edit',
		transaction: undefined,
		transactionKey: undefined,
		ready: false,
		transactionConfirmed: false,
		transactionSubmitted: false
	};

	mounted = false;
	unmountHandled = false;

	async reset() {
		const { navigation } = this.props;
		const asset = navigation.state && navigation.state && navigation.state.params;
		const transaction = { asset };
		const { gas, gasPrice } = await Engine.context.TransactionController.estimateGas(transaction);
		transaction.gas = hexToBN(gas);
		transaction.gasPrice = hexToBN(gasPrice);
		return this.mounted && this.setState({ mode: 'edit', transaction, transactionKey: Date.now() });
	}

	checkForDeeplinks() {
		const { navigation } = this.props;
		if (navigation) {
			const txMeta = navigation.getParam('txMeta', null);
			if (txMeta) {
				this.handleNewTxMeta(txMeta);
			}
		}

		this.mounted && this.setState({ ready: true });
	}

	async componentDidMount() {
		this.mounted = true;
		await this.reset();
		this.checkForDeeplinks();
	}

	async componentWillUnmount() {
		const { transaction, transactionSubmitted } = this.state;
		if (!transactionSubmitted && !this.unmountHandled) {
			transaction && (await this.onCancel(transaction.id));
		}
		this.mounted = false;
	}

	componentDidUpdate(prevProps) {
		const prevNavigation = prevProps.navigation;
		const { navigation } = this.props;
		if (prevNavigation && navigation) {
			const prevTxMeta = prevNavigation.getParam('txMeta', null);
			const currentTxMeta = navigation.getParam('txMeta', null);
			if (
				currentTxMeta &&
				currentTxMeta.source &&
				(!prevTxMeta.source || prevTxMeta.source !== currentTxMeta.source)
			) {
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
		const newTxMeta = { ...this.state.transaction };
		newTxMeta.to = toChecksumAddress(target_address);

		if (parameters) {
			const { value, gas, gasPrice } = parameters;
			if (value) {
				newTxMeta.value = toBN(value);
			}
			if (gas) {
				newTxMeta.gas = toBN(gas);
			}
			if (gasPrice) {
				newTxMeta.gasPrice = toBN(gas);
			}

			// TODO: We should add here support for sending tokens
			// or calling smart contract functions
		}
		this.mounted && this.setState({ transaction: newTxMeta });
	};

	prepareTransaction(transaction) {
		transaction.gas = BNToHex(transaction.gas);
		transaction.gasPrice = BNToHex(transaction.gasPrice);
		transaction.value = BNToHex(transaction.value);
		this.props.prepareTransaction(transaction.gas, transaction.gasPrice, transaction.value);
		return transaction;
	}

	prepareTokenTransaction = (transaction, asset) => {
		transaction.gas = BNToHex(transaction.gas);
		transaction.gasPrice = BNToHex(transaction.gasPrice);
		transaction.value = '0x0';
		transaction.to = asset.address;
		this.props.prepareTokenTransaction(transaction.gas, transaction.gasPrice, transaction.value, transaction.to);
		return transaction;
	};

	sanitizeTransaction(transaction) {
		transaction.gas = hexToBN(transaction.gas);
		transaction.gasPrice = hexToBN(transaction.gasPrice);
		this.props.sanitizeTransaction(transaction.gas, transaction.gasPrice);
		return transaction;
	}

	onCancel = id => {
		Engine.context.TransactionController.cancelTransaction(id);
		if (this.state.mode !== 'edit') {
			this.props.navigation.pop(2);
		} else {
			this.props.navigation.pop();
		}
		this.unmountHandled = true;
	};

	onConfirm = async (transaction2, asset) => {
		const { TransactionController } = Engine.context;
		const { transaction } = this.props;
		this.setState({ transactionConfirmed: true });
		try {
			if (!asset) {
				transaction2 = this.prepareTransaction(transaction2);
			} else {
				transaction2 = this.prepareTokenTransaction(transaction2, asset);
			}
			const { result, transactionMeta } = await TransactionController.addTransaction(transaction2);
			await TransactionController.approveTransaction(transactionMeta.id);
			const hash = await result;
			this.props.navigation.push('TransactionSubmitted', { hash });
			this.reset();
			this.setState({ transaction, transactionConfirmed: false, transactionSubmitted: true });
		} catch (error) {
			Alert.alert('Transaction error', JSON.stringify(error), [{ text: 'OK' }]);
			this.setState({ transactionConfirmed: false });
			this.reset();
		}
	};

	onModeChange = mode => {
		this.mounted && this.setState({ mode });
	};

	renderLoader() {
		return (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	render = () => (
		<SafeAreaView style={styles.wrapper}>
			{this.state.ready ? (
				<TransactionEditor
					navigation={this.props.navigation}
					mode={this.state.mode}
					onCancel={this.onCancel}
					onConfirm={this.onConfirm}
					onModeChange={this.onModeChange}
					transaction={this.state.transaction}
					transactionConfirmed={this.state.transactionConfirmed}
				/>
			) : (
				this.renderLoader()
			)}
		</SafeAreaView>
	);
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	contractBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	transaction: state.transaction
});

const mapDispatchToProps = dispatch => ({
	prepareTransaction: (gas, gasPrice, value) => dispatch(prepareTransaction(gas, gasPrice, value)),
	prepareTokenTransaction: (gas, gasPrice, value, to) => dispatch(prepareTokenTransaction(gas, gasPrice, value, to)),
	sanitizeTransaction: (gas, gasPrice) => dispatch(sanitizeTransaction(gas, gasPrice))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Send);
