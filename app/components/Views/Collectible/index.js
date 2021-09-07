import React, { PureComponent } from 'react';
import { RefreshControl, ScrollView, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { colors } from '../../../styles/common';
import { getNetworkNavbarOptions } from '../../UI/Navbar';
import { connect } from 'react-redux';
import Collectibles from '../../UI/Collectibles';
import CollectibleContractOverview from '../../UI/CollectibleContractOverview';
import Engine from '../../../core/Engine';
import Modal from 'react-native-modal';
import CollectibleContractInformation from '../../UI/CollectibleContractInformation';
import { toggleCollectibleContractModal } from '../../../actions/modals';
import { toLowerCaseEquals } from '../../../util/general';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
});

/**
 * View that displays a specific collectible
 * including the overview (name, address, symbol, logo, description, total supply)
 * and also individual collectibles list
 */
class Collectible extends PureComponent {
	static propTypes = {
		/**
		 * Array of assets (in this case Collectibles)
		 */
		collectibles: PropTypes.array,
		/**
		/* navigation object required to access the props
		/* passed by the parent component
		*/
		navigation: PropTypes.object,
		/**
		 * Called to toggle collectible contract information modal
		 */
		toggleCollectibleContractModal: PropTypes.func,
		/**
		 * Whether collectible contract information is visible
		 */
		collectibleContractModalVisible: PropTypes.bool,
		/**
		 * Object that represents the current route info like params passed to it
		 */
		route: PropTypes.object,
	};

	state = {
		refreshing: false,
		collectibles: [],
	};

	static navigationOptions = ({ navigation, route }) =>
		getNetworkNavbarOptions(route.params?.name ?? '', false, navigation);

	onRefresh = async () => {
		this.setState({ refreshing: true });
		const { AssetsDetectionController } = Engine.context;
		await AssetsDetectionController.detectCollectibles();
		this.setState({ refreshing: false });
	};

	hideCollectibleContractModal = () => {
		this.props.toggleCollectibleContractModal();
	};

	render = () => {
		const {
			route: { params },
			navigation,
			collectibleContractModalVisible,
		} = this.props;
		const collectibleContract = params;
		const address = params.address;
		const { collectibles } = this.props;
		const filteredCollectibles = collectibles.filter((collectible) =>
			toLowerCaseEquals(collectible.address, address)
		);
		filteredCollectibles.map((collectible) => {
			if (!collectible.name || collectible.name === '') {
				collectible.name = collectibleContract.name;
			}
			if (!collectible.image && collectibleContract.logo) {
				collectible.image = collectibleContract.logo;
			}
			return collectible;
		});

		const ownerOf = filteredCollectibles.length;
		return (
			<View style={styles.wrapper}>
				<ScrollView
					refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
					style={styles.wrapper}
				>
					<View testID={'collectible'}>
						<View style={styles.assetOverviewWrapper}>
							<CollectibleContractOverview
								navigation={navigation}
								collectibleContract={collectibleContract}
								ownerOf={ownerOf}
							/>
						</View>
						<View style={styles.wrapper}>
							<Collectibles
								navigation={navigation}
								collectibles={filteredCollectibles}
								collectibleContract={collectibleContract}
							/>
						</View>
					</View>
				</ScrollView>
				<Modal
					isVisible={collectibleContractModalVisible}
					onBackdropPress={this.hideCollectibleContractModal}
					onBackButtonPress={this.hideCollectibleContractModal}
					onSwipeComplete={this.hideCollectibleContractModal}
					swipeDirection={'down'}
				>
					<CollectibleContractInformation
						navigation={navigation}
						onClose={this.hideCollectibleContractModal}
						collectibleContract={collectibleContract}
					/>
				</Modal>
			</View>
		);
	};
}

const mapStateToProps = (state) => ({
	collectibles: state.engine.backgroundState.CollectiblesController.collectibles,
	collectibleContractModalVisible: state.modals.collectibleContractModalVisible,
});

const mapDispatchToProps = (dispatch) => ({
	toggleCollectibleContractModal: () => dispatch(toggleCollectibleContractModal()),
});

export default connect(mapStateToProps, mapDispatchToProps)(Collectible);
