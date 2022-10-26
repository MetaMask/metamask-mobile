// Third party dependencies.
import React from 'react';
import Icon from '../../../../Icon';

// External dependencies.
import { AvatarSize } from '../../Avatar.types';
import AvatarBase from '../../foundation/AvatarBase';

// Internal dependencies.
import { AvatarIconProps } from './AvatarIcon.types';
import { ICON_SIZE_BY_AVATAR_SIZE } from './AvatarIcon.constants';

const AvatarIcon = ({ size = AvatarSize.Md, ...props }: AvatarIconProps) => (
  <AvatarBase size={size}>
    <Icon size={ICON_SIZE_BY_AVATAR_SIZE[size]} {...props} />
  </AvatarBase>
);

export default AvatarIcon;
