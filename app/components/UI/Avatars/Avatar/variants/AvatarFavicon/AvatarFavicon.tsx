/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { ImageErrorEventData, NativeSyntheticEvent } from 'react-native';

// External dependencies.
import Avatar, {
  AvatarVariants,
  DEFAULT_AVATAR_SIZE,
} from '../../../../../../component-library/components/Avatars/Avatar';
import { IconName } from '../../../../../../component-library/components/Icon';

// Internal dependencies.
import { AvatarFaviconProps } from './AvatarFavicon.types';

const AvatarFavicon = ({
  imageSource,
  size = DEFAULT_AVATAR_SIZE,
}: AvatarFaviconProps) => {
  const [error, setError] = useState(undefined);

  const onError = useCallback(
    (e: NativeSyntheticEvent<ImageErrorEventData>) =>
      setError(e.nativeEvent.error),
    [setError],
  );

  const renderError = () => (
    <Avatar
      variant={AvatarVariants.Icon}
      size={size}
      name={IconName.GlobalFilled}
    />
  );

  const renderImage = () => (
    <Avatar
      variant={AvatarVariants.Image}
      source={imageSource}
      onError={onError}
    />
  );

  return <>{error ? renderError() : renderImage()}</>;
};

export default AvatarFavicon;
