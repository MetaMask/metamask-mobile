import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, ViewPropTypes } from 'react-native';
import RemoteImage from '../../Base/RemoteImage';
import Identicon from '../Identicon';
import MediaPlayer from '../../Views/MediaPlayer';

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
	},
	image: {
		borderRadius: 12
	}
});

/**
 * View that renders an ERC-721 Token image
 */
export default function CollectibleMedia({ collectible, renderAnimation, style, small, big }) {
	const [sourceUri, setSourceUri] = useState(null);

	const fallback = () => setSourceUri(null);

	useEffect(() => {
		const { image, imagePreview } = collectible;
		if (small && imagePreview && imagePreview !== '') setSourceUri(imagePreview);
		else setSourceUri(image);
	}, [collectible, small, big, setSourceUri]);

	const renderMedia = useCallback(() => {
		if (renderAnimation && collectible.animation) {
			return <MediaPlayer uri={collectible.animation} style={styles.bigImage} />;
		} else if (sourceUri) {
			return (
				<RemoteImage
					fadeIn
					resizeMode={'contain'}
					source={{ uri: sourceUri }}
					style={[styles.image, small && styles.smallImage, big && styles.bigImage, style]}
					onError={fallback}
				/>
			);
		}
		return (
			<Identicon
				diameter={(big && styles.bigImage.width) || styles.smallImage.width}
				address={collectible.address + collectible.tokenId}
			/>
		);
	}, [collectible, sourceUri, renderAnimation, style, small, big]);

	return (
		<View style={[styles.container, { backgroundColor: `#${collectible.backgroundColor}` }]}>{renderMedia()}</View>
	);
}

CollectibleMedia.propTypes = {
	/**
	 * Collectible object (in this case ERC721 token)
	 */
	collectible: PropTypes.object,
	/**
	 * Whether is small size or not
	 */
	small: PropTypes.bool,
	/**
	 * Whether is big size or not
	 */
	big: PropTypes.bool,
	/**
	 * Whether render animation or not, if any
	 */
	renderAnimation: PropTypes.bool,
	/**
	 * Custom style object
	 */
	style: ViewPropTypes.style
};
