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

export default class Asset extends Component {
	static propTypes = {
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
		return (
			<ScrollView style={styles.wrapper}>
				<View style={styles.assetOverviewWrapper}>
					<AssetOverview asset={this.props.navigation.state.params} />
				</View>
				<View>
					<Transactions />
				</View>
			</ScrollView>
		);
	}
}
