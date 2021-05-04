import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, ViewPropTypes, Text } from 'react-native';
import RemoteImage from '../../Base/RemoteImage';
import MediaPlayer from '../../Views/MediaPlayer';
import { colors, fontStyles } from '../../../styles/common';

const styles = StyleSheet.create({
	container(backgroundColor) {
		return {
			borderRadius: 8,
			backgroundColor: `#${backgroundColor}`
		};
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
	},
	textContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.grey100,
		borderRadius: 8
	},
	text: {
		...fontStyles.normal
	},
	textBig: {
		fontSize: 24
	},
	textSmall: {
		fontSize: 12
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
			<View style={[styles.textContainer, style, small && styles.smallImage, big && styles.bigImage]}>
				<Text style={[styles.text, small && styles.textSmall, big && styles.textBig]}>{`#${
					collectible.tokenId
				}`}</Text>
			</View>
		);
	}, [collectible, sourceUri, renderAnimation, style, small, big]);

	return <View style={styles.container(collectible.backgroundColor)}>{renderMedia()}</View>;
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
