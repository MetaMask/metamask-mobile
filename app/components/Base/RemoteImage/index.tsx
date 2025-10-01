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
import Identicon from '../../UI/Identicon';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../selectors/networkController';
import {
  getTestNetImageByChainId,
  isLineaMainnetChainId,
  isMainNet,
  isSolanaMainnet,
  isTestNet,
} from '../../../util/networks';
import images from 'images/image-icons';
import { selectNetworkName } from '../../../selectors/networkInfos';

import { BadgeAnchorElementShape } from '../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.types';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import Logger from '../../../util/Logger';
import { toHex } from '@metamask/controller-utils';
import {
  CustomNetworkImgMapping,
  PopularList,
  UnpopularNetworkList,
} from '../../../util/networks/customNetworks';
import {
  Image,
  ImageContentFit,
  ImageErrorEventData,
  ImageLoadEventData,
} from 'expo-image';

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
    badgeWrapper: {
      flex: 1,
    },
    imageStyle: {
      width: '100%',
      height: '100%',
      borderRadius: 8,
    },
    detailedImageStyle: {
      borderRadius: 8,
    },
    textWrapper: {
      textAlign: 'center',
      marginTop: 16,
    },
    textWrapperIcon: {
      textAlign: 'center',
      fontSize: 18,
      marginTop: 16,
    },
  });

const RemoteImage: React.FC<RemoteImageProps> = (props) => {
  const [error, setError] = useState<string | undefined>(undefined);
  const source = resolveAssetSource(props.source);
  const ipfsGateway = useIpfsGateway();
  const styles = createStyles();
  const currentChainId = useSelector(selectChainId);
  // The chainId would be passed in props from parent for collectible media
  //TODO remove once migrated to TS and chainID is properly typed to hex
  const chainId = props.chainId ? toHex(props.chainId) : currentChainId;
  const networkName = useSelector(selectNetworkName);
  const [resolvedIpfsUrl, setResolvedIpfsUrl] = useState<string | false>(false);

  const uri =
    resolvedIpfsUrl ||
    (source.uri === undefined || source.uri?.startsWith('ipfs')
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
        if (!source.uri) {
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
  }, [source.uri, ipfsGateway]);

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

  const NetworkBadgeSource = useCallback(() => {
    if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);

    if (isMainNet(chainId)) return images.ETHEREUM;

    if (isLineaMainnetChainId(chainId)) return images['LINEA-MAINNET'];

    if (isSolanaMainnet(chainId)) return images.SOLANA;

    const unpopularNetwork = UnpopularNetworkList.find(
      (networkConfig) => networkConfig.chainId === chainId,
    );

    const popularNetwork = PopularList.find(
      (networkConfig) => networkConfig.chainId === chainId,
    );
    const network = unpopularNetwork || popularNetwork;
    const customNetworkImg = CustomNetworkImgMapping[chainId as `0x${string}`];

    if (network) {
      return network.rpcPrefs.imageSource;
    } else if (customNetworkImg) {
      return customNetworkImg;
    }
    return undefined;
  }, [chainId]);

  if (error && props.address) {
    return <Identicon address={props.address} customStyle={props.style} />;
  }

  const defaultImage = (
    <Image {...props} source={{ uri }} onLoad={onImageLoad} onError={onError} />
  );

  if (props.fadeIn) {
    const { style, ...restProps } = props;
    const showFullRatioImage = props.isFullRatio && dimensions;

    return (
      <FadeIn placeholderStyle={props.placeholderStyle}>
        {props.isTokenImage ? (
          <BadgeWrapper
            badgePosition={{
              bottom: 5,
              right: 5,
            }}
            anchorElementShape={BadgeAnchorElementShape.Rectangular}
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                imageSource={NetworkBadgeSource()}
                name={networkName}
                isScaled={false}
                size={showFullRatioImage ? AvatarSize.Md : AvatarSize.Xs}
              />
            }
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
          </BadgeWrapper>
        ) : (
          defaultImage
        )}
      </FadeIn>
    );
  }

  return defaultImage;
};

export default RemoteImage;
