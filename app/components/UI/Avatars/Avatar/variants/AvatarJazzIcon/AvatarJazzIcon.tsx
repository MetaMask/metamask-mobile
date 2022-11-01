// Third party dependencies.
import React from 'react';
import Jazzicon from 'react-native-jazzicon';

// External dependencies.
import AvatarBase from '../../foundation/AvatarBase/AvatarBase';
import { default as MorphAvatarBase } from '../../../../../../component-library/components/Avatars/Avatar/foundation/AvatarBase';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';

// Internal dependencies.
import { AvatarJazzIconProps } from './AvatarJazzIcon.types';
import { AVATAR_JAZZICON_TEST_ID } from './AvatarJazzIcon.constants';

const AvatarJazzIcon = ({
  size = DEFAULT_AVATAR_SIZE,
  ...props
}: AvatarJazzIconProps) => (
  <AvatarBase size={size} testID={AVATAR_JAZZICON_TEST_ID} {...props}>
    <MorphAvatarBase size={size}>
      <Jazzicon size={Number(size)} />
    </MorphAvatarBase>
  </AvatarBase>
);

export default AvatarJazzIcon;
