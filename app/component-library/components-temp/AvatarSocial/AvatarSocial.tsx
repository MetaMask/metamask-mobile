import React from 'react';
import { AvatarBase } from '@metamask/design-system-react-native';
import { brandColor } from '@metamask/design-tokens';

import Foxicon from '../Foxicon';
import {
  DEFAULT_AVATARSOCIAL_SIZE,
  FOXICON_SIZE_BY_AVATARBASE_SIZE,
} from './AvatarSocial.constants';
import { AvatarSocialSelectorsIDs } from './AvatarSocial.testIds';
import { AvatarSocialProps } from './AvatarSocial.types';

const AvatarSocial = ({
  variant,
  backgroundColor,
  size = DEFAULT_AVATARSOCIAL_SIZE,
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
