import React, { Component } from 'react';
import { RefreshControl, ScrollView, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { colors } from '../../styles/common';
import { getNavigationOptionsTitle } from '../Navbar';
import Engine from '../../core/Engine';
import Collectibles from '../Collectibles';
import CollectibleContractOverview from '../CollectibleContractOverview';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	}
});

const TRANSACTION_ROW_HEIGHT = 90 + StyleSheet.hairlineWidth;
const ASSET_OVERVIEW_HEIGHT = 280;

/**
 * View that displays a specific collectible
 * including the overview (name, address, symbol, logo, description, total supply)
 * and also individual collectibles list
 */
export default class Collectible extends Component {
	static propTypes = {
		/**
		/* navigation object required to access the props
		/* passed by the parent component
		*/
		navigation: PropTypes.object
	};

	state = {
		refreshing: false
	};

	static navigationOptions = ({ navigation }) => getNavigationOptionsTitle(navigation.getParam('symbol', ''));

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
			navigation
		} = this.props;

		const collectibles = params.collectibles;
		const collectibleContract = params.collectibleContract;
		return (
			<ScrollView
				refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
				style={styles.wrapper}
				ref={this.scrollViewRef}
			>
				<View testID={'asset'}>
					<View style={styles.assetOverviewWrapper}>
						<CollectibleContractOverview
							navigation={navigation}
							collectibleContract={collectibleContract}
						/>
					</View>
					<View style={styles.wrapper}>
						<Collectibles navigation={navigation} collectibles={collectibles} />
					</View>
				</View>
			</ScrollView>
		);
	};
}
