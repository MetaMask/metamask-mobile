import React, { PureComponent } from 'react';
import { ActivityIndicator, InteractionManager, StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { colors } from '../../../styles/common';
import Transactions from '../../UI/Transactions';
import getNavbarOptions from '../../UI/Navbar';
import Networks, { isKnownNetwork } from '../../../util/networks';
import { showAlert } from '../../../actions/alert';
import { safeToChecksumAddress } from '../../../util/address';
import Engine from '../../../core/Engine';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center'
	}
});

/**
 * Main view for the Transaction history
 */
class TransactionsView extends PureComponent {
	static navigationOptions = ({ navigation }) => getNavbarOptions('transactions_view.title', navigation);

	static propTypes = {
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * An array that represents the user transactions
		 */
		transactions: PropTypes.array,
		/**
		 * A string represeting the network name
		 */
		networkType: PropTypes.string,
		/**
		 * Array of ERC20 assets
		 */
		tokens: PropTypes.array
	};

	state = {
		transactionsUpdated: false,
		submittedTxs: [],
		confirmedTxs: [],
		loading: false
	};

	txs = [];
	txsPending = [];
	mounted = false;
	isNormalizing = false;
	scrollableTabViewRef = React.createRef();
	flatlistRef = null;

	async init() {
		this.mounted = true;
		this.normalizeTransactions();
	}

	componentDidMount() {
		InteractionManager.runAfterInteractions(() => {
			this.init();
		});
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
				(networkType === 'rpc' && !isKnownNetwork(tx.networkID))) &&
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
				return this.ethFilter(tx);
			});

			txs.sort((a, b) => (a.time > b.time ? -1 : b.time > a.time ? 1 : 0));
			submittedTxs.sort((a, b) => (a.time > b.time ? -1 : b.time > a.time ? 1 : 0));
			confirmedTxs.sort((a, b) => (a.time > b.time ? -1 : b.time > a.time ? 1 : 0));

			const submittedNonces = [];
			submittedTxs = submittedTxs.filter(transaction => {
				const alreadyConfirmed = confirmedTxs.find(
					tx => tx.transaction.nonce === transaction.transaction.nonce
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

	storeRef = ref => {
		this.flatlistRef = ref;
	};

	render = () => {
		const { conversionRate, currentCurrency, selectedAddress, navigation, networkType } = this.props;

		return (
			<View style={styles.wrapper} testID={'wallet-screen'}>
				{this.state.loading ? (
					this.renderLoader()
				) : (
					<Transactions
						navigation={navigation}
						transactions={this.txs}
						submittedTransactions={this.state.submittedTxs}
						confirmedTransactions={this.state.confirmedTxs}
						conversionRate={conversionRate}
						currentCurrency={currentCurrency}
						selectedAddress={selectedAddress}
						networkType={networkType}
						loading={!this.state.transactionsUpdated}
						onRefSet={this.storeRef}
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
	tokens: state.engine.backgroundState.AssetsController.tokens,
	transactions: state.engine.backgroundState.TransactionController.transactions,
	networkType: state.engine.backgroundState.NetworkController.provider.type
});

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(TransactionsView);
