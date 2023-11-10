/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useMemo, useState } from 'react';
import { Image, ImageErrorEventData, NativeSyntheticEvent } from 'react-native';
import { SvgUri } from 'react-native-svg';

// External dependencies.
import AvatarBase from '../../foundation/AvatarBase';
import { useStyles } from '../../../../../hooks';
import Icon from '../../../../Icons/Icon';
import { ICONSIZE_BY_AVATARSIZE } from '../../Avatar.constants';

// Internal dependencies.
import { AvatarFaviconProps } from './AvatarFavicon.types';
import {
  DEFAULT_AVATARFAVICON_SIZE,
  DEFAULT_AVATARFAVICON_ERROR_ICON,
  AVATARFAVICON_IMAGE_TESTID,
} from './AvatarFavicon.constants';
import stylesheet from './AvatarFavicon.styles';
import { isNumber } from 'lodash';
import { isFaviconSVG } from '../../../../../../util/favicon';

const AvatarFavicon = ({
  imageSource,
  size = DEFAULT_AVATARFAVICON_SIZE,
  style,
  ...props
}: AvatarFaviconProps) => {
  const [error, setError] = useState<any>(undefined);
  const { styles } = useStyles(stylesheet, { style });

  const onError = useCallback(
    (e: NativeSyntheticEvent<ImageErrorEventData>) =>
      setError(e.nativeEvent.error),
    [setError],
  );

  const onSvgError = useCallback((e: any) => setError(e), [setError]);

  // TODO add the fallback with uppercase letter initial
  //  requires that the domain is passed in as a prop from the parent
  const renderFallbackFavicon = () => (
    <Icon
      size={ICONSIZE_BY_AVATARSIZE[size]}
      name={DEFAULT_AVATARFAVICON_ERROR_ICON}
    />
  );

  const svgSource = useMemo(() => {
    if (imageSource && !isNumber(imageSource) && 'uri' in imageSource) {
      return isFaviconSVG(imageSource);
    }
  }, [imageSource]);

  const renderSvg = () =>
    svgSource ? (
      <SvgUri
        testID={AVATARFAVICON_IMAGE_TESTID}
        width="100%"
        height="100%"
        uri={svgSource}
        style={styles.image}
        onError={onSvgError}
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
      {error ? renderFallbackFavicon() : renderFavicon()}
    </AvatarBase>
  );
};

export default AvatarFavicon;
