import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, View, InteractionManager } from 'react-native';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import Engine from '../../../core/Engine';
import CollectibleContractElement from '../CollectibleContractElement';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import {
	collectibleContractsSelector,
	collectiblesSelector,
	favoritesCollectiblesSelector,
} from '../../../reducers/collectibles';
import { removeFavoriteCollectible } from '../../../actions/collectibles';
import Text from '../../Base/Text';
import AppConstants from '../../../core/AppConstants';
import { toLowerCaseEquals } from '../../../util/general';
import { compareTokenIds } from '../../../util/tokens';

const styles = StyleSheet.create({
	wrapper: {
		flexGrow: 1,
		justifyContent: 'space-between',
		backgroundColor: colors.white,
		marginBottom: 90,
		marginTop: 20,
	},
	emptyView: {
		alignItems: 'center',
		justifyContent: 'space-between',
		flex: 1,
	},
	addText: {
		fontSize: 14,
		color: colors.blue,
		...fontStyles.normal,
	},
	footer: {
		paddingBottom: 30,
		marginTop: 24,
		justifyContent: 'center',
	},
	icon: {
		color: colors.blue,
		marginBottom: 8,
	},
	smallIcon: {
		color: colors.blue,
		marginTop: 4,
		marginRight: 8,
	},
	emptyText: {
		color: colors.greyAssetVisibility,
		fontSize: 14,
		marginRight: 4,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'center',
	},
	frameRow: {
		width: 120,
		height: 20,
	},
	frameBottomRow: {
		marginBottom: 40,
	},
	nftText: {
		color: colors.blue,
	},
	frame: {
		height: 20,
		width: 20,
		borderColor: colors.blue,
	},
	frameMiddle: {
		height: 20,
		width: '100%',
	},
	frameTop: {
		borderTopWidth: 3,
	},
	frameBottom: {
		borderBottomWidth: 3,
	},
	frameLeft: {
		borderLeftWidth: 3,
	},
	frameRight: {
		borderRightWidth: 3,
	},
	pixel: {
		height: 1,
		width: 1,
	},
	nftButton: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	smallCreate: {
		marginBottom: 8,
	},
});

/**
 * View that renders a list of CollectibleContract
 * ERC-721 and ERC-1155
 */
