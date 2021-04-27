import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import CollectibleImage from '../CollectibleImage';
import Icon from 'react-native-vector-icons/Ionicons';
import Device from '../../../util/Device';

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
	collectiblesRowContainer: {
		flex: 1,
		flexDirection: 'row',
		marginTop: 15,
		justifyContent: 'space-between'
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
	const [collectiblesToRender, setCollectiblesToRender] = useState([]);
	useEffect(() => {
		setCollectiblesToRender(contractCollectibles.concat(contractCollectibles));
	}, [contractCollectibles, setCollectiblesToRender]);

	return (
		<View style={styles.itemWrapper}>
			<View style={styles.titleContainer}>
				<View style={styles.verticalAlignedContainer}>
					<Icon name="ios-arrow-down" size={12} color={colors.fontTertiary} style={styles.arrowIcon} />
				</View>
				<CollectibleImage
					iconStyle={styles.collectibleContractIcon}
					containerStyle={[styles.collectibleContractIcon, styles.collectibleContractIconContainer]}
					collectible={{ ...asset, image: asset.logo }}
				/>
				<View style={styles.verticalAlignedContainer}>
					<Text numberOfLines={1} style={styles.titleText}>
						{asset.name}
					</Text>
				</View>
			</View>
			<View style={styles.collectiblesRowContainer}>
				{collectiblesToRender.map(({ name, address, tokenId, image }) => (
					<View key={address + tokenId} styles={styles.collectibleBox}>
						<CollectibleImage
							iconStyle={styles.collectibleIcon}
							containerStyle={styles.collectibleIcon}
							collectible={{ name, address, tokenId, image }}
						/>
					</View>
				))}
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
	 * Array of collectibles
	 */
	contractCollectibles: PropTypes.array
};
