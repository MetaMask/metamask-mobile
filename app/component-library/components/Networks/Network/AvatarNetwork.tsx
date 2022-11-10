/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import Avatar, {
  AvatarVariants,
} from '../../../../../../component-library/components/Avatars/Avatar';
import AvatarBase from '../../foundation/AvatarBase/AvatarBase';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';

// Internal dependencies.
import { AvatarNetworkProps } from './AvatarNetwork.types';

const AvatarNetwork = ({
  name,
  imageSource,
  size = DEFAULT_AVATAR_SIZE,
  ...props
}: AvatarNetworkProps) => {
  const [showFallback, setShowFallback] = useState(!imageSource);

  const onError = useCallback(() => setShowFallback(true), [setShowFallback]);
  const chainNameFirstLetter = name?.[0] ?? '?';

  return (
    <AvatarBase size={size} {...props}>
      {showFallback ? (
        <Avatar
          initial={chainNameFirstLetter}
          size={size}
          variant={AvatarVariants.Initial}
        />
      ) : (
        <Avatar
          source={imageSource as ImageSourcePropType}
          size={size}
          onError={onError}
          variant={AvatarVariants.Image}
        />
      )}
    </AvatarBase>
  );
};

export default AvatarNetwork;
