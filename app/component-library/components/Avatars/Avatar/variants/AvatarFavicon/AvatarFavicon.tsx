/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useEffect, useState } from 'react';
import { Image, ImageErrorEventData, NativeSyntheticEvent } from 'react-native';
import { SvgUri } from 'react-native-svg';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import Icon from '../../../../Icons/Icon';
import { ICONSIZE_BY_AVATARSIZE } from '../../Avatar.constants';
import AvatarBase from '../../foundation/AvatarBase';

// Internal dependencies.
import { isFaviconSVG } from '../../../../../../util/favicon';
import {
  AVATARFAVICON_IMAGE_TESTID,
  DEFAULT_AVATARFAVICON_ERROR_ICON,
  DEFAULT_AVATARFAVICON_SIZE,
} from './AvatarFavicon.constants';
import stylesheet from './AvatarFavicon.styles';
import { AvatarFaviconProps } from './AvatarFavicon.types';

const AvatarFavicon = ({
  imageSource,
  size = DEFAULT_AVATARFAVICON_SIZE,
  style,
  ...props
}: AvatarFaviconProps) => {
  const isRequireSource = !!(imageSource && typeof imageSource === 'number');
  const isRemoteSource = !!(
    imageSource &&
    typeof imageSource === 'object' &&
    'uri' in imageSource
  );
  const isValidSource = isRequireSource || isRemoteSource;
  const [error, setError] = useState<Error | undefined>(undefined);
  const [svgSource, setSvgSource] = useState<string>('');
  const { styles } = useStyles(stylesheet, { style });

  const onError = useCallback(
    (e: NativeSyntheticEvent<ImageErrorEventData>) =>
      setError(e.nativeEvent?.error),
    [setError],
  );

  const onSvgError = useCallback((e: Error) => setError(e), [setError]);

  // TODO add the fallback with uppercase letter initial
  //  requires that the domain is passed in as a prop from the parent
  const renderFallbackFavicon = () => (
    <Icon
      size={ICONSIZE_BY_AVATARSIZE[size]}
      name={DEFAULT_AVATARFAVICON_ERROR_ICON}
    />
  );

  // Checks if image is SVG
  useEffect(() => {
    if (!isRemoteSource) return;

    const checkSvgContentType = async (uri: string) => {
      try {
        const response = await fetch(uri, { method: 'HEAD' });
        const contentType = response.headers.get('Content-Type');
        return contentType?.includes('image/svg+xml');
      } catch (_) {
        return false;
      }
    };

    const svg = isFaviconSVG(imageSource);
    if (svg) {
      checkSvgContentType(svg).then((isSvg) => {
        if (isSvg) {
          setSvgSource(svg);
        }
      });
    }
  }, [imageSource, isRemoteSource]);

  const renderSvg = () =>
    svgSource ? (
      <SvgUri
        testID={AVATARFAVICON_IMAGE_TESTID}
        width="100%"
        height="100%"
        uri={svgSource}
        style={styles.image}
        onError={(e: unknown) => onSvgError(e as Error)}
      />
    ) : null;

  const renderImage = () => (
    <Image
      testID={AVATARFAVICON_IMAGE_TESTID}
      source={imageSource}
      style={styles.image}
      resizeMode={'contain'}
      onError={onError}
    />
  );

  const renderFavicon = () => (svgSource ? renderSvg() : renderImage());

  return (
    <AvatarBase size={size} style={styles.base} {...props}>
      {error || !isValidSource ? renderFallbackFavicon() : renderFavicon()}
    </AvatarBase>
  );
};

export default AvatarFavicon;
