import React, { useEffect, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../styles/common';
import CollectibleMedia from '../CollectibleMedia';
import Icon from 'react-native-vector-icons/Ionicons';
import Device from '../../../util/device';
import AntIcons from 'react-native-vector-icons/AntDesign';
import Text from '../../Base/Text';
import ActionSheet from 'react-native-actionsheet';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { removeFavoriteCollectible } from '../../../actions/collectibles';

const DEVICE_WIDTH = Device.getDeviceWidth();
const COLLECTIBLE_WIDTH = (DEVICE_WIDTH - 30 - 16) / 3;

const styles = StyleSheet.create({
	itemWrapper: {
		paddingHorizontal: 15,
		paddingBottom: 16,
	},
	collectibleContractIcon: { width: 30, height: 30 },
	collectibleContractIconContainer: { marginHorizontal: 8, borderRadius: 30 },
	titleContainer: {
		flex: 1,
		flexDirection: 'row',
	},
	verticalAlignedContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	titleText: {
		fontSize: 18,
		color: colors.black,
		...fontStyles.normal,
	},
	collectibleIcon: {
		width: COLLECTIBLE_WIDTH,
		height: COLLECTIBLE_WIDTH,
	},
	collectibleInTheMiddle: {
		marginHorizontal: 8,
	},
	collectiblesRowContainer: {
		flex: 1,
		flexDirection: 'row',
		marginTop: 15,
	},
	collectibleBox: {
		flex: 1,
		flexDirection: 'row',
	},
	favoritesLogoWrapper: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.yellow,
		width: 32,
		height: 32,
		borderRadius: 16,
	},
});

const splitIntoSubArrays = (array, count) => {
	const newArray = [];
	while (array.length > 0) {
		newArray.push(array.splice(0, count));
	}
	return newArray;
};

/**
 * Customizable view to render assets in lists
 */
