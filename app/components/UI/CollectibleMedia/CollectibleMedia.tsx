/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import RemoteImage from '../../Base/RemoteImage';
import MediaPlayer from '../../Views/MediaPlayer';
import Text from '../../Base/Text';
import { useTheme } from '../../../util/theme';
import { isIPFSUri } from '../../../util/general';
import { useSelector } from 'react-redux';
import { selectIsIpfsGatewayEnabled } from '../../../selectors/preferencesController';
import createStyles from './CollectibleMedia.styles';
import { CollectibleMediaProps } from './CollectibleMedia.types';

const CollectibleMedia: React.FC<CollectibleMediaProps> = ({
  collectible,
  renderAnimation,
  style,
  tiny,
  small,
  big,
  cover,
  onClose,
}) => {
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const { colors } = useTheme();
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);

  const styles = createStyles(colors);

  const fallback = useCallback(() => setSourceUri(null), []);

  useEffect(() => {
    const { image, imagePreview, address } = collectible;
    if (address) {
      if (small && imagePreview && imagePreview !== '')
        setSourceUri(imagePreview);
      else setSourceUri(image);
    }
  }, [collectible, small, big, setSourceUri]);

  const renderFallback = useCallback(
    () => (
      <View
        style={[
          styles.textContainer,
          style,
          tiny && styles.tinyImage,
          small && styles.smallImage,
          big && styles.bigImage,
          cover && styles.cover,
        ]}
        testID="fallback-collectible"
      >
        <Text
          big={big}
          small={tiny || small}
          style={tiny ? styles.textWrapperIcon : styles.textWrapper}
        >
          {tiny
            ? collectible.name[0] || 'C'
            : `${collectible.name || ''} #${collectible.tokenId}`}
        </Text>
      </View>
    ),
    [styles, style, cover, big, small, tiny, collectible],
  );

  const renderMedia = useCallback(() => {
    if (sourceUri) {
      if (isIPFSUri(sourceUri) && !isIpfsGatewayEnabled) {
        // This will change to a ipfsDisabledFallback on future changes
        return renderFallback();
      }
    }
    if (
      renderAnimation &&
      collectible.animation &&
      collectible.animation.includes('.mp4')
    ) {
      return (
        <MediaPlayer
          onClose={onClose}
          uri={collectible.animation}
          style={[styles.mediaPlayer, cover && styles.cover, style]}
        />
      );
    } else if (sourceUri) {
      /*
       * the tiny boolean is used to indicate when the image is the NFT source icon
       */
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
            style,
          ]}
          onError={fallback}
          testID="nft-image"
        />
      );
    }

    return renderFallback();
  }, [
    collectible,
    sourceUri,
    onClose,
    renderAnimation,
    style,
    tiny,
    small,
    big,
    cover,
    styles,
    isIpfsGatewayEnabled,
    renderFallback,
    fallback,
  ]);

  return (
    <View style={styles.container(collectible.backgroundColor)}>
      {renderMedia()}
    </View>
  );
};

export default CollectibleMedia;
