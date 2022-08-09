import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { number } from '@storybook/addon-knobs';

import StackedAvatarData from './StackedAvatars.data';
import StackedAvatar from '.';

storiesOf(' Component Library / StackedAvatar', module).add('Default', () => {
  const { availableTokenList } = StackedAvatarData;

  const options = {
    range: true,
    min: 1,
    max: 14,
    step: 1,
  };
  const amountOfTokens = number('Amount of tokens', 1, options);
  const tokenList = availableTokenList.slice(0, amountOfTokens);

  return <StackedAvatar tokenList={tokenList} />;
});
