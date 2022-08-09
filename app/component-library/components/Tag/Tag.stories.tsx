/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import Tag from './Tag';
import { View } from 'react-native';

storiesOf('Component Library / Tag', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => (
    <View style={{ alignItems: 'flex-start' }}>
      <Tag label={'Imported'} />
    </View>
  ));
