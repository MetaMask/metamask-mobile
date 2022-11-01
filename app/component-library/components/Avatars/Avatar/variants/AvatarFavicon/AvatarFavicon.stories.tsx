// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { AvatarSize } from '../../Avatar.types';
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';

// Internal dependencies.
import AvatarFavicon from './AvatarFavicon';
import {
  TEST_LOCAL_IMAGE_SOURCE,
  TEST_REMOTE_IMAGE_SOURCE,
} from './AvatarFavicon.constants';
import { AvatarFaviconProps } from './AvatarFavicon.types';

export const getAvatarFaviconStoryProps = (): AvatarFaviconProps => {
  const sizeSelector = select(
    'size',
    AvatarSize,
    AvatarSize.Md,
    storybookPropsGroupID,
  );

  const imgSourceOptions = {
    Remote: 'REMOTE',
    Local: 'LOCAL',
  };

  const imgSourceSelector = select(
    'imageSource.uri Source',
    imgSourceOptions,
    imgSourceOptions.Remote,
    storybookPropsGroupID,
  );

  const imgSrcToSrc = {
    [imgSourceOptions.Local]: TEST_LOCAL_IMAGE_SOURCE,
    [imgSourceOptions.Remote]: TEST_REMOTE_IMAGE_SOURCE,
  };
  return {
    size: sizeSelector,
    imageSource: imgSrcToSrc[imgSourceSelector],
  };
};
const AvatarFaviconStory = () => (
  <AvatarFavicon {...getAvatarFaviconStoryProps()} />
);

export default AvatarFaviconStory;
