// Third party dependencies.
import React from 'react';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import AvatarNetwork from './AvatarNetwork';
import {
  TEST_REMOTE_IMAGE_SOURCE,
  TEST_LOCAL_IMAGE_SOURCE,
  TEST_NETWORK_NAME,
} from './AvatarNetwork.constants';
import { AvatarNetworkProps } from './AvatarNetwork.types';

export const getAvatarNetworkStoryProps = (): AvatarNetworkProps => {
  const sizeSelector = select(
    'size',
    AvatarSize,
    AvatarSize.Md,
    storybookPropsGroupID,
  );
  const networkNameSelector = text(
    'name',
    TEST_NETWORK_NAME,
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
    name: networkNameSelector,
    imageSource: imgSrcToSrc[imgSourceSelector],
  };
};
const AvatarNetworkStory = () => (
  <AvatarNetwork {...getAvatarNetworkStoryProps()} />
);

export default AvatarNetworkStory;
