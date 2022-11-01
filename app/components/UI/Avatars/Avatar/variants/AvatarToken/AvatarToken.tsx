// Third party dependencies.
import React, { useState } from 'react';
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import Avatar, {
  AvatarVariants,
} from '../../../../../../component-library/components/Avatars/Avatar';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';
import AvatarBase from '../../foundation/AvatarBase/AvatarBase';

// Internal dependencies.
import { AvatarTokenProps } from './AvatarToken.types';

const AvatarToken = ({
  name,
  imageSource,
  isHaloEnabled = false,
  size = DEFAULT_AVATAR_SIZE,
  ...props
}: AvatarTokenProps) => {
  const [showFallback, setShowFallback] = useState(!imageSource);

  const tokenNameFirstLetter = name?.[0] ?? '?';

  const onError = () => setShowFallback(true);

  return (
    <AvatarBase size={size} {...props}>
      {showFallback ? (
        <Avatar
          initial={tokenNameFirstLetter}
          size={size}
          variant={AvatarVariants.Initial}
        />
      ) : (
        <Avatar
          source={imageSource as ImageSourcePropType}
          onError={onError}
          isHaloEnabled={isHaloEnabled}
          size={size}
          variant={AvatarVariants.Image}
        />
      )}
    </AvatarBase>
  );
};

export default AvatarToken;
