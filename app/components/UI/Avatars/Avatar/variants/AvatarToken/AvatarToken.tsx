// Third party dependencies.
import React, { useState } from 'react';
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import Avatar, {
  AvatarVariants,
} from '../../../../../../component-library/components/Avatars/Avatar';

// Internal dependencies.
import { AvatarTokenProps } from './AvatarToken.types';

const AvatarToken = ({
  name,
  imageSource,
  isHaloEnabled = false,
  ...props
}: AvatarTokenProps) => {
  const [showFallback, setShowFallback] = useState(!imageSource);

  const tokenNameFirstLetter = name?.[0] ?? '?';

  const onError = () => setShowFallback(true);

  return (
    <>
      {showFallback ? (
        <Avatar
          initial={tokenNameFirstLetter}
          {...props}
          variant={AvatarVariants.Initial}
        />
      ) : (
        <Avatar
          source={imageSource as ImageSourcePropType}
          onError={onError}
          isHaloEnabled={isHaloEnabled}
          {...props}
          variant={AvatarVariants.Image}
        />
      )}
    </>
  );
};

export default AvatarToken;
