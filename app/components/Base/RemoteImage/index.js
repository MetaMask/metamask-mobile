import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Dimensions } from 'react-native';
import FadeIn from 'react-native-fade-in-image';
// eslint-disable-next-line import/default
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

import { ViewPropTypes } from 'deprecated-react-native-prop-types';
import { Image as ExpoImage } from 'expo-image';

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
  });

const RemoteImage = (props) => {
  const [error, setError] = useState(undefined);
  // Avoid using this component with animated SVG
  const source = resolveAssetSource(props.source);
  const ipfsGateway = useIpfsGateway();
  const styles = createStyles();
  const currentChainId = useSelector(selectChainId);
  // The chainId would be passed in props from parent for collectible media
  //TODO remove once migrated to TS and chainID is properly typed to hex
  const chainId = props.chainId ? toHex(props.chainId) : currentChainId;
  const networkName = useSelector(selectNetworkName);
  const [resolvedIpfsUrl, setResolvedIpfsUrl] = useState(false);

  const uri =
    resolvedIpfsUrl ||
    (source.uri === undefined || source.uri?.startsWith('ipfs')
      ? ''
      : source.uri);

  const onError = ({ error }) => setError(error);

  const [dimensions, setDimensions] = useState(null);

  const calculateImageDimensions = useCallback((imageWidth, imageHeight) => {
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
  }, []);

  const onImageLoad = useCallback(
    (event) => {
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

  useEffect(() => {
    resolveIpfsUrl();
    async function resolveIpfsUrl() {
      try {
        const url = new URL(props.source.uri);
        if (url.protocol !== 'ipfs:') setResolvedIpfsUrl(false);
        const ipfsUrl = await getFormattedIpfsUrl(
          ipfsGateway,
          props.source.uri,
          false,
        );
        setResolvedIpfsUrl(ipfsUrl);
      } catch (err) {
        setResolvedIpfsUrl(false);
      }
    }
  }, [props.source.uri, ipfsGateway]);

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
    const customNetworkImg = CustomNetworkImgMapping[chainId];

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

  if (props.fadeIn) {
    const { style, ...restProps } = props;
    const badge = {
      bottom: 5,
      right: 5,
    };
    return (
      <>
        {props.isTokenImage ? (
          <FadeIn placeholderStyle={props.placeholderStyle}>
            <View>
              {props.isFullRatio && dimensions ? (
                <BadgeWrapper
                  badgePosition={badge}
                  anchorElementShape={BadgeAnchorElementShape.Rectangular}
                  badgeElement={
                    <Badge
                      variant={BadgeVariant.Network}
                      imageSource={NetworkBadgeSource()}
                      name={networkName}
                      isScaled={false}
                      size={AvatarSize.Md}
                    />
                  }
                >
                  <ExpoImage
                    source={{ uri }}
                    style={{
                      width: dimensions.width,
                      height: dimensions.height,
                      ...styles.detailedImageStyle,
                    }}
                    onLoad={onImageLoad}
                    onError={onError}
                  />
                </BadgeWrapper>
              ) : (
                <BadgeWrapper
                  badgePosition={badge}
                  anchorElementShape={BadgeAnchorElementShape.Rectangular}
                  badgeElement={
                    <Badge
                      variant={BadgeVariant.Network}
                      imageSource={NetworkBadgeSource()}
                      name={networkName}
                      isScaled={false}
                      size={AvatarSize.Xs}
                    />
                  }
                >
                  <View style={style}>
                    <ExpoImage
                      style={styles.imageStyle}
                      {...restProps}
                      source={{ uri }}
                      onLoad={onImageLoad}
                      onError={onError}
                      contentFit={'cover'}
                    />
                  </View>
                </BadgeWrapper>
              )}
            </View>
          </FadeIn>
        ) : (
          <FadeIn placeholderStyle={props.placeholderStyle}>
            <ExpoImage
              {...props}
              source={{ uri }}
              onLoad={onImageLoad}
              onError={onError}
            />
          </FadeIn>
        )}
      </>
    );
  }

  return (
    <ExpoImage
      {...props}
      source={{ uri }}
      onLoad={onImageLoad}
      onError={onError}
    />
  );
};

RemoteImage.propTypes = {
  /**
   * Flag that determines the fade in behavior
   */
  fadeIn: PropTypes.bool,
  /**
   * Source of the image
   */
  source: PropTypes.any,
  /**
   * Style for the image
   */
  style: ViewPropTypes.style,
  /**
   * Style for the placeholder (used for fadeIn)
   */
  placeholderStyle: ViewPropTypes.style,
  /**
   * Called when there is an error
   */
  onError: PropTypes.func,
  /**
   * This is set if we know that an image is remote
   */
  isUrl: PropTypes.bool,
  /**
   * Token address
   */
  address: PropTypes.string,

  isTokenImage: PropTypes.bool,

  isFullRatio: PropTypes.bool,
  chainId: PropTypes.string,
};

export default RemoteImage;
