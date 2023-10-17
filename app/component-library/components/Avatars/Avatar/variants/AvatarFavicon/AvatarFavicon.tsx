/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { Image, ImageErrorEventData, NativeSyntheticEvent } from 'react-native';

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

const AvatarFavicon = ({
  imageSource,
  size = AvatarSize.Md,
  style,
}: AvatarFaviconProps) => {
  const [error, setError] = useState(undefined);
  const { styles } = useStyles(stylesheet, { style, error });

  const onError = useCallback(
    (e: NativeSyntheticEvent<ImageErrorEventData>) =>
      setError(e.nativeEvent.error),
    [setError],
  );

  const renderError = () => (
    <Icon size={ICON_SIZE_BY_AVATAR_SIZE[size]} name={IconName.Global} />
  );

  const renderImage = () => (
    <Image
      testID={FAVICON_AVATAR_IMAGE_ID}
      source={imageSource}
      style={styles.image}
      resizeMode={'contain'}
      onError={onError}
    />
  );

  return (
    <AvatarBase size={size} style={styles.base}>
      {error ? renderError() : renderImage()}
    </AvatarBase>
  );
};

export default AvatarFavicon;
