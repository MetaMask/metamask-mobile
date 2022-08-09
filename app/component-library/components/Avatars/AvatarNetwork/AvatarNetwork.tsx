/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { Image, ImageSourcePropType } from 'react-native';

// External dependencies.
import Avatar, { AvatarBaseSize } from '../AvatarBase';
import Text, { TextVariant } from '../../Text';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import { AvatarNetworkProps } from './AvatarNetwork.types';
import { NETWORK_AVATAR_IMAGE_ID } from './AvatarNetwork.constants';
import stylesheet from './AvatarNetwork.styles';

const AvatarNetwork = ({
  size = AvatarBaseSize.Md,
  style,
  name,
  image,
}: AvatarNetworkProps) => {
  const [showPlaceholder, setShowPlaceholder] = useState(!image);
  const { styles } = useStyles(stylesheet, { style, size, showPlaceholder });
  const textVariant =
    size === AvatarBaseSize.Sm || size === AvatarBaseSize.Xs
      ? TextVariant.lBodySM
      : TextVariant.lBodyMD;
  const chainNameFirstLetter = name?.[0] ?? '?';

  const onError = useCallback(
    () => setShowPlaceholder(true),
    [setShowPlaceholder],
  );

  return (
    <Avatar size={size} style={styles.base}>
      {showPlaceholder ? (
        <Text style={styles.label} variant={textVariant}>
          {chainNameFirstLetter}
        </Text>
      ) : (
        <Image
          source={image as ImageSourcePropType}
          style={styles.image}
          onError={onError}
          testID={NETWORK_AVATAR_IMAGE_ID}
        />
      )}
    </Avatar>
  );
};

export default AvatarNetwork;
