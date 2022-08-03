import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { text, select } from '@storybook/addon-knobs';

import { AvatarBaseSize } from '../AvatarBase';

import AvatarAccount from './AvatarAccount';
import { AvatarAccountType } from './AvatarAccount.types';
import { DUMMY_WALLET_ADDRESS } from './AvatarAccount.constants';

storiesOf(' Component Library / AvatarAccount', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const accountAddress = text('accountAddress', DUMMY_WALLET_ADDRESS);
    const sizeSelector = select('size', AvatarBaseSize, AvatarBaseSize.Md);
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
