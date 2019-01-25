import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ScrollView, RefreshControl, FlatList, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { connect } from 'react-redux';
import Icon from 'react-native-vector-icons/Feather';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import Engine from '../../core/Engine';
import getContractInformation from '../../util/opensea';
import CollectibleImage from '../CollectibleImage';
import { renderShortAddress } from '../../util/address';
import AssetElement from '../AssetElement';

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
	},
	rows: {
		flex: 1,
		marginLeft: 20
	},
	name: {
		fontSize: 16,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	tokenId: {
		fontSize: 12,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	symbol: {
		fontSize: 12,
		color: colors.fontPrimary,
		...fontStyles.bold
	},
	itemWrapper: {
		flex: 1,
		flexDirection: 'row'
	}
});

/**
 * View that renders a list of CollectibleContract
 * also known as ERC-721 Tokens
 */
class CollectibleContracts extends Component {
	static propTypes = {
		/**
		 * Array of collectibleContract objects
		 */
		allCollectibleContracts: PropTypes.array,
		/**
		 * Navigation object required to push
		 * the Asset detail view
		 */
		navigation: PropTypes.object,
		/**
		 * Array of assets (in this case Collectibles)
		 */
		collectibles: PropTypes.array
	};

	state = {
		refreshing: false
	};

	componentDidUpdate = async () => {
		const { collectibles, allCollectibleContracts } = this.props;
		const { AssetsController } = Engine.context;
		const collectibleAddresses = collectibles.reduce((list, collectible) => {
			if (!list.includes(collectible.address)) {
				list.push(collectible.address);
			}
			return list;
		}, []);
		const collectibleContractsToFetch = collectibleAddresses.reduce((list, address) => {
			const alreadyAdded = allCollectibleContracts.find(
				collectibleContract => collectibleContract.address === address
			);
			if (!alreadyAdded && !list.includes(address)) {
				list.push(address);
			}
			return list;
		}, []);
		const collectibleContractsInformation = await collectibleContractsToFetch.reduce(async (list, address) => {
			const contractInformation = await getContractInformation(address);
			if (contractInformation) {
				list.push(contractInformation);
			}
			return list;
		}, []);
		collectibleContractsInformation.map(({ address, name, symbol, image_url, description, total_supply }) =>
			AssetsController.addCollectibleContract(address, name, symbol, image_url, description, total_supply)
		);
		allCollectibleContracts.map(collectibleContract => {
			if (!collectibleAddresses.includes(collectibleContract.address)) {
				AssetsController.removeCollectibleContract(collectibleContract.address);
			}
			return null;
		});
	};

	renderEmpty = () => (
		<ScrollView refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}>
			<View style={styles.emptyView}>
				<Text style={styles.text}>{strings('wallet.no_collectibles')}</Text>
				{this.renderFooter()}
			</View>
		</ScrollView>
	);

	onItemPress = collectibleContract => {
		this.props.navigation.push('Collectible', collectibleContract);
	};

	goToAddCollectible = () => {
		this.props.navigation.push('AddAsset', { assetType: 'collectible' });
	};

	renderFooter = () => (
		<View style={styles.footer}>
			<TouchableOpacity style={styles.add} onPress={this.goToAddCollectible} testID={'add-collectible-button'}>
				<Icon name="plus" size={16} color={colors.primary} />
				<Text style={styles.addText}>{strings('wallet.add_collectibles').toUpperCase()}</Text>
			</TouchableOpacity>
		</View>
	);

	renderItem = ({ item }) => {
		const { address, name, logo, symbol } = item;
		return (
			<AssetElement onPress={this.onItemPress} asset={item}>
				<View style={styles.itemWrapper}>
					<CollectibleImage collectible={{ address, name, image: logo }} />
					<View style={styles.rows}>
						<Text style={styles.name}>{name}</Text>
						<Text style={styles.symbol}>{symbol}</Text>
						<Text style={styles.tokenId}>{renderShortAddress(address)}</Text>
					</View>
				</View>
			</AssetElement>
		);
	};

	keyExtractor = item => `${item.address}_${item.tokenId}`;

	onRefresh = async () => {
		this.setState({ refreshing: true });
		const { AssetsDetectionController } = Engine.context;
		await AssetsDetectionController.detectCollectibles();
		this.setState({ refreshing: false });
	};

	handleOnItemPress = collectibleContract => {
		this.onItemPress(collectibleContract);
	};

	renderCollectiblesGroupList() {
		const { allCollectibleContracts } = this.props;
		return (
			<FlatList
				data={allCollectibleContracts}
				extraData={this.state}
				keyExtractor={this.keyExtractor}
				refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
				renderItem={this.renderItem}
				ListFooterComponent={this.renderFooter}
			/>
		);
	}

	render = () => {
		const { allCollectibleContracts } = this.props;
		return (
			<View style={styles.wrapper} testID={'collectible-contracts'}>
				{allCollectibleContracts && allCollectibleContracts.length
					? this.renderCollectiblesGroupList()
					: this.renderEmpty()}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	allCollectibleContracts: state.engine.backgroundState.AssetsController.allCollectibleContracts
});

export default connect(mapStateToProps)(CollectibleContracts);
