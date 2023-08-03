/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useMemo, useState } from 'react';
import { Image, ImageErrorEventData, NativeSyntheticEvent } from 'react-native';
import { SvgUri } from 'react-native-svg';

// External dependencies.
import AvatarBase from '../../foundation/AvatarBase';
import { AvatarSize } from '../../Avatar.types';
import { useStyles } from '../../../../../hooks';
import Icon, { IconName } from '../../../../Icons/Icon';

// Internal dependencies.
import { AvatarFaviconProps } from './AvatarFavicon.types';
import {
  ICON_SIZE_BY_AVATAR_SIZE,
  FAVICON_AVATAR_IMAGE_ID,
} from './AvatarFavicon.constants';
import stylesheet from './AvatarFavicon.styles';
import { isNumber, isObject } from 'lodash';

const AvatarFavicon = ({
  imageSource,
  size = AvatarSize.Md,
  style,
}: AvatarFaviconProps) => {
  const [error, setError] = useState<any>(undefined);
  const { styles } = useStyles(stylesheet, { style, error });

  // reset error when imageSource changes
  useMemo(() => {
    setError(undefined);
    if (
      !imageSource ||
      (isObject(imageSource) && (!('uri' in imageSource) || !imageSource.uri))
    ) {
      setError('undefined image source');
    }
  }, [imageSource]);

  const onError = useCallback(
    (e: NativeSyntheticEvent<ImageErrorEventData>) =>
      setError(e.nativeEvent.error),
    [setError],
  );

  const onSvgError = useCallback((e: any) => setError(e), [setError]);

  //TODO add the fallback with uppercase letter initial
  const fallbackFavicon = useMemo(
    () => <Icon size={ICON_SIZE_BY_AVATAR_SIZE[size]} name={IconName.Global} />,
    [size],
  );

  const svgSource = useMemo(() => {
    if (imageSource && !isNumber(imageSource) && 'uri' in imageSource) {
      if (
        imageSource.uri?.endsWith('.svg') ||
        imageSource.uri?.startsWith('data:image/svg+xml')
      ) {
        return imageSource.uri;
      }
    }
  }, [imageSource]);

  const favicon = useMemo(
    () =>
      svgSource ? (
        <SvgUri
          testID={FAVICON_AVATAR_IMAGE_ID}
          width="100%"
          height="100%"
          uri={svgSource}
          style={styles.image}
          onError={onSvgError}
        />
      ) : (
        <Image
          testID={FAVICON_AVATAR_IMAGE_ID}
          source={imageSource}
          style={styles.image}
          resizeMode={'contain'}
          onError={onError}
        />
      ),
    [imageSource, svgSource, styles.image, onError, onSvgError],
  );

  return (
    <AvatarBase size={size} style={styles.base}>
      {error ? fallbackFavicon : favicon}
    </AvatarBase>
  );
};

export default AvatarFavicon;
