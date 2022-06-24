/* eslint-disable react/prop-types */
import React, { useCallback, useState } from 'react';
import { Image } from 'react-native';
import BaseAvatar, { BaseAvatarSize } from '../BaseAvatar';
import { NetworkAvatarProps } from './NetworkAvatar.types';
import BaseText, { BaseTextVariant } from '../BaseText';
import stylesheet from './NetworkAvatar.styles';
import { useStyles } from '../../../component-library/hooks';
import { NETWORK_AVATAR_IMAGE_ID } from '../../../constants/test-ids';

const NetworkAvatar = ({
  size,
  style,
  networkName,
  networkImageUrl,
}: NetworkAvatarProps) => {
  const [showPlaceholder, setShowPlaceholder] = useState(!networkImageUrl);
  const { styles } = useStyles(stylesheet, { style, size, showPlaceholder });
  const textVariant =
    size === BaseAvatarSize.Sm || size === BaseAvatarSize.Xs
      ? BaseTextVariant.lBodySM
      : BaseTextVariant.lBodyMD;
  const chainNameFirstLetter = networkName?.[0] ?? '?';

  const onError = useCallback(
    () => setShowPlaceholder(true),
    [setShowPlaceholder],
  );

  return (
    <BaseAvatar size={size} style={styles.base}>
      {showPlaceholder ? (
        <BaseText style={styles.label} variant={textVariant}>
          {chainNameFirstLetter}
        </BaseText>
      ) : (
        <Image
          source={{ uri: networkImageUrl }}
          style={styles.image}
          onError={onError}
          testID={NETWORK_AVATAR_IMAGE_ID}
        />
      )}
    </BaseAvatar>
  );
};

export default NetworkAvatar;
