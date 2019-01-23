import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ScrollView, RefreshControl, FlatList, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import CollectibleElement from '../CollectibleElement';
import ActionSheet from 'react-native-actionsheet';
import Engine from '../../core/Engine';
import getContractInformation from '../../util/opensea';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		minHeight: 500
	},
	emptyView: {
		backgroundColor: colors.white,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 50
	},
	text: {
		fontSize: 20,
		color: colors.fontTertiary,
		...fontStyles.normal
	},
	add: {
		margin: 20,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	addText: {
		fontSize: 15,
		color: colors.primary,
		...fontStyles.normal
	},
	footer: {
		flex: 1,
		paddingBottom: 30
	}
});

/**
 * View that renders a list of Collectibles
 * also known as ERC-721 Tokens
 */
export default class Collectibles extends Component {
	static propTypes = {
		/**
		 * Navigation object required to push
		 * the Asset detail view
		 */
		navigation: PropTypes.object,
		/**
		 * Array of assets (in this case Collectibles)
		 */
		collectibles: PropTypes.array,
		/**
		 * Callback triggered when collectible pressed from collectibles list
		 */
		onPress: PropTypes.func
	};

	state = {
		refreshing: false
	};

	actionSheet = null;

	collectibleToRemove = null;

	componentDidMount = async () => {
		const { collectibles } = this.props;

		const collectibleGroups = collectibles.reduce((groups, collectible) => {
			if (!groups.includes(collectible.address)) {
				groups.push(collectible.address);
			}
			return groups;
		}, []);

		const collectibleGroupInformationPromises = collectibleGroups.map(async address =>
			getContractInformation(address)
		);
		await Promise.all(collectibleGroupInformationPromises);
	};

	renderEmpty = () => (
		<ScrollView refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}>
			<View style={styles.emptyView}>
				<Text style={styles.text}>{strings('wallet.no_collectibles')}</Text>
				{this.renderFooter()}
			</View>
		</ScrollView>
	);

	onItemPress = collectible => {
		this.props.navigation.push('CollectibleView', { ...collectible });
	};

	handleOnPress = collectible => {
		this.props.onPress(collectible);
	};

	goToAddCollectible = () => {
		this.props.navigation.push('AddAsset', { assetType: 'collectible' });
	};

	showRemoveMenu = collectible => {
		this.collectibleToRemove = collectible;
		this.actionSheet.show();
	};

	removeCollectible = () => {
		const { AssetsController } = Engine.context;
		AssetsController.removeCollectible(this.collectibleToRemove.address, this.collectibleToRemove.tokenId);
	};

	createActionSheetRef = ref => {
		this.actionSheet = ref;
	};

	renderFooter = () => (
		<View style={styles.footer}>
			<TouchableOpacity style={styles.add} onPress={this.goToAddCollectible} testID={'add-collectible-button'}>
				<Icon name="plus" size={16} color={colors.primary} />
				<Text style={styles.addText}>{strings('wallet.add_collectibles').toUpperCase()}</Text>
			</TouchableOpacity>
		</View>
	);

	keyExtractor = item => `${item.address}_${item.tokenId}`;

	onRefresh = async () => {
		this.setState({ refreshing: true });
		const { AssetsDetectionController } = Engine.context;
		await AssetsDetectionController.detectCollectibles();
		this.setState({ refreshing: false });
	};

	renderCollectiblesGroupList() {
		const { collectibles } = this.props;

		return (
			<FlatList
				data={collectibles}
				extraData={this.state}
				keyExtractor={this.keyExtractor}
				refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
				// eslint-disable-next-line react/jsx-no-bind
				renderItem={({ item }) => {
					if (!item.name) {
						item.name = strings('wallet.collectible_no_name');
					}
					return (
						<CollectibleElement
							collectible={item}
							onPress={this.onItemPress}
							onLongPress={this.showRemoveMenu}
						/>
					);
				}}
				ListFooterComponent={this.renderFooter}
			/>
		);
	}

	render = () => {
		const { collectibles } = this.props;
		return (
			<View style={styles.wrapper} testID={'collectibles'}>
				{collectibles && collectibles.length ? this.renderCollectiblesGroupList() : this.renderEmpty()}
				<ActionSheet
					ref={this.createActionSheetRef}
					title={strings('wallet.remove_collectible_title')}
					options={[strings('wallet.remove'), strings('wallet.cancel')]}
					cancelButtonIndex={1}
					destructiveButtonIndex={0}
					// eslint-disable-next-line react/jsx-no-bind
					onPress={index => (index === 0 ? this.removeCollectible() : null)}
				/>
			</View>
		);
	};
}
