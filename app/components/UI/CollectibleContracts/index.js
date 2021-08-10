import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, View, InteractionManager, Image } from 'react-native';
import { connect } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { baseStyles, colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import CollectibleContractElement from '../CollectibleContractElement';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { favoritesCollectiblesObjectSelector } from '../../../reducers/collectibles';
import Text from '../../Base/Text';
import AppConstants from '../../../core/AppConstants';
import StyledButton from '../StyledButton';
import { toLowerCaseEquals } from '../../../util/general';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		minHeight: 500
	},
	emptyView: {
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 40
	},
	add: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	addText: {
		fontSize: 15,
		color: colors.blue,
		...fontStyles.normal
	},
	footer: {
		flex: 1,
		paddingBottom: 30
	},
	emptyContainer: {
		flex: 1,
		marginBottom: 42,
		marginHorizontal: 56,
		justifyContent: 'center',
		alignItems: 'center'
	},
	emptyImageContainer: {
		width: 47,
		height: 47
	},
	emptyTitleText: {
		fontSize: 24,
		color: colors.grey200
	},
	emptyText: {
		color: colors.grey200,
		textAlign: 'center'
	},
	emptySectionText: {
		marginVertical: 8
	},
	infoCardPlaceholder: {
		width: '90%',
		height: 50,
		marginHorizontal: '5%',
		marginVertical: 10,
		borderWidth: 1,
		borderColor: colors.black
	}
});

/**
 * View that renders a list of CollectibleContract
 * also known as ERC-721 Tokens
 */
const CollectibleContracts = ({
	collectibleContracts,
	collectibles,
	navigation,
	favoriteCollectibles,
	nftAutodetect
}) => {
	const onItemPress = useCallback(
		(collectible, contractName) => {
			navigation.navigate('CollectiblesDetails', { collectible, contractName });
		},
		[navigation]
	);

	const goToAddCollectible = useCallback(() => {
		navigation.push('AddAsset', { assetType: 'collectible' });
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.WALLET_ADD_COLLECTIBLES);
		});
	}, [navigation]);

	const renderFooter = useCallback(
		() => (
			<View style={styles.footer} key={'collectible-contracts-footer'}>
				<TouchableOpacity style={styles.add} onPress={goToAddCollectible} testID={'add-collectible-button'}>
					<Icon name="plus" size={16} color={colors.blue} />
					<Text style={styles.addText}>{strings('wallet.add_collectibles')}</Text>
				</TouchableOpacity>
			</View>
		),
		[goToAddCollectible]
	);

	const renderCollectibleContract = useCallback(
		(item, index) => {
			const contractCollectibles = collectibles?.filter(collectible =>
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
		const filteredCollectibles = favoriteCollectibles.map(collectible =>
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
				{renderFooter()}
			</View>
		),
		[collectibleContracts, renderFavoriteCollectibles, renderCollectibleContract, renderFooter]
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
				<Text center style={[styles.emptyTitleText, styles.emptySectionText]}>
					{strings('wallet.no_nfts_to_show')}
				</Text>

				<Text center style={[styles.emptyText, styles.emptySectionText]}>
					{strings('wallet.no_collectibles')}
				</Text>
				<StyledButton
					type={'blue'}
					onPress={goToAddCollectible}
					containerStyle={[baseStyles.flexGrow, styles.emptySectionText]}
				>
					{strings('wallet.manually_import_nfts')}
				</StyledButton>
				<Text center big link style={styles.emptySectionText} onPress={goToLearnMore}>
					{strings('wallet.learn_more')}
				</Text>
			</View>
		</View>
	);

	return (
		<View style={styles.wrapper} testID={'collectible-contracts'}>
			<View style={styles.infoCardPlaceholder} />
			<Text>nftAutodetect: {nftAutodetect.toString()}</Text>
			{collectibles.length ? renderList() : renderEmpty()}
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
	nftAutodetect: PropTypes.bool
};

const mapStateToProps = state => ({
	collectibleContracts: state.engine.backgroundState.CollectiblesController.collectibleContracts,
	collectibles: state.engine.backgroundState.CollectiblesController.collectibles,
	favoriteCollectibles: favoritesCollectiblesObjectSelector(state),
	nftAutodetect: state.privacy.nftAutodetect
});

export default connect(mapStateToProps)(CollectibleContracts);
