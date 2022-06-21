/* eslint-disable no-console */
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import TabBarItem from './TabBarItem';
import { IconName } from '../Icon';

storiesOf('Component Library / TabBarItem', module)
  .addDecorator((getStory) => getStory())
  .add('Selected', () => (
    <TabBarItem
      label={'Tab'}
      icon={IconName.BankFilled}
      onPress={() => console.log("I'm clicked!")}
      isSelected
    />
  ))
  .add('Unselected', () => (
    <TabBarItem
      label={'Tab'}
      icon={IconName.BankFilled}
      onPress={() => console.log("I'm clicked!")}
      isSelected={false}
    />
  ));
