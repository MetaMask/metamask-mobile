import React from 'react';
import { storiesOf } from '@storybook/react-native';
import BaseText, { BaseTextVariant } from './';

storiesOf('Base / BaseText', module)
  .addDecorator((getStory) => getStory())
  .add('Simple', () => (
    <BaseText variant={BaseTextVariant.lBodyMD}>{`I'm Text!`}</BaseText>
  ));
