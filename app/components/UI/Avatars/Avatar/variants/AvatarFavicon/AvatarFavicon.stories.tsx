// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import {
  AvatarSizes,
  DEFAULT_AVATAR_SIZE,
} from '../../../../../../component-library/components/Avatars/Avatar';
import { storybookPropsGroupID } from '../../../../../../component-library/constants/storybook.constants';

// Internal dependencies.
import AvatarFavicon from './AvatarFavicon';
import { TEST_REMOTE_IMAGE_SOURCE } from './AvatarFavicon.constants';
import { AvatarFaviconProps } from './AvatarFavicon.types';

export const getAvatarFaviconStoryProps = (): AvatarFaviconProps => {
  const sizeSelector = select(
    'size',
    AvatarSizes,
    DEFAULT_AVATAR_SIZE,
    storybookPropsGroupID,
  );

  return {
    size: sizeSelector,
    imageSource: TEST_REMOTE_IMAGE_SOURCE,
  };
};
const AvatarFaviconStory = () => (
  <AvatarFavicon {...getAvatarFaviconStoryProps()} />
);

export default AvatarFaviconStory;
