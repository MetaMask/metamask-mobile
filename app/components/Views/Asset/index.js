import React, { Component } from 'react';
import { RefreshControl, ScrollView, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
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
		networkType: PropTypes.string
	};

	state = {
		refreshing: false
	};

	static navigationOptions = ({ navigation }) =>
		getNetworkNavbarOptions(navigation.getParam('symbol', ''), navigation);

	scrollViewRef = React.createRef();

	adjustScroll = index => {
		const { current } = this.scrollViewRef;
		const rowHeight = TRANSACTION_ROW_HEIGHT;
		const rows = index * rowHeight;
		current.scrollTo({ y: rows + ASSET_OVERVIEW_HEIGHT });
	};

	getFilteredTxs(transactions) {
		const symbol = this.props.navigation.getParam('symbol', '');
		const tokenAddress = this.props.navigation.getParam('address', '');
		if (symbol.toUpperCase() !== 'ETH' && tokenAddress !== '') {
			const filteredTxs = transactions.filter(
				tx =>
					tx.transaction.from.toLowerCase() === tokenAddress.toLowerCase() ||
					tx.transaction.to.toLowerCase() === tokenAddress.toLowerCase()
			);
			return filteredTxs;
		}
		return transactions;
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

		const filteredTxs = this.getFilteredTxs((params && params.transactions) || []);

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
							transactions={filteredTxs}
							selectedAddress={selectedAddress}
							conversionRate={conversionRate}
							currentCurrency={currentCurrency}
							networkType={networkType}
							adjustScroll={this.adjustScroll}
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
	networkType: state.engine.backgroundState.NetworkController.provider.type
});

export default connect(mapStateToProps)(Asset);
