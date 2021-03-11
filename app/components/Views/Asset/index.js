import React, { PureComponent } from 'react';
import { ActivityIndicator, InteractionManager, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { colors } from '../../../styles/common';
import AssetOverview from '../../UI/AssetOverview';
import Transactions from '../../UI/Transactions';
import { getNetworkNavbarOptions } from '../../UI/Navbar';
import Engine from '../../../core/Engine';
import { safeToChecksumAddress } from '../../../util/address';
import { SWAPS_CONTRACT_ADDRESS } from '@estebanmino/controllers/dist/swaps/SwapsUtil';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	assetOverviewWrapper: {
		height: 280
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center'
	}
});

/**
 * View that displays a specific asset (Token or ETH)
 * including the overview (Amount, Balance, Symbol, Logo)
 * and also the transaction list
 */
class Asset extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to access the props
		/* passed by the parent component
		*/
		navigation: PropTypes.object,
		/**
		/* conversion rate of ETH - FIAT
		*/
		conversionRate: PropTypes.any,
		/**
		/* Selected currency
		*/
		currentCurrency: PropTypes.string,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * A string representing the network name
		 */
		chainId: PropTypes.string,
		/**
		 * An array that represents the user transactions
		 */
		transactions: PropTypes.array,
		/**
		 * Array of ERC20 assets
		 */
		tokens: PropTypes.array,
		/**
		 * Indicates whether third party API mode is enabled
		 */
		thirdPartyApiMode: PropTypes.bool,
		swapsTransactions: PropTypes.object
	};

	state = {
		refreshing: false,
		loading: false,
		transactionsUpdated: false,
		submittedTxs: [],
		confirmedTxs: [],
		transactions: []
	};

	txs = [];
	txsPending = [];
	isNormalizing = false;
	chainId = '';
	filter = undefined;
	navSymbol = undefined;
	navAddress = undefined;

	static navigationOptions = ({ navigation }) =>
		getNetworkNavbarOptions(navigation.getParam('symbol', ''), false, navigation);

	componentDidMount() {
		InteractionManager.runAfterInteractions(() => {
			this.normalizeTransactions();
			this.mounted = true;
		});
		this.navSymbol = this.props.navigation.getParam('symbol', '').toLowerCase();
		this.navAddress = this.props.navigation.getParam('address', '').toLowerCase();
		if (this.navSymbol.toUpperCase() !== 'ETH' && this.navAddress !== '') {
			this.filter = this.noEthFilter;
		} else {
			this.filter = this.ethFilter;
		}
	}

	componentDidUpdate(prevProps) {
		if (prevProps.chainId !== this.props.chainId || prevProps.selectedAddress !== this.props.selectedAddress) {
			this.showLoaderAndNormalize();
		} else {
			this.normalizeTransactions();
		}
	}

	showLoaderAndNormalize() {
		this.setState({ loading: true }, () => {
			this.normalizeTransactions();
		});
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	didTxStatusesChange = newTxsPending => this.txsPending.length !== newTxsPending.length;

	ethFilter = tx => {
		const { selectedAddress, chainId } = this.props;
		const {
			transaction: { from, to },
			isTransfer,
			transferInformation
		} = tx;

		const network = Engine.context.NetworkController.state.network;
		if (
			(safeToChecksumAddress(from) === selectedAddress || safeToChecksumAddress(to) === selectedAddress) &&
			(chainId === tx.chainId || (!tx.chainId && network === tx.networkID)) &&
			tx.status !== 'unapproved'
		) {
			if (isTransfer)
				return this.props.tokens.find(
					({ address }) => address.toLowerCase() === transferInformation.contractAddress.toLowerCase()
				);
			return true;
		}
		return false;
	};

	noEthFilter = tx => {
		const { chainId, swapsTransactions, selectedAddress } = this.props;
		const {
			transaction: { to, from },
			isTransfer,
			transferInformation
		} = tx;
		const network = Engine.context.NetworkController.state.network;
		if (
			(safeToChecksumAddress(from) === selectedAddress || safeToChecksumAddress(to) === selectedAddress) &&
			(chainId === tx.chainId || (!tx.chainId && network === tx.networkID)) &&
			tx.status !== 'unapproved'
		) {
			if (isTransfer) return this.navAddress === transferInformation.contractAddress.toLowerCase();
			if (
				swapsTransactions[tx.id] &&
				(to?.toLowerCase() === SWAPS_CONTRACT_ADDRESS || to?.toLowerCase() === this.navAddress)
			) {
				const { destinationToken, sourceToken } = swapsTransactions[tx.id];
				return destinationToken.address === this.navAddress || sourceToken.address === this.navAddress;
			}
		}
		return false;
	};

	normalizeTransactions() {
		if (this.isNormalizing) return;
		this.isNormalizing = true;
		let submittedTxs = [];
		const newPendingTxs = [];
		const confirmedTxs = [];
		const { chainId, transactions } = this.props;
		if (transactions.length) {
			const txs = transactions.filter(tx => {
				const filerResult = this.filter(tx);
				if (filerResult) {
					switch (tx.status) {
						case 'submitted':
						case 'signed':
						case 'unapproved':
							submittedTxs.push(tx);
							break;
						case 'pending':
							newPendingTxs.push(tx);
							break;
						case 'confirmed':
							confirmedTxs.push(tx);
							break;
					}
				}
				return filerResult;
			});

			txs.sort((a, b) => (a.time > b.time ? -1 : b.time > a.time ? 1 : 0));
			submittedTxs.sort((a, b) => (a.time > b.time ? -1 : b.time > a.time ? 1 : 0));
			confirmedTxs.sort((a, b) => (a.time > b.time ? -1 : b.time > a.time ? 1 : 0));

			const submittedNonces = [];
			submittedTxs = submittedTxs.filter(transaction => {
				const alreadySubmitted = submittedNonces.includes(transaction.transaction.nonce);
				submittedNonces.push(transaction.transaction.nonce);
				return !alreadySubmitted;
			});

			// To avoid extra re-renders we want to set the new txs only when
			// there's a new tx in the history or the status of one of the existing txs changed
			if (
				(this.txs.length === 0 && !this.state.transactionsUpdated) ||
				this.txs.length !== txs.length ||
				this.chainId !== chainId ||
				this.didTxStatusesChange(newPendingTxs)
			) {
				this.txs = txs;
				this.txsPending = newPendingTxs;
				this.setState({
					transactionsUpdated: true,
					loading: false,
					transactions: txs,
					submittedTxs,
					confirmedTxs
				});
			}
		} else if (!this.state.transactionsUpdated) {
			this.setState({ transactionsUpdated: true, loading: false });
		}
		this.isNormalizing = false;
		this.chainId = chainId;
	}

	renderLoader = () => (
		<View style={styles.loader}>
			<ActivityIndicator style={styles.loader} size="small" />
		</View>
	);

	onRefresh = async () => {
		this.setState({ refreshing: true });
		this.props.thirdPartyApiMode && (await Engine.refreshTransactionHistory());
		this.setState({ refreshing: false });
	};

	render = () => {
		const { loading, transactions, submittedTxs, confirmedTxs, transactionsUpdated } = this.state;
		const {
			navigation: {
				state: { params }
			},
			navigation,
			conversionRate,
			currentCurrency,
			selectedAddress,
			chainId
		} = this.props;

		return (
			<View style={styles.wrapper}>
				{loading ? (
					this.renderLoader()
				) : (
					<Transactions
						header={
							<View style={styles.assetOverviewWrapper}>
								<AssetOverview navigation={navigation} asset={navigation && params} />
							</View>
						}
						assetSymbol={navigation && params.symbol}
						navigation={navigation}
						transactions={transactions}
						submittedTransactions={submittedTxs}
						confirmedTransactions={confirmedTxs}
						selectedAddress={selectedAddress}
						conversionRate={conversionRate}
						currentCurrency={currentCurrency}
						networkType={chainId}
						loading={!transactionsUpdated}
						headerHeight={280}
					/>
				)}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	swapsTransactions: state.engine.backgroundState.TransactionController.swapsTransactions || {},
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	tokens: state.engine.backgroundState.AssetsController.tokens,
	transactions: state.engine.backgroundState.TransactionController.transactions,
	thirdPartyApiMode: state.privacy.thirdPartyApiMode
});

export default connect(mapStateToProps)(Asset);
