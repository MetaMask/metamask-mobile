// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { AvatarSize, AvatarVariants } from '../../Avatar.types';

// Internal dependencies.
import AvatarJazzIcon from './AvatarJazzIcon';
import { AvatarJazzIconProps } from './AvatarJazzIcon.types';

export const getAvatarJazzIconStoryProps = (): AvatarJazzIconProps => {
  const sizeSelector = select(
    'size',
    AvatarSize,
    AvatarSize.Md,
    storybookPropsGroupID,
  );

  return {
    variant: AvatarVariants.JazzIcon,
    size: sizeSelector,
    address:
      '0x10e08af911f2e489480fb2855b24771745d0198b50f5c55891369844a8c57092',
  };
};
const AvatarJazzIconStory = () => (
  <AvatarJazzIcon {...getAvatarJazzIconStoryProps()} />
);

export default AvatarJazzIconStory;
