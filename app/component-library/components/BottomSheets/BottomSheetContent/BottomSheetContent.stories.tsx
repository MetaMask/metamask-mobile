/* eslint-disable no-console, react-native/no-inline-styles */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { mockTheme } from '../../../../util/theme';
import Text, { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import BottomSheetContent from './BottomSheetContent';

storiesOf('Component Library / BottomSheetContent', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => (
    <BottomSheetContent>
      <View
        style={{
          height: 50,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant={TextVariant.BodySM}>{'Wrapped Content'}</Text>
      </View>
    </BottomSheetContent>
  ));