function CollectibleContractElement({
	asset,
	contractCollectibles,
	collectiblesVisible: propsCollectiblesVisible,
	onPress,
	collectibleContracts,
	chainId,
	selectedAddress,
	removeFavoriteCollectible,
}) {
	const [collectiblesGrid, setCollectiblesGrid] = useState([]);
	const [collectiblesVisible, setCollectiblesVisible] = useState(propsCollectiblesVisible);
	const actionSheetRef = useRef();
	const longPressedCollectible = useRef(null);

	const toggleCollectibles = useCallback(() => {
		setCollectiblesVisible(!collectiblesVisible);
	}, [collectiblesVisible, setCollectiblesVisible]);

	const onPressCollectible = useCallback(
		(collectible) => {
			const contractName = collectibleContracts.find(({ address }) => address === collectible.address)?.name;
			onPress(collectible, contractName || collectible.name);
		},
		[collectibleContracts, onPress]
	);

	const onLongPressCollectible = useCallback((collectible) => {
		actionSheetRef.current.show();
		longPressedCollectible.current = collectible;
	}, []);

	const removeCollectible = () => {
		const { CollectiblesController } = Engine.context;
		removeFavoriteCollectible(selectedAddress, chainId, longPressedCollectible.current);
		CollectiblesController.removeAndIgnoreCollectible(
			longPressedCollectible.current.address,
			longPressedCollectible.current.tokenId
		);
		Alert.alert(strings('wallet.collectible_removed_title'), strings('wallet.collectible_removed_desc'));
	};

	const refreshMetadata = () => {
		const { CollectiblesController } = Engine.context;

		CollectiblesController.addCollectible(
			longPressedCollectible.current.address,
			longPressedCollectible.current.tokenId
		);
	};

	const handleMenuAction = (index) => {
		if (index === 1) {
			removeCollectible();
		} else if (index === 0) {
			refreshMetadata();
		}
	};

	const renderCollectible = useCallback(
		(collectible, index) => {
			if (!collectible) return null;
			const name =
				collectible.name || collectibleContracts.find(({ address }) => address === collectible.address)?.name;
			const onPress = () => onPressCollectible({ ...collectible, name });
			const onLongPress = () => (!asset.favorites ? onLongPressCollectible({ ...collectible, name }) : null);
			return (
				<View key={collectible.address + collectible.tokenId} styles={styles.collectibleBox}>
					<TouchableOpacity onPress={onPress} onLongPress={onLongPress}>
						<View style={index === 1 ? styles.collectibleInTheMiddle : {}}>
							<CollectibleMedia style={styles.collectibleIcon} collectible={{ ...collectible, name }} />
						</View>
					</TouchableOpacity>
				</View>
			);
		},
		[asset.favorites, collectibleContracts, onPressCollectible, onLongPressCollectible]
	);

	useEffect(() => {
		const temp = splitIntoSubArrays(contractCollectibles, 3);
		setCollectiblesGrid(temp);
	}, [contractCollectibles, setCollectiblesGrid]);

	return (
		<View style={styles.itemWrapper}>
			<TouchableOpacity onPress={toggleCollectibles} style={styles.titleContainer}>
				<View style={styles.verticalAlignedContainer}>
					<Icon
						name={`ios-arrow-${collectiblesVisible ? 'down' : 'forward'}`}
						size={12}
						color={colors.black}
						style={styles.arrowIcon}
					/>
				</View>
				<View style={styles.collectibleContractIconContainer}>
					{!asset.favorites ? (
						<CollectibleMedia
							iconStyle={styles.collectibleContractIcon}
							collectible={{ ...asset, image: asset.logo }}
							tiny
						/>
					) : (
						<View style={styles.favoritesLogoWrapper}>
							<AntIcons color={colors.white} name={'star'} size={24} />
						</View>
					)}
				</View>
				<View style={styles.verticalAlignedContainer}>
					<Text numberOfLines={1} style={styles.titleText}>
						{asset.name}
					</Text>
				</View>
			</TouchableOpacity>
			{collectiblesVisible && (
				<View style={styles.grid}>
					{collectiblesGrid.map((row, i) => (
						<View key={i} style={styles.collectiblesRowContainer}>
							{row.map((collectible, index) => renderCollectible(collectible, index))}
						</View>
					))}
				</View>
			)}
			<ActionSheet
				ref={actionSheetRef}
				title={strings('wallet.collectible_action_title')}
				options={[strings('wallet.refresh_metadata'), strings('wallet.remove'), strings('wallet.cancel')]}
				cancelButtonIndex={2}
				destructiveButtonIndex={1}
				// eslint-disable-next-line react/jsx-no-bind
				onPress={handleMenuAction}
			/>
		</View>
	);
}

CollectibleContractElement.propTypes = {
	/**
	 * Object being rendered
	 */
	asset: PropTypes.object,
	/**
	 * Array of collectibles
	 */
	contractCollectibles: PropTypes.array,
	/**
	 * Whether the collectibles are visible or not
	 */
	collectiblesVisible: PropTypes.bool,
	/**
	 * Called when the collectible is pressed
	 */
	onPress: PropTypes.func,
	collectibleContracts: PropTypes.array,
	/**
	 * Selected address
	 */
	selectedAddress: PropTypes.string,
	/**
	 * Chain id
	 */
	chainId: PropTypes.string,
	/**
	 * Dispatch remove collectible from favorites action
	 */
	removeFavoriteCollectible: PropTypes.func,
};

const mapStateToProps = (state) => ({
	collectibleContracts: state.engine.backgroundState.CollectiblesController.collectibleContracts,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
});

const mapDispatchToProps = (dispatch) => ({
	removeFavoriteCollectible: (selectedAddress, chainId, collectible) =>
		dispatch(removeFavoriteCollectible(selectedAddress, chainId, collectible)),
});

export default connect(mapStateToProps, mapDispatchToProps)(CollectibleContractElement);
