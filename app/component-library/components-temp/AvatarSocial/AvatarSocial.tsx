import React from 'react';
import {
  AvatarBase,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';
import { brandColor } from '@metamask/design-tokens';

import Foxicon, { isFoxiconVariant } from '../Foxicon';
import {
  AVATARSOCIAL_FALLBACK_BACKGROUND_COLOR,
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
}: AvatarSocialProps) => {
  const resolvedBackgroundColor = isFoxiconVariant(variant)
    ? backgroundColor
    : AVATARSOCIAL_FALLBACK_BACKGROUND_COLOR;

  return (
    <AvatarBase
      size={size}
      accessibilityRole="image"
      {...avatarBaseProps}
      style={[
        {
          backgroundColor:
            brandColor[
              BRAND_COLOR_BY_AVATARSOCIAL_BACKGROUND_COLOR[
                resolvedBackgroundColor
              ]
            ],
        },
        style,
      ]}
    >
      <Foxicon variant={variant} size={FOXICON_SIZE_BY_AVATARBASE_SIZE[size]} />
    </AvatarBase>
  );
};

export default AvatarSocial;
