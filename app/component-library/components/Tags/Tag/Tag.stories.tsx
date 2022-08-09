/* eslint-disable react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';

// Internal dependencies.
import Tag from './Tag';

storiesOf('Component Library / Tag', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => (
    <View style={{ alignItems: 'flex-start' }}>
      <Tag label={'Imported'} />
    </View>
  ));
