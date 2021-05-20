import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, ViewPropTypes } from 'react-native';
import RemoteImage from '../../Base/RemoteImage';
import MediaPlayer from '../../Views/MediaPlayer';
import { colors } from '../../../styles/common';
import Text from '../../Base/Text';

const styles = StyleSheet.create({
	container(backgroundColor) {
		return {
			flex: 0,
			backgroundColor: `#${backgroundColor}`
		};
	},
	tinyImage: {
		width: 32,
		height: 32
	},
	smallImage: {
		width: 50,
		height: 50
	},
	bigImage: {
		height: 260,
		width: 260
	},
	cover: {
		height: '100%'
	},
	image: {
		borderRadius: 12
	},
	textContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.grey100,
		borderRadius: 8
	},
	textWrapper: {
		textAlign: 'center'
	},
	mediaPlayer: {
		minHeight: 10
	}
});

/**
 * View that renders an ERC-721 Token image
 */
export default function CollectibleMedia({ collectible, renderAnimation, style, tiny, small, big, cover, onClose }) {
	const [sourceUri, setSourceUri] = useState(null);

	const fallback = () => setSourceUri(null);

	useEffect(() => {
		const { image, imagePreview } = collectible;
		if (small && imagePreview && imagePreview !== '') setSourceUri(imagePreview);
		else setSourceUri(image);
	}, [collectible, small, big, setSourceUri]);

	const renderMedia = useCallback(() => {
		if (renderAnimation && collectible.animation && collectible.animation.includes('.mp4')) {
			return (
				<MediaPlayer
					onClose={onClose}
					uri={collectible.animation}
					style={[styles.mediaPlayer, cover && styles.cover, style]}
				/>
			);
		} else if (sourceUri) {
			return (
				<RemoteImage
					fadeIn
					resizeMode={'contain'}
					source={{ uri: sourceUri }}
					style={[
						styles.image,
						tiny && styles.tinyImage,
						small && styles.smallImage,
						big && styles.bigImage,
						cover && styles.cover,
						style
					]}
					onError={fallback}
				/>
			);
		}
		return (
			<View
				style={[
					styles.textContainer,
					style,
					tiny && styles.tinyImage,
					small && styles.smallImage,
					big && styles.bigImage,
					cover && styles.cover
				]}
			>
				<Text big={big} small={tiny || small} style={styles.textWrapper}>{`${collectible.name || ''} #${
					collectible.tokenId
				}`}</Text>
			</View>
		);
	}, [collectible, sourceUri, onClose, renderAnimation, style, tiny, small, big, cover]);

	return <View style={styles.container(collectible.backgroundColor)}>{renderMedia()}</View>;
}

CollectibleMedia.propTypes = {
	/**
	 * Collectible object (in this case ERC721 token)
	 */
	collectible: PropTypes.object,
	/**
	 * Whether is tiny size or not
	 */
	tiny: PropTypes.bool,
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
	 * Whether the media should cover the whole screen width
	 */
	cover: PropTypes.bool,
	/**
	 * Custom style object
	 */
	style: ViewPropTypes.style,
	/**
	 * On close callback
	 */
	onClose: PropTypes.func
};
