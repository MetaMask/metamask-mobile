// Third party dependencies.
import React from 'react';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../../component-library/constants/storybook.constants';
import {
  AvatarSizes,
  DEFAULT_AVATAR_SIZE,
} from '../../../../../../component-library/components/Avatars/Avatar';

// Internal dependencies.
import AvatarNetwork from './AvatarNetwork';
import {
  TEST_REMOTE_IMAGE_SOURCE,
  TEST_NETWORK_NAME,
} from './AvatarNetwork.constants';
import { AvatarNetworkProps } from './AvatarNetwork.types';

export const getAvatarNetworkStoryProps = (): AvatarNetworkProps => {
  const sizeSelector = select(
    'size',
    AvatarSizes,
    DEFAULT_AVATAR_SIZE,
    storybookPropsGroupID,
  );
  const networkNameText = text(
    'name',
    TEST_NETWORK_NAME,
    storybookPropsGroupID,
  );

  return {
    size: sizeSelector,
    name: networkNameText,
    imageSource: TEST_REMOTE_IMAGE_SOURCE,
  };
};
const AvatarNetworkStory = () => (
  <AvatarNetwork {...getAvatarNetworkStoryProps()} />
);

export default AvatarNetworkStory;
