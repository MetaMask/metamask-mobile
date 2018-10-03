import React, { Component } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../styles/common';
import AssetOverview from '../AssetOverview';
import Transactions from '../Transactions';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.slate,
		flex: 1
	},
	assetOverviewWrapper: {
		height: 280
	}
});

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
		/* Array of transactions
		*/
		transactions: PropTypes.array,
		/**
		/* conversion rate of ETH - FIAT
		*/
		conversionRate: PropTypes.any,
		/**
		/* Selected currency
		*/
		currentCurrency: PropTypes.string
	};

	static navigationOptions = ({ navigation }) => ({
		title: `${navigation.getParam('name', '')} (${navigation.getParam('symbol', '')})`,
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	});

	render() {
		const {
			navigation: {
				state: { params }
			},
			navigation,
			transactions,
			conversionRate,
			currentCurrency
		} = this.props;
		return (
			<ScrollView style={styles.wrapper}>
				<View testID={'asset'}>
					<View style={styles.assetOverviewWrapper}>
						<AssetOverview asset={navigation && params} />
					</View>
					<View>
						<Transactions
							navigation={navigation}
							transactions={transactions}
							conversionRate={conversionRate}
							currentCurrency={currentCurrency}
						/>
					</View>
				</View>
			</ScrollView>
		);
	}
}

const mapStateToProps = state => ({
	transactions: state.backgroundState.TransactionController.transactions.transactions,
	conversionRate: state.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.backgroundState.CurrencyRateController.currentCurrency
});

export default connect(mapStateToProps)(Asset);
