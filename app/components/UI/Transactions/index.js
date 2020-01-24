import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {
	Platform,
	ScrollView,
	ActivityIndicator,
	RefreshControl,
	StyleSheet,
	Text,
	View,
	FlatList,
	Dimensions,
	InteractionManager
} from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import TransactionElement from '../TransactionElement';
import Engine from '../../../core/Engine';
import { hasBlockExplorer } from '../../../util/networks';
import { showAlert } from '../../../actions/alert';
import TransactionsNotificationManager from '../../../core/TransactionsNotificationManager';
import ActionModal from '../ActionModal';
import { CANCEL_RATE, SPEED_UP_RATE } from 'gaba';
import { renderFromWei } from '../../../util/number';
import { safeToChecksumAddress } from '../../../util/address';
import { hexToBN } from 'gaba/dist/util';
import { BN } from 'ethereumjs-util';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.white,
		minHeight: Dimensions.get('window').height / 2
	},
	loader: {
		alignSelf: 'center'
	},
	text: {
		fontSize: 20,
		color: colors.fontTertiary,
		...fontStyles.normal
	},
	modalView: {
		alignItems: 'stretch',
		flex: 1,
		flexDirection: 'column',
		justifyContent: 'space-between',
		padding: 20
	},
	modalText: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center',
		paddingVertical: 8
	},
	modalTitle: {
		...fontStyles.bold,
		fontSize: 22,
		textAlign: 'center'
	},
	gasTitle: {
		...fontStyles.bold,
		fontSize: 16,
		textAlign: 'center',
		marginVertical: 8
	},
	cancelFeeWrapper: {
		backgroundColor: colors.grey000,
		textAlign: 'center',
		padding: 15
	},
	cancelFee: {
		...fontStyles.bold,
		fontSize: 24,
		textAlign: 'center'
	},
	warningText: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.red,
		paddingVertical: 8,
		textAlign: 'center'
	}
});

const ROW_HEIGHT = (Platform.OS === 'ios' ? 95 : 100) + StyleSheet.hairlineWidth;

/**
 * View that renders a list of transactions for a specific asset
 */
class Transactions extends PureComponent {
	static propTypes = {
		/**
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		contractExchangeRates: PropTypes.object,
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * An array that represents the user collectible contracts
		 */
		collectibleContracts: PropTypes.array,
		/**
		 * An array that represents the user tokens
		 */
		tokens: PropTypes.object,
		/**
		 * An array of transactions objects
		 */
		transactions: PropTypes.array,
		/**
		 * An array of transactions objects that have been submitted
		 */
		submittedTransactions: PropTypes.array,
		/**
		 * An array of transactions objects that have been confirmed
		 */
		confirmedTransactions: PropTypes.array,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * String representing the selected the selected network
		 */
		networkType: PropTypes.string,
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Action that shows the global alert
		 */
		showAlert: PropTypes.func,
		/**
		 * Loading flag from an external call
		 */
		loading: PropTypes.bool,
		/**
		 * Pass the flatlist ref to the parent
		 */
		onRefSet: PropTypes.func,
		/**
		 * Optional header component
		 */
		header: PropTypes.object,
		/**
		 * Optional header height
		 */
		headerHeight: PropTypes.number,
		exchangeRate: PropTypes.number
	};

	static defaultProps = {
		headerHeight: 0
	};

	state = {
		selectedTx: (new Map(): Map<string, boolean>),
		ready: false,
		refreshing: false,
		cancelIsOpen: false,
		cancelConfirmDisabled: false,
		speedUpIsOpen: false,
		speedUpConfirmDisabled: false
	};

	existingGasPriceDecimal = null;
	cancelTxId = null;
	speedUpTxId = null;

	selectedTx = null;

	flatList = React.createRef();

	componentDidMount() {
		this.mounted = true;
		setTimeout(() => {
			this.mounted && this.setState({ ready: true });
			this.init();
			this.props.onRefSet && this.props.onRefSet(this.flatList);
		}, 100);
	}

