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
import {
	prepareTransaction,
	prepareTokenTransaction,
	sanitizeTransaction,
	newTransaction,
	setTransactionObject
} from '../../actions/transaction';

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
		mode: 'edit',
		transactionKey: undefined,
		ready: false,
		transactionConfirmed: false,
		transactionSubmitted: false
	};

	mounted = false;
	unmountHandled = false;

	async reset() {
		const { transaction } = this.props;
		const { gas, gasPrice } = await Engine.context.TransactionController.estimateGas(transaction);
		this.props.setTransactionObject({
			gas: hexToBN(gas),
			gasPrice: hexToBN(gasPrice)
		});
		return this.mounted && this.setState({ mode: 'edit', transactionKey: Date.now() });
	}

	clear = async () => {
		this.props.newTransaction();
	};

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
		const { transactionSubmitted } = this.state;
		const { transaction } = this.state;
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

	prepareTransaction = transaction => ({
		...transaction,
		gas: BNToHex(transaction.gas),
		gasPrice: BNToHex(transaction.gasPrice),
		value: BNToHex(transaction.value)
	});

	prepareTokenTransaction = (transaction, asset) => ({
		...transaction,
		gas: BNToHex(transaction.gas),
		gasPrice: BNToHex(transaction.gasPrice),
		value: '0x0',
		to: asset.address
	});

	sanitizeTransaction = transaction => ({
		...transaction,
		gas: BNToHex(transaction.gas),
		gasPrice: BNToHex(transaction.gasPrice)
	});

	onCancel = id => {
		Engine.context.TransactionController.cancelTransaction(id);
		if (this.state.mode !== 'edit') {
			this.props.navigation.pop(2);
		} else {
			this.props.navigation.pop();
		}
		this.clear();
		this.unmountHandled = true;
	};

	onConfirm = async () => {
		const { TransactionController } = Engine.context;
		this.setState({ transactionConfirmed: true });
		const {
			transaction: { selectedToken }
		} = this.props;
		let { transaction } = this.props;
		try {
			if (!selectedToken) {
				transaction = this.prepareTransaction(transaction);
			} else {
				transaction = this.prepareTokenTransaction(transaction, selectedToken);
			}
			const { result, transactionMeta } = await TransactionController.addTransaction(transaction);
			await TransactionController.approveTransaction(transactionMeta.id);
			const hash = await result;
			this.props.navigation.push('TransactionSubmitted', { hash });
			await this.clear();
			this.setState({ transactionConfirmed: false, transactionSubmitted: true });
		} catch (error) {
			Alert.alert('Transaction error', JSON.stringify(error), [{ text: 'OK' }]);
			this.setState({ transactionConfirmed: false });
			await this.reset();
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
	sanitizeTransaction: (gas, gasPrice) => dispatch(sanitizeTransaction(gas, gasPrice)),
	newTransaction: () => dispatch(newTransaction()),
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Send);
