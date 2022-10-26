// Third party dependencies.
import React from 'react';
import { select, boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { AvatarSize, AvatarVariants } from '../../Avatar2.types';

// Internal dependencies.
import AvatarImage from './AvatarImage';
import { AvatarImageProps } from './AvatarImage.types';

export const getAvatarImageStoryProps = (): AvatarImageProps => {
  const sizeSelector = select(
    'size',
    AvatarSize,
    AvatarSize.Md,
    storybookPropsGroupID,
  );

  const isHaloEnabled = boolean('isHaloEnabled', false, storybookPropsGroupID);

  return {
    variant: AvatarVariants.Image,
    size: sizeSelector,
    imageSource: {
      uri: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.png',
    },
    isHaloEnabled,
  };
};
const AvatarImageStory = () => <AvatarImage {...getAvatarImageStoryProps()} />;

export default AvatarImageStory;
