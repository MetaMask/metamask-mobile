import React, { Component } from 'react';
import { InteractionManager, RefreshControl, ScrollView, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { toChecksumAddress } from 'ethereumjs-util';
import Networks, { isKnownNetwork } from '../../../util/networks';
import { connect } from 'react-redux';
import { colors } from '../../../styles/common';
import AssetOverview from '../../UI/AssetOverview';
import Transactions from '../../UI/Transactions';
import { getNetworkNavbarOptions } from '../../UI/Navbar';
import Engine from '../../../core/Engine';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	assetOverviewWrapper: {
		height: 280
	}
});

const TRANSACTION_ROW_HEIGHT = 90 + StyleSheet.hairlineWidth;
const ASSET_OVERVIEW_HEIGHT = 280;

/**
 * View that displays a specific asset (Token or ETH)
 * including the overview (Amount, Balance, Symbol, Logo)
 * and also the transaction list
 */
class Asset extends Component {
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
		transactions: PropTypes.array
	};

	state = {
		refreshing: false,
		transactionsUpdated: false
	};

	txs = [];
	txsPending = [];

	static navigationOptions = ({ navigation }) =>
		getNetworkNavbarOptions(navigation.getParam('symbol', ''), false, navigation);

	scrollViewRef = React.createRef();

	componentDidMount() {
		InteractionManager.runAfterInteractions(() => {
			this.normalizeTransactions();
		});
	}

	componentDidUpdate() {
		this.normalizeTransactions();
	}

	adjustScroll = index => {
		const { current } = this.scrollViewRef;
		const rowHeight = TRANSACTION_ROW_HEIGHT;
		const rows = index * rowHeight;
		current.scrollTo({ y: rows + ASSET_OVERVIEW_HEIGHT });
	};

	didTxStatusesChange = newTxsPending => this.txsPending.length !== newTxsPending.length;

	normalizeTransactions() {
		const { selectedAddress, networkType, transactions } = this.props;
		const networkId = Networks[networkType].networkId;
		if (transactions.length) {
			let txs = transactions.filter(
				tx =>
					((tx.transaction.from && toChecksumAddress(tx.transaction.from) === selectedAddress) ||
						(tx.transaction.to && toChecksumAddress(tx.transaction.to) === selectedAddress)) &&
					((networkId && networkId.toString() === tx.networkID) ||
						(networkType === 'rpc' && !isKnownNetwork(tx.networkID))) &&
					tx.status !== 'unapproved'
			);

			txs.sort((a, b) => (a.time > b.time ? -1 : b.time > a.time ? 1 : 0));
			const newPendingTxs = txs.filter(tx => tx.status === 'pending');

			const symbol = this.props.navigation.getParam('symbol', '');
			const tokenAddress = this.props.navigation.getParam('address', '');
			if (symbol.toUpperCase() !== 'ETH' && tokenAddress !== '') {
				txs = txs.filter(
					tx =>
						tx.transaction.from.toLowerCase() === tokenAddress.toLowerCase() ||
						tx.transaction.to.toLowerCase() === tokenAddress.toLowerCase()
				);
			}

			// To avoid extra re-renders we want to set the new txs only when
			// there's a new tx in the history or the status of one of the existing txs changed
			if (
				(this.txs.length === 0 && !this.state.transactionsUpdated) ||
				this.txs.length !== txs.length ||
				this.didTxStatusesChange(newPendingTxs)
			) {
				this.txs = txs;
				this.txsPending = newPendingTxs;
				this.setState({ transactionsUpdated: true });
			}
		} else if (!this.state.transactionsUpdated) {
			this.setState({ transactionsUpdated: true });
		}
	}

	onRefresh = async () => {
		this.setState({ refreshing: true });
		await Engine.refreshTransactionHistory();
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
			<ScrollView
				refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
				style={styles.wrapper}
				ref={this.scrollViewRef}
			>
				<View testID={'asset'}>
					<View style={styles.assetOverviewWrapper}>
						<AssetOverview navigation={navigation} asset={navigation && params} />
					</View>
					<View style={styles.wrapper}>
						<Transactions
							navigation={navigation}
							transactions={this.txs}
							selectedAddress={selectedAddress}
							conversionRate={conversionRate}
							currentCurrency={currentCurrency}
							networkType={networkType}
							adjustScroll={this.adjustScroll}
							loading={!this.state.transactionsUpdated}
						/>
					</View>
				</View>
			</ScrollView>
		);
	};
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	networkType: state.engine.backgroundState.NetworkController.provider.type,
	transactions: state.engine.backgroundState.TransactionController.transactions
});

export default connect(mapStateToProps)(Asset);
