// Third party dependencies.
import React from 'react';
import Icon from '../../../../Icon';

// External dependencies.
import { AvatarSizes } from '../../Avatar.types';
import AvatarBase from '../../foundation/AvatarBase';

// Internal dependencies.
import { AvatarIconProps } from './AvatarIcon.types';
import {
  ICON_SIZE_BY_AVATAR_SIZE,
  AVATAR_ICON_TEST_ID,
  AVATAR_ICON_ICON_TEST_ID,
} from './AvatarIcon.constants';

const AvatarIcon = ({ size = AvatarSizes.Md, ...props }: AvatarIconProps) => (
  <AvatarBase size={size} testID={AVATAR_ICON_TEST_ID}>
    <Icon
      testID={AVATAR_ICON_ICON_TEST_ID}
      size={ICON_SIZE_BY_AVATAR_SIZE[size]}
      {...props}
    />
  </AvatarBase>
);

export default AvatarIcon;
