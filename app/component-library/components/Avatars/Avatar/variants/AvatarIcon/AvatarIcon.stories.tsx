// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { AvatarSize } from '../../Avatar.types';
import { IconName } from '../../../../Icon';

// Internal dependencies.
import AvatarIcon from './AvatarIcon';

const AvatarIconStory = () => {
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

  return <AvatarIcon size={sizeSelector} name={iconNameSelector} />;
};

export default AvatarIconStory;
