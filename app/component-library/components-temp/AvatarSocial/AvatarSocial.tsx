import React from 'react';
import {
  AvatarBase,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';
import { brandColor } from '@metamask/design-tokens';

import Foxicon from '../Foxicon';
import {
  BRAND_COLOR_BY_AVATARSOCIAL_BACKGROUND_COLOR,
  FOXICON_SIZE_BY_AVATARBASE_SIZE,
} from './AvatarSocial.constants';
import { AvatarSocialProps } from './AvatarSocial.types';

const AvatarSocial = ({
  variant,
  backgroundColor,
  size = AvatarBaseSize.Md,
  style,
  ...avatarBaseProps
}: AvatarSocialProps) => (
  <AvatarBase
    size={size}
    accessibilityRole="image"
    {...avatarBaseProps}
    style={[
      {
        backgroundColor:
          brandColor[
            BRAND_COLOR_BY_AVATARSOCIAL_BACKGROUND_COLOR[backgroundColor]
          ],
      },
      style,
    ]}
  >
    <Foxicon variant={variant} size={FOXICON_SIZE_BY_AVATARBASE_SIZE[size]} />
  </AvatarBase>
);

export default AvatarSocial;
