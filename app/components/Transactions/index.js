import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {
	ScrollView,
	ActivityIndicator,
	InteractionManager,
	RefreshControl,
	StyleSheet,
	Text,
	View,
	FlatList
} from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import TransactionElement from '../TransactionElement';
import Engine from '../../core/Engine';
import { hasBlockExplorer } from '../../util/networks';
import { showAlert } from '../../actions/alert';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	emptyContainer: {
		minHeight: 250,
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	text: {
		fontSize: 20,
		color: colors.fontTertiary,
		...fontStyles.normal
	}
});

/**
 * View that renders a list of transactions for a specific asset
 */
class Transactions extends Component {
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
		 * An array that represents the user tokens
		 */
		tokens: PropTypes.array,
		/**
		 * An array of transactions objects
		 */
		transactions: PropTypes.array,
		/**
		 * Callback function that will adjust the scroll
		 * position once the transaction detail is visible
		 */
		adjustScroll: PropTypes.func,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * String representing the selected the selected network
		 */
		networkType: PropTypes.string.isRequired,
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
		showAlert: PropTypes.func.isRequired
	};

	state = {
		selectedTx: null,
		ready: false,
		refreshing: false
	};

	componentDidMount() {
		this.mounted = true;
		InteractionManager.runAfterInteractions(() => {
			this.mounted && this.setState({ ready: true });
		});
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	toggleDetailsView = (hash, index) => {
		const show = this.state.selectedTx !== hash;

		this.setState({ selectedTx: show ? hash : null });
		if (show) {
			this.props.adjustScroll && this.props.adjustScroll(index);
		}
	};

	onRefresh = async () => {
		this.setState({ refreshing: true });
		await Engine.refreshTransactionHistory();
		this.setState({ refreshing: false });
	};

	renderLoader = () => (
		<View style={styles.emptyContainer}>
			<ActivityIndicator size="small" />
		</View>
	);

	renderEmpty = () => (
		<ScrollView refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}>
			<View style={styles.emptyContainer}>
				<Text style={styles.text}>{strings('wallet.no_transactions')}</Text>
			</View>
		</ScrollView>
	);

	keyExtractor = item => item.id;

	renderContent() {
		if (!this.state.ready) {
			return this.renderLoader();
		}

		const {
			selectedAddress,
			transactions,
			navigation,
			contractExchangeRates,
			conversionRate,
			currentCurrency,
			showAlert
		} = this.props;
		const tokens = this.props.tokens.reduce((tokens, token) => {
			tokens[token.address] = token;
			return tokens;
		}, {});

		if (!transactions.length) {
			return this.renderEmpty();
		}

		const blockExplorer = hasBlockExplorer(this.props.networkType);

		return (
			<FlatList
				data={transactions}
				extraData={this.state}
				keyExtractor={this.keyExtractor}
				refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
				// eslint-disable-next-line react/jsx-no-bind
				renderItem={({ item, index }) => (
					<TransactionElement
						tx={item}
						i={index}
						selectedAddress={selectedAddress}
						selected={this.state.selectedTx === item.transactionHash}
						toggleDetailsView={this.toggleDetailsView}
						navigation={navigation}
						blockExplorer={blockExplorer}
						tokens={tokens}
						contractExchangeRates={contractExchangeRates}
						conversionRate={conversionRate}
						currentCurrency={currentCurrency}
						showAlert={showAlert}
					/>
				)}
			/>
		);
	}

	render = () => (
		<View style={styles.wrapper}>
			<View testID={'transactions'}>{this.renderContent()}</View>
		</View>
	);
}

const mapStateToProps = state => ({
	tokens: state.engine.backgroundState.AssetsController.tokens,
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
