import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';
import { BaseAvatarSize } from '../BaseAvatar';
import { IconName } from '../Icon';
import AvatarIcon from './AvatarIcon';

storiesOf(' Component Library / AvatarIcon', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const sizeSelector = select(
      'size',
      BaseAvatarSize,
      BaseAvatarSize.Md,
      groupId,
    );
    const iconSelector = select('name', IconName, IconName.LockFilled, groupId);

    return <AvatarIcon size={sizeSelector} icon={iconSelector} />;
  });
