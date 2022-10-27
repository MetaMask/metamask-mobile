// Third party dependencies.
import React from 'react';
import Icon from '../../../../Icon';

// External dependencies.
import AvatarBase from '../../foundation/AvatarBase';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';

// Internal dependencies.
import { AvatarIconProps } from './AvatarIcon.types';
import {
  ICON_SIZE_BY_AVATAR_SIZE,
  AVATAR_ICON_TEST_ID,
  AVATAR_ICON_ICON_TEST_ID,
} from './AvatarIcon.constants';

const AvatarIcon = ({
  size = DEFAULT_AVATAR_SIZE,
  ...props
}: AvatarIconProps) => (
  <AvatarBase size={size} testID={AVATAR_ICON_TEST_ID}>
    <Icon
      testID={AVATAR_ICON_ICON_TEST_ID}
      size={ICON_SIZE_BY_AVATAR_SIZE[size]}
      {...props}
    />
  </AvatarBase>
);

export default AvatarIcon;
