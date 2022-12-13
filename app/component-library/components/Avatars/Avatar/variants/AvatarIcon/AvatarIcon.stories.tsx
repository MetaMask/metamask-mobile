// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { AvatarSize } from '../../Avatar.types';
import { IconName } from '../../../../Icon';

// Internal dependencies.
import AvatarIcon from './AvatarIcon';
import { AvatarIconProps } from './AvatarIcon.types';

export const getAvatarIconStoryProps = (): AvatarIconProps => {
  const sizeSelector = select(
    'size',
    AvatarSize,
    AvatarSize.Md,
    storybookPropsGroupID,
  );
  const iconNameSelector = select(
    'name',
    IconName,
    IconName.LockFilled,
    storybookPropsGroupID,
  );

  return {
    size: sizeSelector,
    name: iconNameSelector,
  };
};
const AvatarIconStory = () => <AvatarIcon {...getAvatarIconStoryProps()} />;

export default AvatarIconStory;