const CollectibleContracts = ({
	selectedAddress,
	chainId,
	navigation,
	collectibleContracts,
	collectibles,
	favoriteCollectibles,
	removeFavoriteCollectible,
}) => {
	const onItemPress = useCallback(
		(collectible, contractName) => {
			navigation.navigate('CollectiblesDetails', { collectible, contractName });
		},
		[navigation]
	);

	/**
	 *	Method to check the token id data type of the current collectibles.
	 *
	 * @param collectible - Collectible object.
	 * @returns Boolean indicating if the collectible should be updated.
	 */
	const shouldUpdateCollectibleMetadata = (collectible) => typeof collectible.tokenId === 'number';

	/**
	 * Method to updated collectible and avoid backwards compatibility issues.
	 * @param address - Collectible address.
	 * @param tokenId - Collectible token ID.
	 */
	const updateCollectibleMetadata = (collectible) => {
		const { CollectiblesController } = Engine.context;
		const { address, tokenId } = collectible;
		CollectiblesController.removeCollectible(address, tokenId);
		if (String(tokenId).includes('e+')) {
			removeFavoriteCollectible(selectedAddress, chainId, collectible);
		} else {
			CollectiblesController.addCollectible(address, String(tokenId));
		}
	};

	useEffect(() => {
		// TO DO: Move this fix to the controllers layer
		collectibles.forEach((collectible) => {
			if (shouldUpdateCollectibleMetadata(collectible)) {
				updateCollectibleMetadata(collectible);
			}
		});
	});

	const goToAddCollectible = () => {
		navigation.push('AddAsset', { assetType: 'collectible' });
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.WALLET_ADD_COLLECTIBLES);
		});
	};

	const goToCreateCollectible = useCallback(() => {
		navigation.push('CreateCollectible');
		//TODO CREATE_NFT
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.WALLET_ADD_COLLECTIBLES);
		});
	}, [navigation]);

	const renderFooter = () => (
		<View style={styles.footer} key={'collectible-contracts-footer'}>
			{collectibleContracts?.length > 0 && (
				<TouchableOpacity style={[styles.row, styles.smallCreate]} onPress={goToCreateCollectible}>
					<FontAwesomeIcon name="camera-retro" size={14} style={styles.smallIcon} />
					<Text blue>{strings('wallet.create_nft')}</Text>
				</TouchableOpacity>
			)}

			<View style={styles.row}>
				<Text style={styles.emptyText}>{strings('wallet.no_collectibles')}</Text>
				<TouchableOpacity link onPress={goToAddCollectible} testID={'add-collectible-button'}>
					<Text style={styles.addText}>{strings('wallet.add_collectibles')}</Text>
				</TouchableOpacity>
			</View>
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
				({ tokenId, address }) =>
					compareTokenIds(collectible.tokenId, tokenId) && collectible.address === address
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
		[renderFavoriteCollectibles, collectibleContracts, renderCollectibleContract]
	);

	const goToLearnMore = () =>
		navigation.navigate('Webview', { screen: 'SimpleWebview', params: { url: AppConstants.URLS.NFT } });

	const Frame = ({ top, bottom, middle, left, right }) => (
		<View
			style={[
				styles.frame,
				top ? styles.frameTop : null,
				bottom ? styles.frameBottom : null,
				left ? styles.frameLeft : null,
				right ? styles.frameRight : null,
				middle ? styles.frameMiddle : null,
			]}
		/>
	);

	Frame.propTypes = {
		top: PropTypes.bool,
		bottom: PropTypes.bool,
		middle: PropTypes.bool,
		left: PropTypes.bool,
		right: PropTypes.bool,
	};

	const CreateNFTButton = () => (
		<TouchableOpacity style={styles.nftButton} onPress={goToCreateCollectible}>
			<View style={[styles.row, styles.frameRow]}>
				<Frame top left />
				<Frame middle />
				<Frame top right />
			</View>

			<FontAwesomeIcon name="camera-retro" size={34} style={styles.icon} />
			<Text style={[styles.emptyText, styles.nftText]}>{strings('wallet.create_nft')}</Text>

			<View style={[styles.row, styles.frameRow, styles.frameBottomRow]}>
				<Frame bottom left />
				<Frame middle />
				<Frame bottom right />
			</View>
		</TouchableOpacity>
	);

	const renderEmpty = () => (
		<View style={styles.emptyView}>
			<View style={styles.pixel} />
			<CreateNFTButton />

			<View style={styles.row}>
				<Text style={styles.emptyText}>{strings('wallet.no_nfts_yet')}</Text>
				<Text link onPress={goToLearnMore}>
					{strings('wallet.learn_more')}
				</Text>
			</View>
		</View>
	);

	return (
		<View style={styles.wrapper} testID={'collectible-contracts'}>
			{collectibleContracts.length > 0 ? renderList() : renderEmpty()}
			{renderFooter()}
		</View>
	);
};

CollectibleContracts.propTypes = {
	/**
	 * Chain id
	 */
	chainId: PropTypes.string,
	/**
	 * Selected address
	 */
	selectedAddress: PropTypes.string,
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
	/**
	 * Dispatch remove collectible from favorites action
	 */
	removeFavoriteCollectible: PropTypes.func,
};

const mapStateToProps = (state) => ({
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	collectibleContracts: collectibleContractsSelector(state),
	collectibles: collectiblesSelector(state),
	favoriteCollectibles: favoritesCollectiblesSelector(state),
});

const mapDispatchToProps = (dispatch) => ({
	removeFavoriteCollectible: (selectedAddress, chainId, collectible) =>
		dispatch(removeFavoriteCollectible(selectedAddress, chainId, collectible)),
});

export default connect(mapStateToProps, mapDispatchToProps)(CollectibleContracts);
