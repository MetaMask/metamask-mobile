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
	InteractionManager,
	TouchableOpacity
} from 'react-native';
import { getNetworkTypeById, findBlockExplorerForRpc, getBlockExplorerName } from '../../../util/networks';
import { getEtherscanAddressUrl, getEtherscanBaseUrl } from '../../../util/etherscan';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import TransactionElement from '../TransactionElement';
import Engine from '../../../core/Engine';
import { showAlert } from '../../../actions/alert';
import NotificationManager from '../../../core/NotificationManager';
import { CANCEL_RATE, SPEED_UP_RATE } from '@metamask/controllers';
import { renderFromWei } from '../../../util/number';
import Device from '../../../util/Device';
import { RPC, NO_RPC_BLOCK_EXPLORER } from '../../../constants/network';
import TransactionActionModal from '../TransactionActionModal';
import Logger from '../../../util/Logger';
import { parseTransactionEIP1559, validateTransactionActionBalance } from '../../../util/transactions';
import BigNumber from 'bignumber.js';

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
	viewMoreBody: {
		marginBottom: 36,
		marginTop: 24
	},
	viewOnEtherscan: {
		fontSize: 16,
		color: colors.blue,
		...fontStyles.normal,
		textAlign: 'center'
	}
});

const ROW_HEIGHT = (Device.isIos() ? 95 : 100) + StyleSheet.hairlineWidth;

/**
 * View that renders a list of transactions for a specific asset
 */
class Transactions extends PureComponent {
	static propTypes = {
		assetSymbol: PropTypes.string,
		/**
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object,
		/**
		 * Callback to close the view
		 */
		close: PropTypes.func,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		contractExchangeRates: PropTypes.object,
		/**
		 * Frequent RPC list from PreferencesController
		 */
		frequentRpcList: PropTypes.array,
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * Object representing the selected the selected network
		 */
		network: PropTypes.object,
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
		thirdPartyApiMode: PropTypes.bool,
		/**
		 * The network native currency
		 */
		nativeCurrency: PropTypes.string
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
		speedUpConfirmDisabled: false,
		rpcBlockExplorer: undefined
	};

	existingGas = null;
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

