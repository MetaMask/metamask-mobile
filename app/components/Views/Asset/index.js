import React, { PureComponent } from 'react';
import { ActivityIndicator, InteractionManager, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { swapsUtils } from '@metamask/swaps-controller/';

import { colors } from '../../../styles/common';
import AssetOverview from '../../UI/AssetOverview';
import Transactions from '../../UI/Transactions';
import { getNetworkNavbarOptions } from '../../UI/Navbar';
import Engine from '../../../core/Engine';
import { safeToChecksumAddress } from '../../../util/address';
import { addAccountTimeFlagFilter } from '../../../util/transactions';
import { toLowerCaseEquals } from '../../../util/general';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
	assetOverviewWrapper: {
		height: 280,
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
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
		/* Identities object required to get account name
		*/
		identities: PropTypes.object,
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
		swapsTransactions: PropTypes.object,
		/**
		 * Object that represents the current route info like params passed to it
		 */
		route: PropTypes.object,
	};

	state = {
		refreshing: false,
		loading: false,
		transactionsUpdated: false,
		submittedTxs: [],
		confirmedTxs: [],
		transactions: [],
	};

	txs = [];
	txsPending = [];
	isNormalizing = false;
	chainId = '';
	filter = undefined;
	navSymbol = undefined;
	navAddress = undefined;

	static navigationOptions = ({ navigation, route }) =>
		getNetworkNavbarOptions(route.params?.symbol ?? '', false, navigation);

	componentDidMount() {
		InteractionManager.runAfterInteractions(() => {
			this.normalizeTransactions();
			this.mounted = true;
		});
		this.navSymbol = (this.props.route.params?.symbol ?? '').toLowerCase();
		this.navAddress = (this.props.route.params?.address ?? '').toLowerCase();
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

	didTxStatusesChange = (newTxsPending) => this.txsPending.length !== newTxsPending.length;

	ethFilter = (tx) => {
		const { selectedAddress, chainId } = this.props;
		const {
			transaction: { from, to },
			isTransfer,
			transferInformation,
		} = tx;

		const network = Engine.context.NetworkController.state.network;
		if (
			(safeToChecksumAddress(from) === selectedAddress || safeToChecksumAddress(to) === selectedAddress) &&
			(chainId === tx.chainId || (!tx.chainId && network === tx.networkID)) &&
			tx.status !== 'unapproved'
		) {
			if (isTransfer)
				return this.props.tokens.find(({ address }) =>
					toLowerCaseEquals(address, transferInformation.contractAddress)
				);
			return true;
		}
		return false;
	};

	noEthFilter = (tx) => {
		const { chainId, swapsTransactions, selectedAddress } = this.props;
		const {
			transaction: { to, from },
			isTransfer,
			transferInformation,
		} = tx;
		const network = Engine.context.NetworkController.state.network;
		if (
			(safeToChecksumAddress(from) === selectedAddress || safeToChecksumAddress(to) === selectedAddress) &&
			(chainId === tx.chainId || (!tx.chainId && network === tx.networkID)) &&
			tx.status !== 'unapproved'
		) {
			if (to?.toLowerCase() === this.navAddress) return true;
			if (isTransfer) return this.navAddress === transferInformation.contractAddress.toLowerCase();
			if (
				swapsTransactions[tx.id] &&
				(to?.toLowerCase() === swapsUtils.getSwapsContractAddress(chainId) ||
					to?.toLowerCase() === this.navAddress)
			) {
				const { destinationToken, sourceToken } = swapsTransactions[tx.id];
				return destinationToken.address === this.navAddress || sourceToken.address === this.navAddress;
			}
		}
		return false;
	};

	normalizeTransactions() {
		if (this.isNormalizing) return;
		let accountAddedTimeInsertPointFound = false;
		const { selectedAddress } = this.props;
		const addedAccountTime = this.props.identities[selectedAddress]?.importTime;
		this.isNormalizing = true;
		let submittedTxs = [];
		const newPendingTxs = [];
		const confirmedTxs = [];
		const { chainId, transactions } = this.props;
		if (transactions.length) {
			transactions.sort((a, b) => (a.time > b.time ? -1 : b.time > a.time ? 1 : 0));
			const txs = transactions.filter((tx) => {
				const filterResult = this.filter(tx);
				if (filterResult) {
					tx.insertImportTime = addAccountTimeFlagFilter(
						tx,
						addedAccountTime,
						accountAddedTimeInsertPointFound
					);
					if (tx.insertImportTime) accountAddedTimeInsertPointFound = true;
					switch (tx.status) {
						case 'submitted':
						case 'signed':
						case 'unapproved':
							submittedTxs.push(tx);
							return false;
						case 'pending':
							newPendingTxs.push(tx);
							break;
						case 'confirmed':
							confirmedTxs.push(tx);
							break;
					}
				}
				return filterResult;
			});

			const submittedNonces = [];
			submittedTxs = submittedTxs.filter((transaction) => {
				const alreadySubmitted = submittedNonces.includes(transaction.transaction.nonce);
				const alreadyConfirmed = confirmedTxs.find(
					(tx) =>
						safeToChecksumAddress(tx.transaction.from) === selectedAddress &&
						tx.transaction.nonce === transaction.transaction.nonce
				);
				if (alreadyConfirmed) {
					return false;
				}
				submittedNonces.push(transaction.transaction.nonce);
				return !alreadySubmitted;
			});

			//if the account added insertpoint is not found add it to the last transaction
			if (!accountAddedTimeInsertPointFound && txs && txs.length) {
				txs[txs.length - 1].insertImportTime = true;
			}
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
					confirmedTxs,
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
			route: { params },
			navigation,
			conversionRate,
			currentCurrency,
			selectedAddress,
			chainId,
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

const mapStateToProps = (state) => ({
	swapsTransactions: state.engine.backgroundState.TransactionController.swapsTransactions || {},
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	tokens: state.engine.backgroundState.TokensController.tokens,
	transactions: state.engine.backgroundState.TransactionController.transactions,
	thirdPartyApiMode: state.privacy.thirdPartyApiMode,
});

export default connect(mapStateToProps)(Asset);
