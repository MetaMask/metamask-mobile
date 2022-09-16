import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, ViewPropTypes } from 'react-native';
import RemoteImage from '../../Base/RemoteImage';
import MediaPlayer from '../../Views/MediaPlayer';
import scaling from '../../../util/scaling';
import Text from '../../Base/Text';
import Device from '../../../util/device';
import { useTheme } from '../../../util/theme';

const MEDIA_WIDTH_MARGIN = Device.isMediumDevice() ? 32 : 0;

const createStyles = (colors) =>
  StyleSheet.create({
    container(backgroundColor) {
      return {
        flex: 0,
        borderRadius: 12,
        backgroundColor: `#${backgroundColor}`,
      };
    },
    tinyImage: {
      width: 32,
      height: 32,
    },
    smallImage: {
      width: 50,
      height: 50,
    },
    bigImage: {
      height: 260,
      width: 260,
    },
    cover: {
      height: scaling.scale(Device.getDeviceWidth() - MEDIA_WIDTH_MARGIN, {
        baseModel: 2,
      }),
    },
    image: {
      borderRadius: 12,
    },
    textContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
    },
    textWrapper: {
      textAlign: 'center',
    },
    textWrapperIcon: {
      textAlign: 'center',
      fontSize: 18,
    },
    mediaPlayer: {
      minHeight: 10,
    },
  });

/**
 * View that renders an ERC-721 Token image
 */
export default function CollectibleMedia({
  collectible,
  renderAnimation,
  style,
  tiny,
  small,
  big,
  cover,
  onClose,
}) {
  const [sourceUri, setSourceUri] = useState(null);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const fallback = () => setSourceUri(null);

  useEffect(() => {
    const { image, imagePreview, address } = collectible;
    if (address) {
      if (small && imagePreview && imagePreview !== '')
        setSourceUri(imagePreview);
      else setSourceUri(image);
    }
  }, [collectible, small, big, setSourceUri]);

  const renderMedia = useCallback(() => {
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
          cover && styles.cover,
        ]}
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
    );
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
  ]);

  return (
    <View style={styles.container(collectible.backgroundColor)}>
      {renderMedia()}
    </View>
  );
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
  onClose: PropTypes.func,
};