		const {
			network: {
				provider: { rpcTarget, type }
			},
			frequentRpcList
		} = this.props;
		let blockExplorer;
		if (type === RPC) {
			blockExplorer = findBlockExplorerForRpc(rpcTarget, frequentRpcList) || NO_RPC_BLOCK_EXPLORER;
		}
		this.setState({ rpcBlockExplorer: blockExplorer });
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
			// eslint-disable-next-line no-unused-expressions
			this.flatList?.current?.scrollToIndex({ index, animated: true });
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
		<ScrollView
			contentContainerStyle={styles.emptyContainer}
			refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
		>
			{this.props.header ? this.props.header : null}
			<View style={styles.emptyContainer}>
				<Text style={styles.text}>{strings('wallet.no_transactions')}</Text>
			</View>
		</ScrollView>
	);

	viewOnBlockExplore = () => {
		const {
			navigation,
			network: {
				network,
				provider: { type }
			},
			selectedAddress,
			close
		} = this.props;
		const { rpcBlockExplorer } = this.state;
		try {
			let url;
			let title;
			if (type === RPC) {
				url = `${rpcBlockExplorer}/address/${selectedAddress}`;
				title = new URL(rpcBlockExplorer).hostname;
			} else {
				const networkResult = getNetworkTypeById(network);
				url = getEtherscanAddressUrl(networkResult, selectedAddress);
				title = getEtherscanBaseUrl(networkResult).replace('https://', '');
			}
			navigation.push('Webview', {
				screen: 'SimpleWebview',
				params: {
					url,
					title
				}
			});
			close && close();
		} catch (e) {
			// eslint-disable-next-line no-console
			Logger.error(e, { message: `can't get a block explorer link for network `, network });
		}
	};

	renderViewMore = () => (
		<View style={styles.viewMoreBody}>
			<TouchableOpacity onPress={this.viewOnBlockExplore} style={styles.touchableViewOnEtherscan}>
				<Text reset style={styles.viewOnEtherscan}>
					{(this.state.rpcBlockExplorer &&
						`${strings('transactions.view_on')} ${getBlockExplorerName(this.state.rpcBlockExplorer)}`) ||
						strings('transactions.view_on_etherscan')}
				</Text>
			</TouchableOpacity>
		</View>
	);

	getItemLayout = (data, index) => ({
		length: ROW_HEIGHT,
		offset: this.props.headerHeight + ROW_HEIGHT * index,
		index
	});

	keyExtractor = item => item.id.toString();

	onSpeedUpAction = (speedUpAction, existingGas, tx) => {
		this.setState({ speedUpIsOpen: speedUpAction });
		this.existingGas = existingGas;
		this.speedUpTxId = tx.id;
		const speedUpConfirmDisabled = validateTransactionActionBalance(tx, SPEED_UP_RATE, this.props.accounts);
		this.setState({ speedUpIsOpen: speedUpAction, speedUpConfirmDisabled });
	};

	onSpeedUpCompleted = () => {
		this.setState({ speedUpIsOpen: false });
		this.existingGas = null;
		this.speedUpTxId = null;
	};

	onCancelAction = (cancelAction, existingGas, tx) => {
		this.existingGas = existingGas;
		this.cancelTxId = tx.id;
		const cancelConfirmDisabled = validateTransactionActionBalance(tx, CANCEL_RATE, this.props.accounts);
		this.setState({ cancelIsOpen: cancelAction, cancelConfirmDisabled });
	};
	onCancelCompleted = () => {
		this.setState({ cancelIsOpen: false });
		this.existingGas = null;
		this.cancelTxId = null;
	};

	speedUpTransaction = () => {
		try {
			Engine.context.TransactionController.speedUpTransaction(this.speedUpTxId);
		} catch (e) {
			// ignore because transaction already went through
		}
		this.onSpeedUpCompleted();
	};

	cancelTransaction = () => {
		try {
			Engine.context.TransactionController.stopTransaction(this.cancelTxId);
		} catch (e) {
			// ignore because transaction already went through
		}
		this.onCancelCompleted();
	};

	renderItem = ({ item, index }) => (
		<TransactionElement
			tx={item}
			i={index}
			assetSymbol={this.props.assetSymbol}
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
		const {
			submittedTransactions,
			confirmedTransactions,
			header,
			currentCurrency,
			conversionRate,
			nativeCurrency
		} = this.props;
		const { cancelConfirmDisabled, speedUpConfirmDisabled } = this.state;
		const transactions =
			submittedTransactions && submittedTransactions.length
				? submittedTransactions.concat(confirmedTransactions)
				: this.props.transactions;

		const renderSpeedUpGas = () => {
			if (!this.existingGas) return null;
			if (this.existingGas.isEIP1559Transaction) {
				const newDecMaxFeePerGas = new BigNumber(this.existingGas.maxFeePerGas).times(
					new BigNumber(SPEED_UP_RATE)
				);
				const newDecMaxPriorityFeePerGas = new BigNumber(this.existingGas.maxPriorityFeePerGas).times(
					new BigNumber(SPEED_UP_RATE)
				);
				const gasEIP1559 = parseTransactionEIP1559(
					{
						currentCurrency,
						conversionRate,
						nativeCurrency,
						selectedGasFee: {
							suggestedMaxFeePerGas: newDecMaxFeePerGas,
							suggestedMaxPriorityFeePerGas: newDecMaxPriorityFeePerGas,
							suggestedGasLimit: '1'
						}
					},
					{ onlyGas: true }
				);

				return `Max fee\n ${gasEIP1559.renderableMaxFeePerGasNative} \n\n Max priority fee\n ${
					gasEIP1559.renderableMaxPriorityFeeNative
				}`;
			}
			return `${renderFromWei(Math.floor(this.existingGas.gasPrice * SPEED_UP_RATE))} ${strings('unit.eth')}`;
		};

		const renderCancelGas = () => {
			if (!this.existingGas) return null;
			if (this.existingGas.isEIP1559Transaction) {
				const newDecMaxFeePerGas = new BigNumber(this.existingGas.maxFeePerGas).times(
					new BigNumber(CANCEL_RATE)
				);
				const newDecMaxPriorityFeePerGas = new BigNumber(this.existingGas.maxPriorityFeePerGas).times(
					new BigNumber(CANCEL_RATE)
				);
				const gasEIP1559 = parseTransactionEIP1559(
					{
						currentCurrency,
						conversionRate,
						nativeCurrency,
						selectedGasFee: {
							suggestedMaxFeePerGas: newDecMaxFeePerGas,
							suggestedMaxPriorityFeePerGas: newDecMaxPriorityFeePerGas,
							suggestedGasLimit: '1'
						}
					},
					{ onlyGas: true }
				);

				return `Max fee per gas\n ${gasEIP1559.renderableMaxFeePerGasNative} \n\n Max priority fee per gas\n ${
					gasEIP1559.renderableMaxPriorityFeeNative
				}`;
			}
			return `${renderFromWei(Math.floor(this.existingGas.gasPrice * CANCEL_RATE))} ${strings('unit.eth')}`;
		};

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
					ListFooterComponent={this.renderViewMore}
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
					feeText={renderCancelGas()}
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
					feeText={renderSpeedUpGas()}
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
	collectibleContracts: state.engine.backgroundState.CollectiblesController.collectibleContracts,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	thirdPartyApiMode: state.privacy.thirdPartyApiMode,
	frequentRpcList: state.engine.backgroundState.PreferencesController.frequentRpcList,
	network: state.engine.backgroundState.NetworkController,
	tokens: state.engine.backgroundState.TokensController.tokens.reduce((tokens, token) => {
		tokens[token.address] = token;
		return tokens;
	}, {}),
	nativeCurrency: state.engine.backgroundState.CurrencyRateController.nativeCurrency
});

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Transactions);
