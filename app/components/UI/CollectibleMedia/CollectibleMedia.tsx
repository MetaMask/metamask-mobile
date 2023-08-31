/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import RemoteImage from '../../Base/RemoteImage';
import MediaPlayer from '../../Views/MediaPlayer';
import Text from '../../Base/Text';
import { useTheme } from '../../../util/theme';
import { isIPFSUri } from '../../../util/general';
import { useSelector } from 'react-redux';
import {
  selectDisplayNftMedia,
  selectIsIpfsGatewayEnabled,
} from '../../../selectors/preferencesController';
import createStyles from './CollectibleMedia.styles';
import { CollectibleMediaProps } from './CollectibleMedia.types';
import NftFallbackImage from '../../../../docs/assets/nft-fallback.png';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import Button from '../../../component-library/components/Buttons/Button/Button';
import { strings } from '../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';

const CollectibleMedia: React.FC<CollectibleMediaProps> = ({
  collectible,
  renderAnimation,
  style,
  tiny,
  small,
  big,
  cover,
  onClose,
  onPressColectible,
}) => {
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const { colors } = useTheme();
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);
  const displayNftMedia = useSelector(selectDisplayNftMedia);
  const { navigate } = useNavigation();

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

  const formatTokenId = (tokenId: number) => {
    if (tokenId.toString().length > 9) {
      return tokenId.toString().replace(/^(..).*?(.{4})$/, '$1...$2');
    }
    return tokenId;
  };

  const pressNft = useCallback(() => {
    if (cover) {
      if (isIPFSUri(sourceUri) || isIPFSUri(collectible.tokenURI)) {
        navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.SHEET.SHOW_NFT,
        });
      } else {
        navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.SHEET.SHOW_NFT_DISPLAY_MEDIA,
        });
      }
    } else {
      onPressColectible?.();
    }
  }, [cover, navigate, onPressColectible, sourceUri, collectible.tokenURI]);

  const renderFallback = useCallback(
    (isImageSourcePossiblyAvailable: boolean) =>
      isImageSourcePossiblyAvailable ? (
        <View>
          <RemoteImage
            source={NftFallbackImage}
            style={[
              styles.textContainer,
              style,
              tiny && styles.tinyImage,
              small && styles.smallImage,
              big && styles.bigImage,
              cover && styles.cover,
            ]}
            testID="fallback-nft-ipfs"
          />
          <View style={styles.imageFallBackTextContainer}>
            <Text style={styles.imageFallBackText}>
              {collectible.tokenId
                ? ` #${formatTokenId(collectible.tokenId)}`
                : ''}
            </Text>
          </View>
          {(onPressColectible || cover) && (
            <View
              style={
                cover
                  ? styles.imageFallBackShowContainerCover
                  : styles.imageFallBackShowContainer
              }
            >
              <Button
                variant={ButtonVariants.Link}
                style={styles.imageFallBackShowText}
                onPress={pressNft}
                label={strings('choose_password.show')}
                size={cover ? ButtonSize.Lg : ButtonSize.Auto}
              />
            </View>
          )}
        </View>
      ) : (
        <View
          style={[
            styles.textContainer,
            style,
            tiny && styles.tinyImage,
            small && styles.smallImage,
            big && styles.bigImage,
            cover && styles.cover,
          ]}
          testID="fallback-nft-with-token-id"
        >
          <Text
            big={big}
            small={tiny ?? small}
            style={tiny ? styles.textWrapperIcon : styles.textWrapper}
          >
            {collectible.tokenId
              ? ` #${formatTokenId(collectible.tokenId)}`
              : ''}
          </Text>
        </View>
      ),
    [
      styles,
      style,
      cover,
      big,
      small,
      tiny,
      collectible,
      onPressColectible,
      pressNft,
    ],
  );

  const renderMedia = useCallback(() => {
    // if display nft media is true, show all media
    // if display nft media is false and ipfs gateway is true, show all ipfs media
    // if both false, the fallback is true
    // if both true, but no sourceURI render fallback(false)

    if (
      displayNftMedia ||
      (!displayNftMedia && isIpfsGatewayEnabled && isIPFSUri(sourceUri))
    ) {
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
      }
      if (sourceUri) {
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

      return renderFallback(false);
    }

    if (!displayNftMedia || !isIpfsGatewayEnabled) {
      return renderFallback(true);
    }
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
    displayNftMedia,
  ]);

  return (
    <View style={styles.container(collectible.backgroundColor)}>
      {renderMedia()}
    </View>
  );
};

export default CollectibleMedia;
