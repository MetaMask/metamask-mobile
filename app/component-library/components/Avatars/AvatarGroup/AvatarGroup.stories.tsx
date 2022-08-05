// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { number } from '@storybook/addon-knobs';

// Internal dependencies.
import { AVAILABLE_TOKEN_LIST } from './AvatarGroup.constants';
import AvatarGroup from './AvatarGroup';

storiesOf(' Component Library / AvatarGroup', module).add('Default', () => {
  const options = {
    range: true,
    min: 1,
    max: 14,
    step: 1,
  };
  const amountOfTokens = number('Amount of tokens', 1, options);
  const tokenList = AVAILABLE_TOKEN_LIST.slice(0, amountOfTokens);

  return <AvatarGroup tokenList={tokenList} />;
});
