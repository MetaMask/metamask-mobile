import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { text, select } from '@storybook/addon-knobs';
import { BaseAvatarSize } from '../BaseAvatar';
import AccountAvatar, { AccountAvatarType } from '.';

storiesOf(' Component Library / AccountAvatar', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const accountAddress = text(
      'accountAddress',
      '0x10e08af911f2e489480fb2855b24771745d0198b50f5c55891369844a8c57092',
    );
    const sizeSelector = select('size', BaseAvatarSize, BaseAvatarSize.Md);
    const typeSelector = select(
      'type',
      AccountAvatarType,
      AccountAvatarType.JazzIcon,
    );

    return (
      <AccountAvatar
        size={sizeSelector}
        type={typeSelector}
        accountAddress={accountAddress}
      />
    );
  });
