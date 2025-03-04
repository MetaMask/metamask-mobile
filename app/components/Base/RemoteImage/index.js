import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Image,
  ViewPropTypes,
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import FadeIn from 'react-native-fade-in-image';
// eslint-disable-next-line import/default
import resolveAssetSource from 'react-native/Libraries/Image/resolveAssetSource';
import { SvgUri } from 'react-native-svg';
import isUrl from 'is-url';
import ComponentErrorBoundary from '../../UI/ComponentErrorBoundary';
import useIpfsGateway from '../../hooks/useIpfsGateway';
import { getFormattedIpfsUrl } from '@metamask/assets-controllers';
import Identicon from '../../UI/Identicon';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import { useSelector } from 'react-redux';
import {
  selectChainId,
  selectEvmTicker,
} from '../../../selectors/networkController';
import {
  getTestNetImageByChainId,
  isLineaMainnet,
  isMainNet,
  isSolanaMainnet,
  isTestNet,
} from '../../../util/networks';
import images from 'images/image-icons';
import { selectNetworkName } from '../../../selectors/networkInfos';

import { BadgeAnchorElementShape } from '../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.types';
import useSvgUriViewBox from '../../hooks/useSvgUriViewBox';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import Logger from '../../../util/Logger';

const createStyles = () =>
  StyleSheet.create({
    svgContainer: {
      overflow: 'hidden',
    },
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
  const isImageUrl = isUrl(props?.source?.uri);
  const ipfsGateway = useIpfsGateway();
  const styles = createStyles();
  const chainId = useSelector(selectChainId);
  const ticker = useSelector(selectEvmTicker);
  const networkName = useSelector(selectNetworkName);
  const [resolvedIpfsUrl, setResolvedIpfsUrl] = useState(false);

  const uri =
    resolvedIpfsUrl ||
    (source.uri === undefined || source.uri?.startsWith('ipfs')
      ? ''
      : source.uri);

  const onError = ({ nativeEvent: { error } }) => setError(error);

  const [dimensions, setDimensions] = useState(null);

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

  useEffect(() => {
    const calculateImageDimensions = (imageWidth, imageHeight) => {
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
    };

    Image.getSize(
      uri,
      (width, height) => {
        const { width: calculatedWidth, height: calculatedHeight } =
          calculateImageDimensions(width, height);
        setDimensions({ width: calculatedWidth, height: calculatedHeight });
      },
      () => {
        Logger.log('Failed to get image dimensions');
      },
    );
  }, [uri]);

  const NetworkBadgeSource = () => {
    if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);

    if (isMainNet(chainId)) return images.ETHEREUM;

    if (isLineaMainnet(chainId)) return images['LINEA-MAINNET'];

    if (isSolanaMainnet(chainId)) return images.SOLANA;

    return ticker ? images[ticker] : undefined;
  };
  const isSVG =
    source &&
    source.uri &&
    source.uri.match('.svg') &&
    (isImageUrl || resolvedIpfsUrl);

  const viewbox = useSvgUriViewBox(uri, isSVG);

  if (error && props.address) {
    return <Identicon address={props.address} customStyle={props.style} />;
  }

  if (isSVG) {
    const style = props.style || {};
    if (source.__packager_asset && typeof style !== 'number') {
      if (!style.width) {
        style.width = source.width;
      }
      if (!style.height) {
        style.height = source.height;
      }
    }

    return (
      <ComponentErrorBoundary
        onError={props.onError}
        componentLabel="RemoteImage-SVG"
      >
        <View style={{ ...style, ...styles.svgContainer }}>
          <SvgUri
            {...props}
            uri={uri}
            width={'100%'}
            height={'100%'}
            viewBox={viewbox}
          />
        </View>
      </ComponentErrorBoundary>
    );
  }

  if (props.fadeIn) {
    const { style, ...restProps } = props;
    const badge = {
      top: -4,
      right: -4,
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
                  <Image
                    source={{ uri }}
                    style={{
                      width: dimensions.width,
                      height: dimensions.height,
                      ...styles.detailedImageStyle,
                    }}
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
                    <Image
                      style={styles.imageStyle}
                      {...restProps}
                      source={{ uri }}
                      onError={onError}
                      resizeMode={'cover'}
                    />
                  </View>
                </BadgeWrapper>
              )}
            </View>
          </FadeIn>
        ) : (
          <FadeIn placeholderStyle={props.placeholderStyle}>
            <Image {...props} source={{ uri }} onError={onError} />
          </FadeIn>
        )}
      </>
    );
  }

  return <Image {...props} source={{ uri }} onError={onError} />;
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
};

export default RemoteImage;
