// Third party dependencies.
import React from 'react';
import Jazzicon from 'react-native-jazzicon';

// Internal dependencies.
import { AvatarAssetJazzIconProps } from './AvatarAssetJazzIcon.types';

const AvatarAssetJazzIcon = ({ ...props }: AvatarAssetJazzIconProps) => (
  <Jazzicon {...props} />
);

export default AvatarAssetJazzIcon;