	init() {
		this.mounted && this.setState({ ready: true });
		const txToView = TransactionsNotificationManager.getTransactionToView();
		if (txToView) {
			setTimeout(() => {
				const index = this.props.transactions.findIndex(tx => txToView === tx.id);
				if (index >= 0) {
					this.toggleDetailsView(txToView, index);
				}
			}, 1000);
		}
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	scrollToIndex = index => {
		if (!this.scrolling && (this.props.headerHeight || index)) {
			this.scrolling = true;
			this.flatList.current.scrollToIndex({ index, animated: true });
			setTimeout(() => {
				this.scrolling = false;
			}, 300);
		}
	};

	toggleDetailsView = (id, index) => {
		const oldId = this.selectedTx && this.selectedTx.id;
		const oldIndex = this.selectedTx && this.selectedTx.index;

		if (this.selectedTx && oldId !== id && oldIndex !== index) {
			this.selectedTx = null;
			this.toggleDetailsView(oldId, oldIndex);
			InteractionManager.runAfterInteractions(() => {
				this.toggleDetailsView(id, index);
			});
		} else {
			this.setState(state => {
				const selectedTx = new Map(state.selectedTx);
				const show = !selectedTx.get(id);
				selectedTx.set(id, show);
				if (show && (this.props.headerHeight || index)) {
					InteractionManager.runAfterInteractions(() => {
						this.scrollToIndex(index);
					});
				}
				this.selectedTx = show ? { id, index } : null;
				return { selectedTx };
			});
		}
	};

	onRefresh = async () => {
		this.setState({ refreshing: true });
		await Engine.refreshTransactionHistory();
		this.setState({ refreshing: false });
	};

	renderLoader = () => (
		<View style={styles.emptyContainer}>
			<ActivityIndicator style={styles.loader} size="small" />
		</View>
	);

	renderEmpty = () => (
		<ScrollView refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}>
			{this.props.header ? this.props.header : null}
			<View style={styles.emptyContainer}>
				<Text style={styles.text}>{strings('wallet.no_transactions')}</Text>
			</View>
		</ScrollView>
	);

	getItemLayout = (data, index) => ({
		length: ROW_HEIGHT,
		offset: this.props.headerHeight + ROW_HEIGHT * index,
		index
	});

	keyExtractor = item => item.id.toString();

	blockExplorer = () => hasBlockExplorer(this.props.networkType);

	validateBalance = (tx, rate) => {
		const { accounts } = this.props;
		try {
			const checksummedFrom = safeToChecksumAddress(tx.transaction.from);
			const balance = accounts[checksummedFrom].balance;
			return hexToBN(balance).lt(
				hexToBN(tx.transaction.gasPrice)
					.mul(new BN(rate * 10))
					.mul(new BN(10))
					.mul(hexToBN(tx.transaction.gas))
					.add(hexToBN(tx.transaction.value))
			);
		} catch (e) {
			return false;
		}
	};

	onSpeedUpAction = (speedUpAction, existingGasPriceDecimal, tx) => {
		this.setState({ speedUpIsOpen: speedUpAction });
		this.existingGasPriceDecimal = existingGasPriceDecimal;
		this.speedUpTxId = tx.id;
		if (this.validateBalance(tx, SPEED_UP_RATE)) {
			this.setState({ speedUpIsOpen: speedUpAction, speedUpConfirmDisabled: true });
		} else {
			this.setState({ speedUpIsOpen: speedUpAction, speedUpConfirmDisabled: false });
		}
	};

	onSpeedUpCompleted = () => {
		this.setState({ speedUpIsOpen: false });
		this.existingGasPriceDecimal = null;
		this.speedUpTxId = null;
	};

	onCancelAction = (cancelAction, existingGasPriceDecimal, tx) => {
		this.existingGasPriceDecimal = existingGasPriceDecimal;
		this.cancelTxId = tx.id;
		if (this.validateBalance(tx, SPEED_UP_RATE)) {
			this.setState({ cancelIsOpen: cancelAction, cancelConfirmDisabled: true });
		} else {
			this.setState({ cancelIsOpen: cancelAction, cancelConfirmDisabled: false });
		}
	};
	onCancelCompleted = () => {
		this.setState({ cancelIsOpen: false });
		this.existingGasPriceDecimal = null;
		this.cancelTxId = null;
	};

	speedUpTransaction = () => {
		InteractionManager.runAfterInteractions(() => {
			try {
				Engine.context.TransactionController.speedUpTransaction(this.speedUpTxId);
			} catch (e) {
				// ignore because transaction already went through
			}
			this.onSpeedUpCompleted();
		});
	};

	cancelTransaction = () => {
		InteractionManager.runAfterInteractions(() => {
			try {
				Engine.context.TransactionController.stopTransaction(this.cancelTxId);
			} catch (e) {
				// ignore because transaction already went through
			}
			this.onCancelCompleted();
		});
	};

