/* eslint-disable react-native/no-inline-styles, no-console */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';

// Internal dependencies.
import TagUrl from './TagUrl';
import { TEST_IMAGE_SOURCE, TEST_LABEL } from './TagUrl.constants';

storiesOf('Component Library / TagUrl', module)
  .addDecorator((getStory) => getStory())
  .add('With Cta', () => (
    <View style={{ alignItems: 'flex-start' }}>
      <TagUrl
        imageSource={TEST_IMAGE_SOURCE}
        label={TEST_LABEL}
        cta={{
          label: 'Permissions',
          onPress: () => console.log("I'm clicked!"),
        }}
      />
    </View>
  ))
  .add('Without Cta', () => (
    <View style={{ alignItems: 'flex-start' }}>
      <TagUrl imageSource={TEST_IMAGE_SOURCE} label={TEST_LABEL} />
    </View>
  ));
