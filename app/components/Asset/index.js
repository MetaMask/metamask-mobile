import React, { Component } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
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

export default class Asset extends Component {
	static propTypes = {
		/**
		/* navigation object required to access the props
		/* passed by the parent component
		*/
		navigation: PropTypes.object
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
			navigation
		} = this.props;
		return (
			<ScrollView style={styles.wrapper}>
				<View style={styles.assetOverviewWrapper}>
					<AssetOverview asset={navigation && params} />
				</View>
				<View>
					<Transactions />
				</View>
			</ScrollView>
		);
	}
}
