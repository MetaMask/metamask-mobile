import React, { useEffect, useMemo, useState } from 'react';
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

const createStyles = () =>
  StyleSheet.create({
    svgContainer: {
      overflow: 'hidden',
    },
  });

/**
 * Support svg images urls that do not have a view box
 * See: https://github.com/software-mansion/react-native-svg/issues/1202#issuecomment-1891110599
 * @param {string} uri - uri to fetch
 * @param {boolean} isSVG - check to see if the uri is an svg
 * @returns {string | undefined} viewbox
 */
export function useSVGViewBox(uri, isSVG) {
  const [viewBox, setViewBox] = useState(undefined);

  useEffect(() => {
    if (!isSVG) {
      return;
    }

    fetch(uri)
      .then((response) => response.text())
      .then((svgContent) => {
        const widthMatch = svgContent.match(/width="([^"]+)"/);
        const heightMatch = svgContent.match(/height="([^"]+)"/);
        const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);

        // Image already has a view box, no additional work required
        if (viewBoxMatch) {
          return;
        }

        if (widthMatch && heightMatch) {
          const width = widthMatch[1];
          const height = heightMatch[1];
          setViewBox(`0 0 ${width} ${height}`);
        }
      })
      .catch((error) => console.error('Error fetching SVG:', error));
  }, [isSVG, uri]);

  if (!viewBox) {
    return undefined;
  }

  return viewBox;
}

const RemoteImage = (props) => {
  const [error, setError] = useState(undefined);
  // Avoid using this component with animated SVG
  const source = resolveAssetSource(props.source);
  const isImageUrl = isUrl(props?.source?.uri);
  const ipfsGateway = useIpfsGateway();
  const styles = createStyles();
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

  const isSVG =
    source &&
    source.uri &&
    source.uri.match('.svg') &&
    (isImageUrl || resolvedIpfsUrl);

  const viewbox = useSVGViewBox(uri, isSVG);

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
      <FadeIn placeholderStyle={props.placeholderStyle}>
        <Image {...props} source={{ uri }} onError={onError} />
      </FadeIn>
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
};

export default RemoteImage;
