import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ScrollView, RefreshControl, FlatList, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { connect } from 'react-redux';
import Icon from 'react-native-vector-icons/Feather';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import Engine from '../../core/Engine';
import getContractInformation from '../../util/opensea';
import CollectibleContractElement from '../CollectibleContractElement';

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
		const collectibleGroups = collectibles.reduce((groups, collectible) => {
			const exists = allCollectibleContracts.find(
				collectibleContract => collectibleContract.address === collectible.address
			);
			if (!exists && !groups.includes(collectible.address)) {
				groups.push(collectible.address);
			}
			return groups;
		}, []);
		const collectibleGroupInformationPromises = collectibleGroups.map(async address =>
			getContractInformation(address)
		);
		const collectibleGroupInformation = await Promise.all(collectibleGroupInformationPromises);
		collectibleGroupInformation.map(({ address, name, symbol, image_url, description, total_supply }) =>
			AssetsController.addCollectibleContract(address, name, symbol, image_url, description, total_supply)
		);
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

	keyExtractor = item => `${item.address}_${item.tokenId}`;

	onRefresh = async () => {
		this.setState({ refreshing: true });
		const { AssetsDetectionController } = Engine.context;
		await AssetsDetectionController.detectCollectibles();
		this.setState({ refreshing: false });
	};

	renderCollectiblesGroupList() {
		const { allCollectibleContracts } = this.props;
		return (
			<FlatList
				data={allCollectibleContracts}
				extraData={this.state}
				keyExtractor={this.keyExtractor}
				refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
				// eslint-disable-next-line react/jsx-no-bind
				renderItem={({ item }) => {
					if (!item.name) {
						item.name = strings('wallet.collectible_no_name');
					}
					return <CollectibleContractElement collectibleContract={item} onPress={this.onItemPress} />;
				}}
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
