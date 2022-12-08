// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// Internal dependencies.
import Text from './Text';
import { TextVariants } from './Text.types';

storiesOf('Component Library / Text', module)
  .addDecorator((getStory) => getStory())
  .add('Small Display MD', () => (
    <Text variant={TextVariants.sDisplayMD}>{`I'm Text!`}</Text>
  ))
  .add('Small Body MD', () => (
    <Text variant={TextVariants.sBodyMD}>{`I'm Text!`}</Text>
  ));
