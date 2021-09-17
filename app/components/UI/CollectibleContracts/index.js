import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, View, InteractionManager, Image } from 'react-native';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import CollectibleContractElement from '../CollectibleContractElement';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { favoritesCollectiblesObjectSelector } from '../../../reducers/collectibles';
import Text from '../../Base/Text';
import AppConstants from '../../../core/AppConstants';
import { toLowerCaseEquals } from '../../../util/general';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		minHeight: 500,
		marginTop: 16,
	},
	emptyView: {
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 40,
	},
	add: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	addText: {
		fontSize: 14,
		color: colors.blue,
		...fontStyles.normal,
	},
	footer: {
		flex: 1,
		paddingBottom: 30,
		alignItems: 'center',
		marginTop: 24,
	},
	emptyContainer: {
		flex: 1,
		marginBottom: 18,
		justifyContent: 'center',
		alignItems: 'center',
	},
	emptyImageContainer: {
		width: 76,
		height: 76,
		marginBottom: 12,
	},
	emptyTitleText: {
		fontSize: 24,
		color: colors.grey200,
	},
	emptyText: {
		color: colors.greyAssetVisibility,
		marginBottom: 8,
		fontSize: 14,
	},
});

/**
 * View that renders a list of CollectibleContract
 * also known as ERC-721 Tokens
 */
const CollectibleContracts = ({ collectibleContracts, collectibles, navigation, favoriteCollectibles }) => {
	const onItemPress = useCallback(
		(collectible, contractName) => {
			navigation.navigate('CollectiblesDetails', { collectible, contractName });
		},
		[navigation]
	);

	const goToAddCollectible = () => {
		navigation.push('AddAsset', { assetType: 'collectible' });
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.WALLET_ADD_COLLECTIBLES);
		});
	};

	const renderFooter = () => (
		<View style={styles.footer} key={'collectible-contracts-footer'}>
			<Text style={styles.emptyText}>{strings('wallet.no_collectibles')}</Text>
			<TouchableOpacity style={styles.add} onPress={goToAddCollectible} testID={'add-collectible-button'}>
				<Text style={styles.addText}>{strings('wallet.add_collectibles')}</Text>
			</TouchableOpacity>
		</View>
	);

	const renderCollectibleContract = useCallback(
		(item, index) => {
			const contractCollectibles = collectibles?.filter((collectible) =>
				toLowerCaseEquals(collectible.address, item.address)
			);
			return (
				<CollectibleContractElement
					onPress={onItemPress}
					asset={item}
					key={item.address}
					contractCollectibles={contractCollectibles}
					collectiblesVisible={index === 0}
				/>
			);
		},
		[collectibles, onItemPress]
	);

	const renderFavoriteCollectibles = useCallback(() => {
		const filteredCollectibles = favoriteCollectibles.map((collectible) =>
			collectibles.find(
				({ tokenId, address }) => collectible.tokenId === tokenId && collectible.address === address
			)
		);
		return (
			Boolean(filteredCollectibles.length) && (
				<CollectibleContractElement
					onPress={onItemPress}
					asset={{ name: 'Favorites', favorites: true }}
					key={'Favorites'}
					contractCollectibles={filteredCollectibles}
					collectiblesVisible
				/>
			)
		);
	}, [favoriteCollectibles, collectibles, onItemPress]);

	const renderList = useCallback(
		() => (
			<View>
				{renderFavoriteCollectibles()}
				<View>{collectibleContracts?.map((item, index) => renderCollectibleContract(item, index))}</View>
			</View>
		),
		[collectibleContracts, renderFavoriteCollectibles, renderCollectibleContract]
	);

	const goToLearnMore = () =>
		navigation.navigate('Webview', { screen: 'SimpleWebview', params: { url: AppConstants.URLS.NFT } });

	const renderEmpty = () => (
		<View style={styles.emptyView}>
			<View style={styles.emptyContainer}>
				<Image
					style={styles.emptyImageContainer}
					source={require('../../../images/no-nfts-placeholder.png')}
					resizeMode={'contain'}
				/>
				<Text center style={styles.emptyTitleText} bold>
					{strings('wallet.no_nfts_yet')}
				</Text>
				<Text center big link onPress={goToLearnMore}>
					{strings('wallet.learn_more')}
				</Text>
			</View>
		</View>
	);

	return (
		<View style={styles.wrapper} testID={'collectible-contracts'}>
			{collectibles.length ? renderList() : renderEmpty()}
			{renderFooter()}
		</View>
	);
};

CollectibleContracts.propTypes = {
	/**
	 * Array of collectibleContract objects
	 */
	collectibleContracts: PropTypes.array,
	/**
	 * Array of collectibles objects
	 */
	collectibles: PropTypes.array,
	/**
	 * Navigation object required to push
	 * the Asset detail view
	 */
	navigation: PropTypes.object,
	/**
	 * Object of collectibles
	 */
	favoriteCollectibles: PropTypes.array,
};

const mapStateToProps = (state) => ({
	collectibleContracts: state.engine.backgroundState.CollectiblesController.collectibleContracts,
	collectibles: state.engine.backgroundState.CollectiblesController.collectibles,
	favoriteCollectibles: favoritesCollectiblesObjectSelector(state),
});

export default connect(mapStateToProps)(CollectibleContracts);
