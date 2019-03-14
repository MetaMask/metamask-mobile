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
import { hasBlockExplorer, getNetworkTypeById } from '../../../util/networks';
import { showAlert } from '../../../actions/alert';
import { getEtherscanTransactionUrl } from '../../../util/etherscan';
import Logger from '../../../util/Logger';
import TransactionsNotificationManager from '../../../core/TransactionsNotificationManager';

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

const ROW_HEIGHT = (Platform.OS === 'ios' ? 95 : 100) + StyleSheet.hairlineWidth;

/**
 * View that renders a list of transactions for a specific asset
 */
class Transactions extends PureComponent {
	static propTypes = {
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
		 * Callback to adjust the scroll position
		 */
		adjustScroll: PropTypes.func,
		/**
		 * Loading flag from an external call
		 */
		loading: PropTypes.bool
	};

	state = {
		selectedTx: (new Map(): Map<string, boolean>),
		ready: false,
		refreshing: false
	};

	selectedTx = null;

	flatList = React.createRef();

	componentDidMount() {
		this.mounted = true;
		setTimeout(() => {
			this.mounted && this.setState({ ready: true });
			this.init();
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
		if (!this.scrolling && index) {
			this.scrolling = true;
			if (!this.props.adjustScroll) {
				this.flatList.current.scrollToIndex({ index, animated: true });
			} else {
				this.props.adjustScroll(index);
			}
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
				if (show && index) {
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
			<View style={styles.emptyContainer}>
				<Text style={styles.text}>{strings('wallet.no_transactions')}</Text>
			</View>
		</ScrollView>
	);

	getItemLayout = (data, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index });

	keyExtractor = item => item.id;

	viewOnEtherscan = (networkID, transactionHash) => {
		try {
			const network = getNetworkTypeById(networkID);
			const url = getEtherscanTransactionUrl(network, transactionHash);
			this.props.navigation.push('Webview', {
				url,
				title: 'etherscan.io'
			});
		} catch (e) {
			// eslint-disable-next-line no-console
			Logger.error(`can't get a block explorer link for network `, networkID, e);
		}
	};

	blockExplorer = () => hasBlockExplorer(this.props.networkType);

	renderItem = ({ item, index }) => (
		<TransactionElement
			tx={item}
			i={index}
			selectedAddress={this.props.selectedAddress}
			selected={!!this.state.selectedTx.get(item.id)}
			onPressItem={this.toggleDetailsView}
			blockExplorer
			tokens={this.props.tokens}
			collectibleContracts={this.props.collectibleContracts}
			contractExchangeRates={this.props.contractExchangeRates}
			conversionRate={this.props.conversionRate}
			currentCurrency={this.props.currentCurrency}
			showAlert={this.props.showAlert}
			viewOnEtherscan={this.viewOnEtherscan}
		/>
	);

	renderContent() {
		if (!this.state.ready || this.props.loading) {
			return this.renderLoader();
		}

		const { transactions } = this.props;

		if (!transactions.length) {
			return this.renderEmpty();
		}

		return (
			<FlatList
				ref={this.flatList}
				getItemLayout={this.getItemLayout}
				data={transactions}
				extraData={this.state}
				keyExtractor={this.keyExtractor}
				refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
				renderItem={this.renderItem}
			/>
		);
	}

	render = () => (
		<View testID={'transactions'} style={styles.wrapper}>
			{this.renderContent()}
		</View>
	);
}

const mapStateToProps = state => ({
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