	renderItem = ({ item, index }) => (
		<TransactionElement
			tx={item}
			i={index}
			onSpeedUpAction={this.onSpeedUpAction}
			onCancelAction={this.onCancelAction}
			testID={'txn-item'}
			selectedAddress={this.props.selectedAddress}
			selected={!!this.state.selectedTx.get(item.id)}
			onPressItem={this.toggleDetailsView}
			blockExplorer
			tokens={this.props.tokens}
			collectibleContracts={this.props.collectibleContracts}
			contractExchangeRates={this.props.contractExchangeRates}
			exchangeRate={this.props.exchangeRate}
			conversionRate={this.props.conversionRate}
			currentCurrency={this.props.currentCurrency}
			showAlert={this.props.showAlert}
			navigation={this.props.navigation}
		/>
	);

	render = () => {
		if (!this.state.ready || this.props.loading) {
			return this.renderLoader();
		}
		if (!this.props.transactions.length) {
			return this.renderEmpty();
		}

		const { submittedTransactions, confirmedTransactions, header } = this.props;
		const { cancelConfirmDisabled, speedUpConfirmDisabled } = this.state;
		const transactions =
			submittedTransactions && submittedTransactions.length
				? submittedTransactions.concat(confirmedTransactions)
				: this.props.transactions;

		return (
			<View style={styles.wrapper} testID={'transactions-screen'}>
				<FlatList
					ref={this.flatList}
					getItemLayout={this.getItemLayout}
					data={transactions}
					extraData={this.state}
					keyExtractor={this.keyExtractor}
					refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
					renderItem={this.renderItem}
					initialNumToRender={10}
					maxToRenderPerBatch={2}
					onEndReachedThreshold={0.5}
					ListHeaderComponent={header}
				/>
				<ActionModal
					modalVisible={this.state.cancelIsOpen}
					confirmText={strings('transaction.lets_try')}
					cancelText={strings('transaction.nevermind')}
					onCancelPress={this.onCancelCompleted}
					onRequestClose={this.onCancelCompleted}
					onConfirmPress={this.cancelTransaction}
					confirmDisabled={cancelConfirmDisabled}
				>
					<View style={styles.modalView}>
						<Text style={styles.modalTitle}>{strings('transaction.cancel_tx_title')}</Text>
						<Text style={styles.gasTitle}>{strings('transaction.gas_cancel_fee')}</Text>
						<View style={styles.cancelFeeWrapper}>
							<Text style={styles.cancelFee}>
								{`${renderFromWei(Math.floor(this.existingGasPriceDecimal * CANCEL_RATE))} ${strings(
									'unit.eth'
								)}`}
							</Text>
						</View>
						<Text style={styles.modalText}>{strings('transaction.cancel_tx_message')}</Text>
						{cancelConfirmDisabled && (
							<Text style={styles.warningText}>{strings('transaction.insufficient')}</Text>
						)}
					</View>
				</ActionModal>

				<ActionModal
					modalVisible={this.state.speedUpIsOpen}
					confirmText={strings('transaction.lets_try')}
					cancelText={strings('transaction.nevermind')}
					onCancelPress={this.onSpeedUpCompleted}
					onRequestClose={this.onSpeedUpCompleted}
					onConfirmPress={this.speedUpTransaction}
					confirmDisabled={speedUpConfirmDisabled}
				>
					<View style={styles.modalView}>
						<Text style={styles.modalTitle}>{strings('transaction.speedup_tx_title')}</Text>
						<Text style={styles.gasTitle}>{strings('transaction.gas_speedup_fee')}</Text>
						<View style={styles.cancelFeeWrapper}>
							<Text style={styles.cancelFee}>
								{`${renderFromWei(Math.floor(this.existingGasPriceDecimal * SPEED_UP_RATE))} ${strings(
									'unit.eth'
								)}`}
							</Text>
						</View>
						<Text style={styles.modalText}>{strings('transaction.speedup_tx_message')}</Text>
						{speedUpConfirmDisabled && (
							<Text style={styles.warningText}>{strings('transaction.insufficient')}</Text>
						)}
					</View>
				</ActionModal>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	tokens: state.engine.backgroundState.AssetsController.tokens.reduce((tokens, token) => {
		tokens[token.address] = token;
		return tokens;
	}, {}),
	collectibleContracts: state.engine.backgroundState.AssetsController.collectibleContracts,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency
});

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Transactions);
