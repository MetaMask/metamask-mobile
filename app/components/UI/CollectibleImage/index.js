import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import RemoteImage from '../../Base/RemoteImage';
import Identicon from '../Identicon';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
	listWrapper: {
		width: 50,
		height: 50,
		borderRadius: 10,
		overflow: 'hidden'
	},
	fullWrapper: {
		width: 260,
		height: 260,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center'
	},
	listImage: {
		width: 50,
		height: 50
	},
	fullImage: {
		height: 260,
		width: 260
	}
});

/**
 * View that renders an ERC-721 Token image
 */
export default function CollectibleImage({ collectible, renderFull, containerStyle, iconStyle }) {
	const [fallbackImage, setFallbackImage] = useState(null);

	const fallback = () => {
		const { address, tokenId } = collectible;
		setFallbackImage(`https://storage.opensea.io/${address.toLowerCase()}/${tokenId}.png`);
	};

	return (
		<View style={renderFull ? styles.fullWrapper : [styles.listWrapper, containerStyle]}>
			{collectible?.image?.length !== 0 ? (
				<RemoteImage
					fadeIn
					resizeMode={'contain'}
					placeholderStyle={{ backgroundColor: colors.white }}
					source={{ uri: fallbackImage || collectible.image }}
					style={renderFull ? styles.fullImage : [styles.listImage, iconStyle]}
					onError={fallback}
				/>
			) : (
				<Identicon address={collectible.address + collectible.tokenId} customStyle={iconStyle} />
			)}
		</View>
	);
}

CollectibleImage.propTypes = {
	/**
	 * Collectible object (in this case ERC721 token)
	 */
	collectible: PropTypes.object,
	/**
	 * Whether collectible image has to render in full size
	 */
	renderFull: PropTypes.bool,
	/**
	 * Container view style
	 */
	containerStyle: PropTypes.object,
	/**
	 * Image style
	 */
	iconStyle: PropTypes.object
};
