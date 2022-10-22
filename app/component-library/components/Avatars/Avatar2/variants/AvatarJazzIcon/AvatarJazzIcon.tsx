// Third party dependencies.
import React from 'react';
import Jazzicon from 'react-native-jazzicon';

// External dependencies.
import { AvatarSize } from '../../Avatar2.types';
import Avatar2Base from '../../foundation/Avatar2Base';

// Internal dependencies.
import { AvatarJazzIconProps } from './AvatarJazzIcon.types';

const AvatarJazzIcon = ({
  size = AvatarSize.Md,
  ...props
}: AvatarJazzIconProps) => (
  <Avatar2Base size={size}>
    <Jazzicon size={Number(size)} {...props} />
  </Avatar2Base>
);

export default AvatarJazzIcon;
