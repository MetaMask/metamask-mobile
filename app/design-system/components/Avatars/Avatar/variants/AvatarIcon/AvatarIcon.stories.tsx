// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { AvatarBaseSize } from '../../foundation/AvatarBase';
import { IconName } from '../../../../Icon';

// Internal dependencies.
import AvatarIcon from './AvatarIcon';

storiesOf(' Design System / AvatarIcon', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const sizeSelector = select(
      'size',
      AvatarBaseSize,
      AvatarBaseSize.Md,
      groupId,
    );
    const iconNameSelector = select(
      'name',
      IconName,
      IconName.LockFilled,
      groupId,
    );

    return <AvatarIcon size={sizeSelector} name={iconNameSelector} />;
  });
