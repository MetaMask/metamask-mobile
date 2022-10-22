// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';

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

  return {
    variant: AvatarVariants.Image,
    size: sizeSelector,
    imageSource: {
      uri: 'https://uniswap.org/favicon.ico',
    },
  };
};
const AvatarImageStory = () => <AvatarImage {...getAvatarImageStoryProps()} />;

export default AvatarImageStory;
