import React, { useEffect, useState, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import CollectibleMedia from '../CollectibleMedia';
import Icon from 'react-native-vector-icons/Ionicons';
import Device from '../../../util/Device';
import { NavigationContext } from 'react-navigation';

const DEVICE_WIDTH = Device.getDeviceWidth();
const COLLECTIBLE_WIDTH = (DEVICE_WIDTH - 30 - 16) / 3;

const styles = StyleSheet.create({
	itemWrapper: {
		paddingHorizontal: 15,
		paddingTop: 24
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
		color: colors.grey500,
		...fontStyles.bold
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
					<CollectibleMedia
						iconStyle={styles.collectibleContractIcon}
						collectible={{ ...asset, image: asset.logo }}
						tiny
					/>
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
