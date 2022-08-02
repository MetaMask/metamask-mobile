import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { text, select } from '@storybook/addon-knobs';
import { AvatarSize } from '../Avatar';
import AvatarAccount, { AvatarAccountType } from '.';
import { DUMMY_WALLET_ADDRESS } from './AvatarAccount.constants';

storiesOf(' Component Library / AvatarAccount', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const accountAddress = text('accountAddress', DUMMY_WALLET_ADDRESS);
    const sizeSelector = select('size', AvatarSize, AvatarSize.Md);
    const typeSelector = select(
      'type',
      AvatarAccountType,
      AvatarAccountType.JazzIcon,
    );

    return (
      <AvatarAccount
        size={sizeSelector}
        type={typeSelector}
        accountAddress={accountAddress}
      />
    );
  });
