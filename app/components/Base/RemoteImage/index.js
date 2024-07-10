import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Image, ViewPropTypes, View, StyleSheet } from 'react-native';
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
  selectTicker,
} from '../../../selectors/networkController';
import {
  getTestNetImageByChainId,
  isLineaMainnet,
  isMainNet,
  isTestNet,
} from '../../../util/networks';
import images from 'images/image-icons';
import { selectNetworkName } from '../../../selectors/networkInfos';
import { DEFAULT_BADGEWRAPPER_BADGEPOSITION } from '../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';

import { BadgeAnchorElementShape } from '../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.types';
import useSvgUriViewBox from '../../hooks/useSvgUriViewBox';

const createStyles = () =>
  StyleSheet.create({
    svgContainer: {
      overflow: 'hidden',
    },
    badgeWrapper: {
      // position: 'relative',
      flex: 1,
    },
    badgeElement: {
      position: 'absolute',
      top: 8,
      left: 5,
    },
    testImageStyle: {
      padding: 0,
      width: '100%',
      height: '100%',
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
  const ticker = useSelector(selectTicker);
  const networkName = useSelector(selectNetworkName);
  const resolvedIpfsUrl = useMemo(() => {
    try {
      const url = new URL(props.source.uri);
      if (url.protocol !== 'ipfs:') return false;
      const ipfsUrl = getFormattedIpfsUrl(ipfsGateway, props.source.uri, false);
      return ipfsUrl;
    } catch {
      return false;
    }
  }, [props.source.uri, ipfsGateway]);

  const uri = resolvedIpfsUrl || source.uri;

  const onError = ({ nativeEvent: { error } }) => setError(error);

  const NetworkBadgeSource = () => {
    if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);

    if (isMainNet(chainId)) return images.ETHEREUM;

    if (isLineaMainnet(chainId)) return images['LINEA-MAINNET'];

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
    return (
      <>
        {props.isTokenImage ? (
          <FadeIn placeholderStyle={props.placeholderStyle}>
            <View>
              <BadgeWrapper
                //  badgeElementStyle={styles.badgeElement}
                //    badgeWrapperStyle={styles.badgeWrapper}
                badgePosition={DEFAULT_BADGEWRAPPER_BADGEPOSITION}
                anchorElementShape={BadgeAnchorElementShape.Rectangular}
                badgeElement={
                  <Badge
                    variant={BadgeVariant.Network}
                    imageSource={NetworkBadgeSource()}
                    name={networkName}
                  />
                }
              >
                <Image
                  style={styles.testImageStyle}
                  {...props}
                  source={{ uri }}
                  onError={onError}
                />
              </BadgeWrapper>
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
};

export default RemoteImage;
