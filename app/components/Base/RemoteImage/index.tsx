import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ImageSourcePropType,
  StyleProp,
} from 'react-native';
import FadeIn from 'react-native-fade-in-image';
// @ts-expect-error - resolveAssetSource has no type definitions
import resolveAssetSource from 'react-native/Libraries/Image/resolveAssetSource';
import useIpfsGateway from '../../hooks/useIpfsGateway';
import { getFormattedIpfsUrl } from '@metamask/assets-controllers';
import Logger from '../../../util/Logger';
import {
  Image,
  ImageContentFit,
  ImageErrorEventData,
  ImageLoadEventData,
} from 'expo-image';
import RemoteImageBadgeWrapper from './RemoteImageBadgeWrapper';
import Identicon from '../../UI/Identicon';

interface RemoteImageProps {
  fadeIn?: boolean;
  source?: ImageSourcePropType | { uri?: string };
  style?: StyleProp<object>;
  placeholderStyle?: StyleProp<object>;
  onError?: () => void;
  isUrl?: boolean;
  address?: string;
  isTokenImage?: boolean;
  isFullRatio?: boolean;
  chainId?: number;
  testID?: string;
  contentFit?: ImageContentFit;
}

const createStyles = () =>
  StyleSheet.create({
    imageStyle: {
      width: '100%',
      height: '100%',
      borderRadius: 8,
    },
    detailedImageStyle: {
      borderRadius: 8,
    },
  });

const RemoteImage: React.FC<RemoteImageProps> = (props) => {
  const [error, setError] = useState<string | undefined>(undefined);
  const source = resolveAssetSource(props.source);
  const ipfsGateway = useIpfsGateway();
  const styles = createStyles();
  const [resolvedIpfsUrl, setResolvedIpfsUrl] = useState<string | false>(false);

  const uri =
    resolvedIpfsUrl ||
    (!source || source.uri === undefined || source.uri?.startsWith('ipfs')
      ? ''
      : source.uri);

  const onError = (event: ImageErrorEventData) => setError(event.error);

  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    async function resolveIpfsUrl() {
      try {
        if (!source?.uri) {
          setResolvedIpfsUrl(false);
          return;
        }
        const url = new URL(source.uri);
        if (url.protocol !== 'ipfs:') setResolvedIpfsUrl(false);
        const ipfsUrl = await getFormattedIpfsUrl(
          ipfsGateway,
          source.uri,
          false,
        );
        setResolvedIpfsUrl(ipfsUrl || false);
      } catch (err) {
        setResolvedIpfsUrl(false);
      }
    }
    resolveIpfsUrl();
  }, [source?.uri, ipfsGateway]);

  const calculateImageDimensions = useCallback(
    (imageWidth: number, imageHeight: number) => {
      const deviceWidth = Dimensions.get('window').width;
      const maxWidth = deviceWidth - 32;
      const maxHeight = 0.75 * maxWidth;

      if (imageWidth > imageHeight) {
        // Horizontal image
        const width = maxWidth;
        const height = (imageHeight / imageWidth) * maxWidth;
        return { width, height };
      } else if (imageHeight > imageWidth) {
        // Vertical image
        const height = maxHeight;
        const width = (imageWidth / imageHeight) * maxHeight;
        return { width, height };
      }
      // Square image
      return { width: maxHeight, height: maxHeight };
    },
    [],
  );

  const onImageLoad = useCallback(
    (event: ImageLoadEventData) => {
      try {
        const { width, height } = event.source;
        if (width && height) {
          const { width: calculatedWidth, height: calculatedHeight } =
            calculateImageDimensions(width, height);
          setDimensions({ width: calculatedWidth, height: calculatedHeight });
        }
      } catch (err) {
        Logger.log('Failed to get image dimensions');
      }
    },
    [calculateImageDimensions],
  );

  if (error && props.address) {
    return <Identicon address={props.address} customStyle={props.style} />;
  }

  const defaultImage = (
    <Image {...props} source={{ uri }} onLoad={onImageLoad} onError={onError} />
  );

  if (props.fadeIn) {
    const { style, ...restProps } = props;
    const showFullRatioImage = !!(props.isFullRatio && dimensions);

    return (
      <FadeIn placeholderStyle={props.placeholderStyle}>
        {props.isTokenImage ? (
          <RemoteImageBadgeWrapper
            chainId={props.chainId}
            isFullRatio={showFullRatioImage}
          >
            {showFullRatioImage ? (
              <Image
                source={{ uri }}
                style={{
                  width: dimensions.width,
                  height: dimensions.height,
                  ...styles.detailedImageStyle,
                }}
                onLoad={onImageLoad}
                onError={onError}
              />
            ) : (
              <View style={style}>
                <Image
                  style={styles.imageStyle}
                  {...restProps}
                  source={{ uri }}
                  onLoad={onImageLoad}
                  onError={onError}
                />
              </View>
            )}
          </RemoteImageBadgeWrapper>
        ) : (
          defaultImage
        )}
      </FadeIn>
    );
  }

  return defaultImage;
};

export default RemoteImage;
