import React from 'react';
import { storiesOf } from '@storybook/react-native';
import BaseText, { BaseTextVariant } from './';

storiesOf('Component Library / BaseText', module)
  .addDecorator((getStory) => getStory())
  .add('Small Display MD', () => (
    <BaseText variant={BaseTextVariant.sDisplayMD}>{`I'm Text!`}</BaseText>
  ))
  .add('Small Body MD', () => (
    <BaseText variant={BaseTextVariant.sBodyMD}>{`I'm Text!`}</BaseText>
  ));
