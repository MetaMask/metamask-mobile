import React from 'react';

import { storiesOf } from '@storybook/react-native';
import { text, select } from '@storybook/addon-knobs';

import { AvatarSize } from '../../Base/BaseAvatar';

import AccountAvatar from './AccountAvatar';
import { AccountAvatarType } from '.';

storiesOf(' UI / AccountAvatar', module)
  .addDecorator((getStory) => getStory())
  .add('Simple', () => {
    const accountAddress = text(
      'accountAddress',
      '0x10e08af911f2e489480fb2855b24771745d0198b50f5c55891369844a8c57092',
    );
    const sizeSelector = select(
      'size',
      Object.keys(AvatarSize).map((key) => `${key}`),
      AvatarSize.Medium,
    );
    const typeSelector = select(
      'type',
      AccountAvatarType,
      AccountAvatarType.JazzIcon,
    );

    return (
      // TODO: remove the type castings
      <AccountAvatar
        size={sizeSelector as AvatarSize}
        type={typeSelector as AccountAvatarType}
        accountAddress={accountAddress}
      />
    );
  });
