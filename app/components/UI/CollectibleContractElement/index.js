import React, { useEffect, useState, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import CollectibleImage from '../CollectibleImage';
import Icon from 'react-native-vector-icons/Ionicons';
import Device from '../../../util/Device';
import { NavigationContext } from 'react-navigation';

const DEVICE_WIDTH = Device.getDeviceWidth();

const styles = StyleSheet.create({
	itemWrapper: {
		paddingHorizontal: 15,
		paddingTop: 15
	},
	collectibleContractIcon: { width: 30, height: 30 },
	collectibleContractIconContainer: { marginHorizontal: 8 },
	titleContainer: {
		flex: 1,
		flexDirection: 'row'
	},
	verticalAlignedContainer: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	titleText: {
		fontSize: 16,
		color: colors.grey500,
		...fontStyles.normal
	},
	collectibleIcon: {
		width: (DEVICE_WIDTH - 30 - 16) / 3,
		height: (DEVICE_WIDTH - 30 - 16) / 3
	},
	collectibleInTheMiddle: {
		width: (DEVICE_WIDTH - 30 - 16) / 3,
		height: (DEVICE_WIDTH - 30 - 16) / 3,
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

/**
 * Customizable view to render assets in lists
 */
export default function CollectibleContractElement({ asset, contractCollectibles }) {
	const navigation = useContext(NavigationContext);
	const [collectiblesGrid, setCollectiblesGrid] = useState([]);
	const [collectiblesVisible, setCollectiblesVisible] = useState(true);

	const toggleCollectibles = useCallback(() => {
		setCollectiblesVisible(!collectiblesVisible);
	}, [collectiblesVisible, setCollectiblesVisible]);

	const onPressCollectible = collectible =>
		navigation.navigate('CollectibleView', {
			...collectible,
			contractName: asset.name
		});

	const splitIntoSubArrays = (array, count) => {
		const newArray = [];
		while (array.length > 0) {
			newArray.push(array.splice(0, count));
		}
		return newArray;
	};

	useEffect(() => {
		const temp = splitIntoSubArrays(
			contractCollectibles.concat(contractCollectibles).concat(contractCollectibles),
			3
		);
		setCollectiblesGrid(temp);
	}, [contractCollectibles, setCollectiblesGrid]);

	return (
		<View style={styles.itemWrapper}>
			<TouchableOpacity onPress={toggleCollectibles} style={styles.titleContainer}>
				<View style={styles.verticalAlignedContainer}>
					<Icon
						name={`ios-arrow-${collectiblesVisible ? 'up' : 'down'}`}
						size={12}
						color={colors.fontTertiary}
						style={styles.arrowIcon}
					/>
				</View>
				<CollectibleImage
					iconStyle={styles.collectibleContractIcon}
					containerStyle={{ ...styles.collectibleContractIcon, ...styles.collectibleContractIconContainer }}
					collectible={{ ...asset, image: asset.logo }}
				/>
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
							{row.map((collectible, index) => (
								<View
									key={collectible.address + collectible.tokenId + i + index}
									styles={styles.collectibleBox}
								>
									<TouchableOpacity onPress={() => onPressCollectible(collectible)}>
										<CollectibleImage
											iconStyle={styles.collectibleIcon}
											containerStyle={
												index - (1 % 3) === 0
													? styles.collectibleInTheMiddle
													: styles.collectibleIcon
											}
											collectible={collectible}
										/>
									</TouchableOpacity>
								</View>
							))}
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
	contractCollectibles: PropTypes.array
};
