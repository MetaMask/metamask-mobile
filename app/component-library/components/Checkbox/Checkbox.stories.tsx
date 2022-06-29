/* eslint-disable no-console */
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import Checkbox from './Checkbox';
import { boolean } from '@storybook/addon-knobs';

storiesOf('Component Library / Checkbox', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const selectedSelector = boolean('isSelected', false, groupId);

    return <Checkbox isSelected={selectedSelector} />;
  });
