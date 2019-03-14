import React, { Component } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { toChecksumAddress } from 'ethereumjs-util';
import { colors } from '../../../styles/common';
import Transactions from '../../UI/Transactions';
import { getWalletNavbarOptions } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';
import Networks, { isKnownNetwork } from '../../../util/networks';
import { showAlert } from '../../../actions/alert';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	}
});

/**
 * Main view for the Transaction history
 */
class TransactionsView extends Component {
	static navigationOptions = ({ navigation }) => getWalletNavbarOptions('transactions_view.title', navigation);

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
		networkType: PropTypes.string
	};

	state = {
		showCollectible: false,
		transactionsUpdated: false
	};

	txs = [];
	txsPending = [];
	mounted = false;
	scrollableTabViewRef = React.createRef();

	async init() {
		this.mounted = true;
		this.normalizeTransactions();
	}

	componentDidMount() {
		InteractionManager.runAfterInteractions(() => {
			this.init();
		});
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	didTxStatusesChange = newTxsPending => this.txsPending.length !== newTxsPending.length;

	normalizeTransactions() {
		const { selectedAddress, networkType, transactions } = this.props;
		const networkId = Networks[networkType].networkId;
		if (transactions.length) {
			const txs = transactions.filter(
				tx =>
					((tx.transaction.from && toChecksumAddress(tx.transaction.from) === selectedAddress) ||
						(tx.transaction.to && toChecksumAddress(tx.transaction.to) === selectedAddress)) &&
					((networkId && networkId.toString() === tx.networkID) ||
						(networkType === 'rpc' && !isKnownNetwork(tx.networkID))) &&
					tx.status !== 'unapproved'
			);

			txs.sort((a, b) => (a.time > b.time ? -1 : b.time > a.time ? 1 : 0));
			const newPendingTxs = txs.filter(tx => tx.status === 'pending');
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

	render = () => {
		const { conversionRate, currentCurrency, selectedAddress, navigation, networkType } = this.props;

		return (
			<View style={styles.wrapper} testID={'wallet-screen'}>
				<Transactions
					navigation={navigation}
					tabLabel={strings('wallet.transactions')}
					transactions={this.txs}
					conversionRate={conversionRate}
					currentCurrency={currentCurrency}
					selectedAddress={selectedAddress}
					networkType={networkType}
					loading={!this.state.transactionsUpdated}
				/>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
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
