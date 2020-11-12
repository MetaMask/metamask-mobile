import React, { PureComponent } from 'react';
import { StyleSheet, Alert, InteractionManager, AppState } from 'react-native';
import PropTypes from 'prop-types';
import { getApproveNavbar } from '../../../UI/Navbar';
import { connect } from 'react-redux';
import { safeToChecksumAddress } from '../../../../util/address';
import Engine from '../../../../core/Engine';
import CustomGas from '../../../UI/CustomGas';
import AnimatedTransactionModal from '../../../UI/AnimatedTransactionModal';
import ApproveTransactionReview from '../../../UI/ApproveTransactionReview';
import Modal from 'react-native-modal';
import { strings } from '../../../../../locales/i18n';
import { setTransactionObject } from '../../../../actions/transaction';
import { util } from '@metamask/controllers';
import { isBN } from '../../../../util/number';
import { getNormalizedTxState } from '../../../../util/transactions';
import { getBasicGasEstimates, apiEstimateModifiedToWEI } from '../../../../util/custom-gas';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import NotificationManager from '../../../../core/NotificationManager';
import Analytics from '../../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';
import Logger from '../../../../util/Logger';

const { BNToHex, hexToBN } = util;

const EDIT = 'edit';
const REVIEW = 'review';

const styles = StyleSheet.create({
	keyboardAwareWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	}
});

/**
 * PureComponent that manages ERC20 approve from the dapp browser
 */
class Approve extends PureComponent {
	static navigationOptions = ({ navigation }) => getApproveNavbar('approve.title', navigation);

	static propTypes = {
		/**
		 * List of accounts from the AccountTrackerController
		 */
		accounts: PropTypes.object,
		/**
		 * Transaction state
		 */
		transaction: PropTypes.object.isRequired,
		/**
		 * Action that sets transaction attributes from object to a transaction
		 */
		setTransactionObject: PropTypes.func.isRequired,
		/**
		 * List of transactions
		 */
		transactions: PropTypes.array,
		/**
		 * Number of tokens
		 */
		tokensLength: PropTypes.number,
		/**
		 * Number of accounts
		 */
		accountsLength: PropTypes.number,
		/**
		 * A string representing the network name
		 */
		providerType: PropTypes.string,
		/**
		 * Whether the modal is visible
		 */
		modalVisible: PropTypes.bool,
		/**
		/* Token approve modal visible or not
		*/
		toggleApproveModal: PropTypes.func
	};

	state = {
		approved: false,
		gasError: undefined,
		ready: false,
		mode: REVIEW
	};

	componentDidMount = () => {
		if (!this.props?.transaction?.id) {
			this.props.toggleApproveModal(false);
			return null;
		}
		this.handleFetchBasicEstimates();
		AppState.addEventListener('change', this.handleAppStateChange);
	};

	componentWillUnmount = () => {
		const { approved } = this.state;
		const { transaction } = this.props;
		AppState.removeEventListener('change', this.handleAppStateChange);
		if (!approved) Engine.context.TransactionController.cancelTransaction(transaction.id);
	};

	handleAppStateChange = appState => {
		if (appState !== 'active') {
			const { transaction } = this.props;
			transaction && transaction.id && Engine.context.TransactionController.cancelTransaction(transaction.id);
			this.props.toggleApproveModal(false);
		}
	};

	handleFetchBasicEstimates = async () => {
		this.setState({ ready: false });
		const basicGasEstimates = await getBasicGasEstimates();
		this.handleSetGasFee(this.props.transaction.gas, apiEstimateModifiedToWEI(basicGasEstimates.averageGwei));
		this.setState({ basicGasEstimates, ready: true });
	};

