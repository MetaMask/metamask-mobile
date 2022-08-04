/* eslint-disable react-native/no-inline-styles, no-console */
import React from 'react';
import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';

import TagUrl from './TagUrl';

storiesOf('Component Library / TagUrl', module)
  .addDecorator((getStory) => getStory())
  .add('With Cta', () => (
    <View style={{ alignItems: 'flex-start' }}>
      <TagUrl
        url={'https://uniswap.org/favicon.ico'}
        label={'https://uniswap.org'}
        cta={{
          label: 'Permissions',
          onPress: () => console.log("I'm clicked!"),
        }}
      />
    </View>
  ))
  .add('Without Cta', () => (
    <View style={{ alignItems: 'flex-start' }}>
      <TagUrl
        url={'https://uniswap.org/favicon.ico'}
        label={'https://uniswap.org'}
      />
    </View>
  ));
