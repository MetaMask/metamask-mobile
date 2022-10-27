/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import Avatar, {
  AvatarVariants,
} from '../../../../../../component-library/components/Avatars/Avatar';

// Internal dependencies.
import { AvatarNetworkProps } from './AvatarNetwork.types';

const AvatarNetwork = ({ name, imageSource, ...props }: AvatarNetworkProps) => {
  const [showFallback, setShowFallback] = useState(!imageSource);

  const onError = useCallback(() => setShowFallback(true), [setShowFallback]);
  const chainNameFirstLetter = name?.[0] ?? '?';

  return (
    <>
      {showFallback ? (
        <Avatar
          initial={chainNameFirstLetter}
          {...props}
          variant={AvatarVariants.Initial}
        />
      ) : (
        <Avatar
          source={imageSource as ImageSourcePropType}
          onError={onError}
          {...props}
          variant={AvatarVariants.Image}
        />
      )}
    </>
  );
};

export default AvatarNetwork;
