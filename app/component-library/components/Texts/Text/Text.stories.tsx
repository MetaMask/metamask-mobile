// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// Internal dependencies.
import Text from './Text';
import { TextVariant } from './Text.types';

storiesOf('Component Library / Text', module)
  .addDecorator((getStory) => getStory())
  .add('Small Display MD', () => (
    <Text variant={TextVariant.sDisplayMD}>{`I'm Text!`}</Text>
  ))
  .add('Small Body MD', () => (
    <Text variant={TextVariant.sBodyMD}>{`I'm Text!`}</Text>
  ));
