import React from 'react';
import {
  AvatarBase,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';
import { brandColor } from '@metamask/design-tokens';

import Foxicon from '../Foxicon';
import { FOXICON_SIZE_BY_AVATARBASE_SIZE } from './AvatarSocial.constants';
import { AvatarSocialProps } from './AvatarSocial.types';

export const AvatarSocialSelectorsIDs = {
  CONTAINER: 'avatar-social',
  FOX_ICON: 'avatar-social-fox-icon',
} as const;

const AvatarSocial = ({
  variant,
  backgroundColor,
  size = AvatarBaseSize.Md,
  style,
  testID = AvatarSocialSelectorsIDs.CONTAINER,
  ...avatarBaseProps
}: AvatarSocialProps) => (
  <AvatarBase
    size={size}
    style={[{ backgroundColor: brandColor[backgroundColor] }, style]}
    testID={testID}
    {...avatarBaseProps}
  >
    <Foxicon
      variant={variant}
      size={FOXICON_SIZE_BY_AVATARBASE_SIZE[size]}
      testID={AvatarSocialSelectorsIDs.FOX_ICON}
    />
  </AvatarBase>
);

export default AvatarSocial;
