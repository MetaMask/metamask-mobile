// Third party dependencies.
import React from 'react';
import Icon from '../../../../Icon';

// External dependencies.
import { AvatarSize } from '../../Avatar2.types';
import Avatar2Base from '../../foundation/Avatar2Base';

// Internal dependencies.
import { AvatarIconProps } from './AvatarIcon.types';
import { ICON_SIZE_BY_AVATAR_SIZE } from './AvatarIcon.constants';

const AvatarIcon = ({ size = AvatarSize.Md, ...props }: AvatarIconProps) => (
  <Avatar2Base size={size}>
    <Icon size={ICON_SIZE_BY_AVATAR_SIZE[size]} {...props} />
  </Avatar2Base>
);

export default AvatarIcon;
