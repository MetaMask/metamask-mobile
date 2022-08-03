/* eslint-disable react/prop-types */
import React, { useCallback, useState } from 'react';
import { Image, ImageErrorEventData, NativeSyntheticEvent } from 'react-native';

import Avatar, { AvatarBaseSize } from '../AvatarBase';
import { useStyles } from '../../../hooks';
import Icon, { IconName } from '../../Icon';

import { AvatarFaviconProps } from './AvatarFavicon.types';
import {
  ICON_SIZE_BY_AVATAR_SIZE,
  FAVICON_AVATAR_IMAGE_ID,
} from './AvatarFavicon.constants';
import stylesheet from './AvatarFavicon.styles';

const AvatarFavicon = ({
  imageUrl,
  size = AvatarBaseSize.Md,
  style,
}: AvatarFaviconProps) => {
  const [error, setError] = useState(undefined);
  const { styles } = useStyles(stylesheet, { style, error });

  const onError = useCallback(
    (e: NativeSyntheticEvent<ImageErrorEventData>) =>
      setError(e.nativeEvent.error),
    [setError],
  );

  return (
    <Avatar size={size} style={styles.base}>
      {error ? (
        <Icon
          size={ICON_SIZE_BY_AVATAR_SIZE[size]}
          name={IconName.GlobalFilled}
        />
      ) : (
        <Image
          testID={FAVICON_AVATAR_IMAGE_ID}
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode={'contain'}
          onError={onError}
        />
      )}
    </Avatar>
  );
};

export default AvatarFavicon;
