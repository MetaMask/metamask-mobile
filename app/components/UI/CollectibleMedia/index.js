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
			borderRadius: 8,
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
	textWrapper: {
		textAlign: 'center'
	}
});

/**
 * View that renders an ERC-721 Token image
 */
export default function CollectibleMedia({ collectible, renderAnimation, style, tiny, small, big }) {
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
					style={[
						styles.image,
						tiny && styles.tinyImage,
						small && styles.smallImage,
						big && styles.bigImage,
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
					big && styles.bigImage
				]}
			>
				<Text big={big} small={tiny || small} style={styles.textWrapper}>{`${collectible.name || ''} #${
					collectible.tokenId
				}`}</Text>
			</View>
		);
	}, [collectible, sourceUri, renderAnimation, style, tiny, small, big]);

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
	 * Custom style object
	 */
	style: ViewPropTypes.style
};
