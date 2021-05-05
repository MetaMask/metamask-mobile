import React, { useEffect, useState, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import CollectibleMedia from '../CollectibleMedia';
import Icon from 'react-native-vector-icons/Ionicons';
import Device from '../../../util/Device';
import { NavigationContext } from 'react-navigation';
import AntIcons from 'react-native-vector-icons/AntDesign';
import Text from '../../Base/Text';

const DEVICE_WIDTH = Device.getDeviceWidth();
const COLLECTIBLE_WIDTH = (DEVICE_WIDTH - 30 - 16) / 3;

const styles = StyleSheet.create({
	itemWrapper: {
		paddingHorizontal: 15,
		paddingBottom: 16
	},
	collectibleContractIcon: { width: 30, height: 30 },
	collectibleContractIconContainer: { marginHorizontal: 8, borderRadius: 30 },
	titleContainer: {
		flex: 1,
		flexDirection: 'row'
	},
	verticalAlignedContainer: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	titleText: {
		fontSize: 18,
		color: colors.black,
		...fontStyles.normal
	},
	collectibleIcon: {
		width: COLLECTIBLE_WIDTH,
		height: COLLECTIBLE_WIDTH
	},
	collectibleInTheMiddle: {
		marginHorizontal: 8
	},
	collectiblesRowContainer: {
		flex: 1,
		flexDirection: 'row',
		marginTop: 15
	},
	collectibleBox: {
		flex: 1,
		flexDirection: 'row'
	},
	favoritesLogoWrapper: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.yellow,
		width: 32,
		height: 32,
		borderRadius: 16
	}
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
export default function CollectibleContractElement({
	asset,
	contractCollectibles,
	collectiblesVisible: propsCollectiblesVisible
}) {
	const navigation = useContext(NavigationContext);
	const [collectiblesGrid, setCollectiblesGrid] = useState([]);
	const [collectiblesVisible, setCollectiblesVisible] = useState(propsCollectiblesVisible);

	const toggleCollectibles = useCallback(() => {
		setCollectiblesVisible(!collectiblesVisible);
	}, [collectiblesVisible, setCollectiblesVisible]);

	const onPressCollectible = useCallback(
		collectible =>
			navigation.navigate('CollectibleView', {
				...collectible,
				contractName: asset.name
			}),
		[asset.name, navigation]
	);

	const renderCollectible = useCallback(
		(collectible, index) => {
			const onPress = () => onPressCollectible(collectible);
			return (
				<View key={collectible.address + collectible.tokenId} styles={styles.collectibleBox}>
					<TouchableOpacity onPress={onPress}>
						<View style={index === 1 ? styles.collectibleInTheMiddle : {}}>
							<CollectibleMedia style={styles.collectibleIcon} collectible={collectible} />
						</View>
					</TouchableOpacity>
				</View>
			);
		},
		[onPressCollectible]
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
						name={`ios-arrow-${collectiblesVisible ? 'up' : 'down'}`}
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
	collectiblesVisible: PropTypes.bool
};
