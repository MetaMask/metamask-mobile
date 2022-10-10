/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { mockTheme } from '../../../../util/theme';
import Text, { TextVariants } from '../../Texts/Text';

// Internal dependencies.
import Avatar2 from './Avatar2';

storiesOf('Component Library / Avatar2', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => (
    <Avatar2>
      <View
        style={{
          height: 50,
          backgroundColor: mockTheme.colors.background.alternative,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant={TextVariants.sBodySM}>{'Wrapped Content'}</Text>
      </View>
    </Avatar2>
  ));
