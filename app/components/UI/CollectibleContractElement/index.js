import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import CollectibleImage from '../CollectibleImage';
import Icon from 'react-native-vector-icons/Ionicons';

const styles = StyleSheet.create({
	itemWrapper: {
		paddingHorizontal: 15,
		paddingTop: 15
	},
	collectibleIcon: { width: 30, height: 30 },
	collectibleIconContainer: { width: 30, height: 30, marginHorizontal: 8 },
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
	}
});

/**
 * Customizable view to render assets in lists
 */
export default function CollectibleContractElement({ asset, onPress, contractCollectibles }) {
	const handleOnPress = () => onPress(asset);

	return (
		<View onPress={handleOnPress} style={styles.itemWrapper}>
			<View style={styles.titleContainer}>
				<View style={styles.verticalAlignedContainer}>
					<Icon name="ios-arrow-down" size={12} color={colors.fontTertiary} style={styles.arrowIcon} />
				</View>
				<CollectibleImage
					iconStyle={styles.collectibleIcon}
					containerStyle={styles.collectibleIconContainer}
					collectible={{ ...asset, image: asset.logo }}
				/>
				<View style={styles.verticalAlignedContainer}>
					<Text numberOfLines={1} style={styles.titleText}>
						{asset.name}
					</Text>
				</View>
			</View>
		</View>
	);
}

CollectibleContractElement.propTypes = {
	/**
	 * Object being rendered
	 */
	asset: PropTypes.object,
	/**
	 * Callback triggered on long press
	 */
	onPress: PropTypes.func,
	/**
	 * Array of collectibles
	 */
	contractCollectibles: PropTypes.array
};
