import React, { Component } from 'react';
import { ScrollView, View, StyleSheet, Dimensions, InteractionManager } from 'react-native';
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

	scrollViewRef = React.createRef();

	adjustScroll = index => {
		InteractionManager.runAfterInteractions(() => {
			const { current } = this.scrollViewRef;
			const rowHeight = 100;
			const rows = index * rowHeight;
			const topPadding = Dimensions.get('window').height / 2 - 120;
			current.scrollTo({ y: rows + topPadding });
		});
	};

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
			<ScrollView style={styles.wrapper} ref={this.scrollViewRef}>
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
							adjustScroll={this.adjustScroll}
						/>
					</View>
				</View>
			</ScrollView>
		);
	}
}

const mapStateToProps = state => ({
	transactions: state.backgroundState.TransactionController.transactions,
	conversionRate: state.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.backgroundState.CurrencyRateController.currentCurrency
});

export default connect(mapStateToProps)(Asset);
