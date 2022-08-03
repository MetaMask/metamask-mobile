/* eslint-disable react/prop-types */
import React, { useCallback, useState } from 'react';
import { Image } from 'react-native';

import Avatar, { AvatarBaseSize } from '../AvatarBase';
import BaseText, { BaseTextVariant } from '../../BaseText';
import { useStyles } from '../../../hooks';

import { AvatarNetworkProps } from './AvatarNetwork.types';
import { NETWORK_AVATAR_IMAGE_ID } from './AvatarNetwork.constants';
import stylesheet from './AvatarNetwork.styles';

const AvatarNetwork = ({
  size = AvatarBaseSize.Md,
  style,
  networkName,
  networkImageUrl,
}: AvatarNetworkProps) => {
  const [showPlaceholder, setShowPlaceholder] = useState(!networkImageUrl);
  const { styles } = useStyles(stylesheet, { style, size, showPlaceholder });
  const textVariant =
    size === AvatarBaseSize.Sm || size === AvatarBaseSize.Xs
      ? BaseTextVariant.lBodySM
      : BaseTextVariant.lBodyMD;
  const chainNameFirstLetter = networkName?.[0] ?? '?';

  const onError = useCallback(
    () => setShowPlaceholder(true),
    [setShowPlaceholder],
  );

  return (
    <Avatar size={size} style={styles.base}>
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
    </Avatar>
  );
};

export default AvatarNetwork;
