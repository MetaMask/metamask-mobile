/* eslint-disable react/prop-types */
import React, { useCallback, useState } from 'react';
import { Image, ImageErrorEventData, NativeSyntheticEvent } from 'react-native';
import { useStyles } from '../../../component-library/hooks';
import BaseAvatar, { BaseAvatarSize } from '../BaseAvatar';
import {
  FaviconAvatarProps,
  IconSizeByAvatarSize,
} from './FaviconAvatar.types';
import stylesheet from './FaviconAvatar.styles';
import Icon, { IconName, IconSize } from '../Icon';
import { FAVICON_AVATAR_IMAGE_ID } from '../../../constants/test-ids';

const iconSizeByAvatarSize: IconSizeByAvatarSize = {
  [BaseAvatarSize.Xs]: IconSize.Xs,
  [BaseAvatarSize.Sm]: IconSize.Sm,
  [BaseAvatarSize.Md]: IconSize.Md,
  [BaseAvatarSize.Lg]: IconSize.Lg,
  [BaseAvatarSize.Xl]: IconSize.Xl,
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
    <BaseAvatar size={size} style={styles.base}>
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
    </BaseAvatar>
  );
};

export default FaviconAvatar;