	trackApproveEvent = event => {
		const { transaction, tokensLength, accountsLength, providerType } = this.props;
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEventWithParameters(event, {
				view: transaction.origin,
				numberOfTokens: tokensLength,
				numberOfAccounts: accountsLength,
				network: providerType
			});
		});
	};

	handleSetGasFee = (customGas, customGasPrice) => {
		const { setTransactionObject } = this.props;

		this.setState({ gasEstimationReady: false });

		setTransactionObject({ gas: customGas, gasPrice: customGasPrice });

		setTimeout(() => {
			this.setState({
				gasEstimationReady: true,
				errorMessage: undefined
			});
		}, 100);
	};

	validateGas = () => {
		let error;
		const {
			transaction: { gas, gasPrice, from },
			accounts
		} = this.props;
		const fromAccount = accounts[safeToChecksumAddress(from)];
		if (!gas) error = strings('transaction.invalid_gas');
		else if (!gasPrice) error = strings('transaction.invalid_gas_price');
		else if (fromAccount && isBN(gas) && isBN(gasPrice) && hexToBN(fromAccount.balance).lt(gas.mul(gasPrice))) {
			error = strings('transaction.insufficient');
		}
		this.setState({ gasError: error });
		return error;
	};

	prepareTransaction = transaction => ({
		...transaction,
		gas: BNToHex(transaction.gas),
		gasPrice: BNToHex(transaction.gasPrice),
		value: BNToHex(transaction.value),
		to: safeToChecksumAddress(transaction.to),
		from: safeToChecksumAddress(transaction.from)
	});

	onConfirm = async () => {
		if (this.validateGas()) return;
		const { TransactionController } = Engine.context;
		const { transactions } = this.props;
		try {
			const transaction = this.prepareTransaction(this.props.transaction);

			TransactionController.hub.once(`${transaction.id}:finished`, transactionMeta => {
				if (transactionMeta.status === 'submitted') {
					this.setState({ approved: true });
					this.props.toggleApproveModal();
					NotificationManager.watchSubmittedTransaction({
						...transactionMeta,
						assetType: 'ETH'
					});
				} else {
					throw transactionMeta.error;
				}
			});

			const fullTx = transactions.find(({ id }) => id === transaction.id);
			const updatedTx = { ...fullTx, transaction };
			await TransactionController.updateTransaction(updatedTx);
			await TransactionController.approveTransaction(transaction.id);
			this.trackApproveEvent(ANALYTICS_EVENT_OPTS.DAPP_APPROVE_SCREEN_APPROVE);
		} catch (error) {
			Alert.alert(strings('transactions.transaction_error'), error && error.message, [{ text: 'OK' }]);
			Logger.error(error, 'error while trying to send transaction (Approve)');
			this.setState({ transactionHandled: false });
		}
	};

	onCancel = () => {
		this.trackApproveEvent(ANALYTICS_EVENT_OPTS.DAPP_APPROVE_SCREEN_CANCEL);
		this.props.toggleApproveModal(false);
	};

	review = () => {
		this.onModeChange(REVIEW);
	};

	onModeChange = mode => {
		this.setState({ mode });
		if (mode === EDIT) {
			InteractionManager.runAfterInteractions(() => {
				Analytics.trackEvent(ANALYTICS_EVENT_OPTS.SEND_FLOW_ADJUSTS_TRANSACTION_FEE);
			});
		}
	};

	render = () => {
		const { gasError, basicGasEstimates, mode, ready } = this.state;
		const { transaction } = this.props;
		if (!transaction.id) return null;
		return (
			<Modal
				isVisible={this.props.modalVisible}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={600}
				animationOutTiming={600}
				onBackdropPress={this.onCancel}
				onBackButtonPress={this.onCancel}
				onSwipeComplete={this.onCancel}
				swipeDirection={'down'}
				propagateSwipe
			>
				<KeyboardAwareScrollView contentContainerStyle={styles.keyboardAwareWrapper}>
					<AnimatedTransactionModal onModeChange={this.onModeChange} ready={ready} review={this.review}>
						<ApproveTransactionReview
							gasError={gasError}
							onCancel={this.onCancel}
							onConfirm={this.onConfirm}
						/>
						<CustomGas
							handleGasFeeSelection={this.handleSetGasFee}
							basicGasEstimates={basicGasEstimates}
							gas={transaction.gas}
							gasPrice={transaction.gasPrice}
							gasError={gasError}
							mode={mode}
						/>
					</AnimatedTransactionModal>
				</KeyboardAwareScrollView>
			</Modal>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	transaction: getNormalizedTxState(state),
	transactions: state.engine.backgroundState.TransactionController.transactions,
	accountsLength: Object.keys(state.engine.backgroundState.AccountTrackerController.accounts).length,
	tokensLength: state.engine.backgroundState.AssetsController.tokens.length,
	providerType: state.engine.backgroundState.NetworkController.provider.type
});

const mapDispatchToProps = dispatch => ({
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Approve);
