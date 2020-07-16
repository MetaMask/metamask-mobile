import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {
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
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import TransactionElement from '../TransactionElement';
import Engine from '../../../core/Engine';
import { showAlert } from '../../../actions/alert';
import NotificationManager from '../../../core/NotificationManager';
import { CANCEL_RATE, SPEED_UP_RATE } from '@metamask/controllers';
import { renderFromWei } from '../../../util/number';
import Device from '../../../util/Device';
import TransactionActionModal from '../TransactionActionModal';
import { validateTransactionActionBalance } from '../../../util/transactions';

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
	}
});

const ROW_HEIGHT = (Device.isIos() ? 95 : 100) + StyleSheet.hairlineWidth;

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
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
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
		exchangeRate: PropTypes.number,
		/**
		 * Indicates whether third party API mode is enabled
		 */
		thirdPartyApiMode: PropTypes.bool
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
		const txToView = NotificationManager.getTransactionToView();
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
		this.props.thirdPartyApiMode && (await Engine.refreshTransactionHistory());
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

	onSpeedUpAction = (speedUpAction, existingGasPriceDecimal, tx) => {
		this.setState({ speedUpIsOpen: speedUpAction });
		this.existingGasPriceDecimal = existingGasPriceDecimal;
		this.speedUpTxId = tx.id;
		const speedUpConfirmDisabled = validateTransactionActionBalance(tx, SPEED_UP_RATE, this.props.accounts);
		this.setState({ speedUpIsOpen: speedUpAction, speedUpConfirmDisabled });
	};

	onSpeedUpCompleted = () => {
		this.setState({ speedUpIsOpen: false });
		this.existingGasPriceDecimal = null;
		this.speedUpTxId = null;
	};

	onCancelAction = (cancelAction, existingGasPriceDecimal, tx) => {
		this.existingGasPriceDecimal = existingGasPriceDecimal;
		this.cancelTxId = tx.id;
		const cancelConfirmDisabled = validateTransactionActionBalance(tx, CANCEL_RATE, this.props.accounts);
		this.setState({ cancelIsOpen: cancelAction, cancelConfirmDisabled });
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
			onPressItem={this.toggleDetailsView}
			selectedAddress={this.props.selectedAddress}
			tokens={this.props.tokens}
			collectibleContracts={this.props.collectibleContracts}
			contractExchangeRates={this.props.contractExchangeRates}
			exchangeRate={this.props.exchangeRate}
			conversionRate={this.props.conversionRate}
			currentCurrency={this.props.currentCurrency}
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
					style={baseStyles.flexGrow}
					scrollIndicatorInsets={{ right: 1 }}
				/>

				<TransactionActionModal
					isVisible={this.state.cancelIsOpen}
					confirmDisabled={cancelConfirmDisabled}
					onCancelPress={this.onCancelCompleted}
					onConfirmPress={this.cancelTransaction}
					confirmText={strings('transaction.lets_try')}
					confirmButtonMode={'confirm'}
					cancelText={strings('transaction.nevermind')}
					feeText={`${renderFromWei(Math.floor(this.existingGasPriceDecimal * CANCEL_RATE))} ${strings(
						'unit.eth'
					)}`}
					titleText={strings('transaction.cancel_tx_title')}
					gasTitleText={strings('transaction.gas_cancel_fee')}
					descriptionText={strings('transaction.cancel_tx_message')}
				/>

				<TransactionActionModal
					isVisible={this.state.speedUpIsOpen}
					confirmDisabled={speedUpConfirmDisabled}
					onCancelPress={this.onSpeedUpCompleted}
					onConfirmPress={this.speedUpTransaction}
					confirmText={strings('transaction.lets_try')}
					confirmButtonMode={'confirm'}
					cancelText={strings('transaction.nevermind')}
					feeText={`${renderFromWei(Math.floor(this.existingGasPriceDecimal * SPEED_UP_RATE))} ${strings(
						'unit.eth'
					)}`}
					titleText={strings('transaction.speedup_tx_title')}
					gasTitleText={strings('transaction.gas_speedup_fee')}
					descriptionText={strings('transaction.speedup_tx_message')}
				/>
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
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	thirdPartyApiMode: state.privacy.thirdPartyApiMode
});

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Transactions);
