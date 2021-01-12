import React, { PureComponent } from 'react';
import { ActivityIndicator, InteractionManager, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import Networks, { isKnownNetwork } from '../../../util/networks';
import { connect } from 'react-redux';
import { colors } from '../../../styles/common';
import AssetOverview from '../../UI/AssetOverview';
import Transactions from '../../UI/Transactions';
import { getNetworkNavbarOptions } from '../../UI/Navbar';
import Engine from '../../../core/Engine';
import { safeToChecksumAddress } from '../../../util/address';
import { RPC } from '../../../constants/network';

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
		networkType: PropTypes.string,
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
		thirdPartyApiMode: PropTypes.bool
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
	networkType = '';
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
		if (
			prevProps.networkType !== this.props.networkType ||
			prevProps.selectedAddress !== this.props.selectedAddress
		) {
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
		const { selectedAddress, networkType } = this.props;
		const networkId = Networks[networkType].networkId;
		const {
			transaction: { from, to },
			isTransfer,
			transferInformation
		} = tx;
		if (isTransfer)
			return this.props.tokens.find(
				({ address }) => address.toLowerCase() === transferInformation.contractAddress.toLowerCase()
			);
		return (
			(safeToChecksumAddress(from) === selectedAddress || safeToChecksumAddress(to) === selectedAddress) &&
			((networkId && networkId.toString() === tx.networkID) ||
				(networkType === RPC && !isKnownNetwork(tx.networkID))) &&
			tx.status !== 'unapproved'
		);
	};

	noEthFilter = tx => {
		const { networkType } = this.props;
		const networkId = Networks[networkType].networkId;
		const {
			transaction: { to, from },
			isTransfer,
			transferInformation
		} = tx;
		if (isTransfer) return this.navAddress === transferInformation.contractAddress.toLowerCase();
		return (
			(from & (from.toLowerCase() === this.navAddress) || (to && to.toLowerCase() === this.navAddress)) &&
			((networkId && networkId.toString() === tx.networkID) ||
				(networkType === RPC && !isKnownNetwork(tx.networkID))) &&
			tx.status !== 'unapproved'
		);
	};

	normalizeTransactions() {
		if (this.isNormalizing) return;
		this.isNormalizing = true;
		let submittedTxs = [];
		const newPendingTxs = [];
		const confirmedTxs = [];
		const { networkType, transactions } = this.props;
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
				const alreadyConfirmed = confirmedTxs.find(
					tx =>
						tx.transaction.nonce === transaction.transaction.nonce &&
						tx.transaction.from === this.props.selectedAddress.toLowerCase()
				);
				if (alreadyConfirmed) {
					InteractionManager.runAfterInteractions(() => {
						Engine.context.TransactionController.cancelTransaction(transaction.id);
					});
					return false;
				}
				const alreadySubmitted = submittedNonces.includes(transaction.transaction.nonce);
				submittedNonces.push(transaction.transaction.nonce);
				return !alreadySubmitted;
			});

			// To avoid extra re-renders we want to set the new txs only when
			// there's a new tx in the history or the status of one of the existing txs changed
			if (
				(this.txs.length === 0 && !this.state.transactionsUpdated) ||
				this.txs.length !== txs.length ||
				this.networkType !== networkType ||
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
		this.networkType = networkType;
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
		const {
			navigation: {
				state: { params }
			},
			navigation,
			conversionRate,
			currentCurrency,
			selectedAddress,
			networkType
		} = this.props;

		return (
			<View style={styles.wrapper}>
				{this.state.loading ? (
					this.renderLoader()
				) : (
					<Transactions
						header={
							<View style={styles.assetOverviewWrapper}>
								<AssetOverview navigation={navigation} asset={navigation && params} />
							</View>
						}
						navigation={navigation}
						transactions={this.state.transactions}
						submittedTransactions={this.state.submittedTxs}
						confirmedTransactions={this.state.confirmedTxs}
						selectedAddress={selectedAddress}
						conversionRate={conversionRate}
						currentCurrency={currentCurrency}
						networkType={networkType}
						loading={!this.state.transactionsUpdated}
						headerHeight={280}
					/>
				)}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	networkType: state.engine.backgroundState.NetworkController.provider.type,
	tokens: state.engine.backgroundState.AssetsController.tokens,
	transactions: state.engine.backgroundState.TransactionController.transactions,
	thirdPartyApiMode: state.privacy.thirdPartyApiMode
});

export default connect(mapStateToProps)(Asset);
