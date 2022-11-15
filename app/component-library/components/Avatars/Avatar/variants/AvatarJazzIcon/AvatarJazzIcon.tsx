// Third party dependencies.
import React from 'react';
import Jazzicon from 'react-native-jazzicon';

// External dependencies.
import CirclePattern from '../../../../../patterns/Circles/Circle/Circle';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';

// Internal dependencies.
import { AvatarJazzIconProps } from './AvatarJazzIcon.types';
import { AVATAR_JAZZICON_TEST_ID } from './AvatarJazzIcon.constants';

const AvatarJazzIcon = ({
  size = DEFAULT_AVATAR_SIZE,
  jazzIconProps,
  ...props
}: AvatarJazzIconProps) => (
  <CirclePattern size={size} {...props} testID={AVATAR_JAZZICON_TEST_ID}>
    <Jazzicon size={Number(size)} {...jazzIconProps} />
  </CirclePattern>
);

export default AvatarJazzIcon;
