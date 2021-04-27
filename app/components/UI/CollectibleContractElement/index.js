import React from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { colors } from '../../../styles/common';
import CollectibleImage from '../CollectibleImage';

const styles = StyleSheet.create({
	itemWrapper: {
		flex: 1,
		flexDirection: 'row',
		paddingHorizontal: 15,
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.grey100
	},
	collectibleIcon: { width: 30, height: 30 }
});

/**
 * Customizable view to render assets in lists
 */
export default function CollectibleContractElement({ asset, onPress }) {
	const handleOnPress = () => onPress(asset);

	return (
		<TouchableOpacity onPress={handleOnPress} style={styles.itemWrapper}>
			<View style={styles.itemWrapper}>
				<CollectibleImage
					iconStyle={styles.collectibleIcon}
					containerStyle={styles.collectibleIcon}
					collectible={{ ...asset, image: asset.logo }}
				/>
				<View style={styles.rows}>
					<Text style={styles.name}>{asset.name}</Text>
				</View>
			</View>
		</TouchableOpacity>
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
	onPress: PropTypes.func
};
