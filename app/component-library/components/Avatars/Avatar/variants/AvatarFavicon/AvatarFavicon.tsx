/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { Image, ImageErrorEventData, NativeSyntheticEvent } from 'react-native';

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

const AvatarFavicon = ({
  imageSource,
  size = DEFAULT_AVATARFAVICON_SIZE,
  style,
  ...props
}: AvatarFaviconProps) => {
  const [error, setError] = useState(undefined);
  const { styles } = useStyles(stylesheet, { style, error });

  const onError = useCallback(
    (e: NativeSyntheticEvent<ImageErrorEventData>) =>
      setError(e.nativeEvent.error),
    [setError],
  );

  const renderError = () => (
    <Icon
      size={ICONSIZE_BY_AVATARSIZE[size]}
      name={DEFAULT_AVATARFAVICON_ERROR_ICON}
    />
  );

  const renderImage = () => (
    <Image
      testID={AVATARFAVICON_IMAGE_TESTID}
      source={imageSource}
      style={styles.image}
      resizeMode={'contain'}
      onError={onError}
    />
  );

  return (
    <AvatarBase size={size} style={styles.base} {...props}>
      {error ? renderError() : renderImage()}
    </AvatarBase>
  );
};

export default AvatarFavicon;
