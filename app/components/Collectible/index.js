import React, { Component } from 'react';
import { RefreshControl, ScrollView, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { colors } from '../../styles/common';
import { getNavigationOptionsTitle } from '../Navbar';
import { connect } from 'react-redux';
import Collectibles from '../Collectibles';
import CollectibleContractOverview from '../CollectibleContractOverview';
import Engine from '../../core/Engine';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	}
});

/**
 * View that displays a specific collectible
 * including the overview (name, address, symbol, logo, description, total supply)
 * and also individual collectibles list
 */
class Collectible extends Component {
	static propTypes = {
		/**
		 * Array of assets (in this case Collectibles)
		 */
		collectibles: PropTypes.array,
		/**
		/* navigation object required to access the props
		/* passed by the parent component
		*/
		navigation: PropTypes.object
	};

	state = {
		refreshing: false,
		collectibles: []
	};

	static navigationOptions = ({ navigation }) => getNavigationOptionsTitle(navigation.getParam('name', ''));

	onRefresh = async () => {
		this.setState({ refreshing: true });
		const { AssetsDetectionController } = Engine.context;
		await AssetsDetectionController.detectCollectibles();
		this.setState({ refreshing: false });
	};

	render = () => {
		const {
			navigation: {
				state: { params }
			},
			navigation
		} = this.props;
		const address = params.address;
		const { collectibles } = this.props;
		const filteredCollectibles = collectibles.filter(
			collectible => collectible.address.toLowerCase() === address.toLowerCase()
		);
		const collectibleContract = params;
		return (
			<ScrollView
				refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
				style={styles.wrapper}
			>
				<View testID={'collectible'}>
					<View style={styles.assetOverviewWrapper}>
						<CollectibleContractOverview
							navigation={navigation}
							collectibleContract={collectibleContract}
						/>
					</View>
					<View style={styles.wrapper}>
						<Collectibles navigation={navigation} collectibles={filteredCollectibles} />
					</View>
				</View>
			</ScrollView>
		);
	};
}

const mapStateToProps = state => ({
	collectibles: state.engine.backgroundState.AssetsController.collectibles
});

export default connect(mapStateToProps)(Collectible);
