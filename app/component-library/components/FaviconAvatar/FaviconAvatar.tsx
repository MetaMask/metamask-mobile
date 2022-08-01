/* eslint-disable react/prop-types */
import React, { useCallback, useState } from 'react';
import { Image, ImageErrorEventData, NativeSyntheticEvent } from 'react-native';
import { useStyles } from '../../../component-library/hooks';
import Avatar, { AvatarSize } from '../Avatar';
import {
  FaviconAvatarProps,
  IconSizeByAvatarSize,
} from './FaviconAvatar.types';
import stylesheet from './FaviconAvatar.styles';
import Icon, { IconName, IconSize } from '../Icon';
import { FAVICON_AVATAR_IMAGE_ID } from '../../../constants/test-ids';

const iconSizeByAvatarSize: IconSizeByAvatarSize = {
  [AvatarSize.Xs]: IconSize.Xs,
  [AvatarSize.Sm]: IconSize.Sm,
  [AvatarSize.Md]: IconSize.Md,
  [AvatarSize.Lg]: IconSize.Lg,
  [AvatarSize.Xl]: IconSize.Xl,
};

const FaviconAvatar: React.FC<FaviconAvatarProps> = ({
  imageUrl,
  size,
  style,
}) => {
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
        <Icon size={iconSizeByAvatarSize[size]} name={IconName.GlobalFilled} />
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

export default FaviconAvatar;
