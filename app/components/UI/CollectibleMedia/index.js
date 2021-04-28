import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import RemoteImage from '../../Base/RemoteImage';
import Identicon from '../Identicon';
import MediaReproductor from '../../Views/MediaReproductor';

const styles = StyleSheet.create({
	container: {
		borderRadius: 8
	},
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
export default function CollectibleMedia({ collectible, small, big }) {
	const [sourceUri, serSourceUri] = useState(null);

	const fallback = () => {
		serSourceUri(null);
	};

	useEffect(() => {
		let source = collectible.image;
		if (small && collectible.imagePreview && collectible.imagePreview !== '') {
			source = collectible.imagePreview;
		}

		serSourceUri(source);
	}, [collectible, small, big, serSourceUri]);

	let child;
	if (big && collectible.animation) {
		child = <MediaReproductor uri={collectible.animation} style={styles.bigImage} />;
	} else if (sourceUri) {
		child = (
			<RemoteImage
				fadeIn
				resizeMode={'contain'}
				source={{ uri: sourceUri }}
				style={[small && styles.smallImage, big && styles.bigImage]}
				onError={fallback}
			/>
		);
	} else {
		child = <Identicon address={collectible.address + collectible.tokenId} />;
	}
	return <View style={[styles.container, { backgroundColor: `#${collectible.backgroundColor}` }]}>{child}</View>;
}

CollectibleMedia.propTypes = {
	/**
	 * Collectible object (in this case ERC721 token)
	 */
	collectible: PropTypes.object,
	small: PropTypes.bool,
	big: PropTypes.bool
};
