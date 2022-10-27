// Third party dependencies.
import React from 'react';
import Jazzicon from 'react-native-jazzicon';

// External dependencies.
import { AvatarSize } from '../../Avatar.types';
import AvatarBase from '../../foundation/AvatarBase';

// Internal dependencies.
import { AvatarJazzIconProps } from './AvatarJazzIcon.types';
import { AVATAR_JAZZICON_TEST_ID } from './AvatarJazzIcon.constants';

const AvatarJazzIcon = ({
  size = AvatarSize.Md,
  ...props
}: AvatarJazzIconProps) => (
  <AvatarBase size={size} testID={AVATAR_JAZZICON_TEST_ID}>
    <Jazzicon size={Number(size)} {...props} />
  </AvatarBase>
);

export default AvatarJazzIcon;
