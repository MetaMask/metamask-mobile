import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import RemoteImage from '../../Base/RemoteImage';
import Identicon from '../Identicon';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
	smallImage: {
		width: 50,
		height: 50
	},
	bigImage: {
		height: 260,
		width: 260
	}
});

/**
 * View that renders an ERC-721 Token image
 */
export default function CollectibleImage({ collectible, small, big, iconStyle }) {
	const [fallbackImage, setFallbackImage] = useState(null);

	const fallback = () => {
		const { address, tokenId } = collectible;
		setFallbackImage(`https://storage.opensea.io/${address.toLowerCase()}/${tokenId}.png`);
	};
	console.log('backgroundColor', collectible.backgroundColor);
	return (
		<View style={{ backgroundColor: `#${collectible.backgroundColor}` }}>
			{collectible?.image?.length !== 0 ? (
				<RemoteImage
					fadeIn
					resizeMode={'contain'}
					placeholderStyle={{ backgroundColor: colors.white }}
					source={{ uri: fallbackImage || collectible.image }}
					style={[small && styles.smallImage, big && styles.bigImage]}
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
	 * Image style
	 */
	iconStyle: PropTypes.object,
	small: PropTypes.bool,
	big: PropTypes.bool
};
