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
import AvatarBase from '../../foundation/AvatarBase/AvatarBase';

// Internal dependencies.
import { AvatarFaviconProps } from './AvatarFavicon.types';

const AvatarFavicon = ({
  imageSource,
  size = DEFAULT_AVATAR_SIZE,
  ...props
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
    <AvatarBase size={size} {...props}>
      <Avatar
        variant={AvatarVariants.Image}
        size={size}
        source={imageSource}
        onError={onError}
      />
    </AvatarBase>
  );

  return <>{error ? renderError() : renderImage()}</>;
};

export default AvatarFavicon;
