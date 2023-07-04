/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { mockTheme } from '../../../../util/theme';
import Text, { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import PickerBase from './PickerBase';

const styles = StyleSheet.create({
  wrappedContent: {
    height: 50,
    flex: 1,
    backgroundColor: mockTheme.colors.background.alternative,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

storiesOf('Component Library / PickerBase', module).add('Default', () => (
  <PickerBase onPress={() => Alert.alert('Pressed picker!')}>
    <View style={styles.wrappedContent}>
      <Text variant={TextVariant.BodySM}>{'Wrapped Content'}</Text>
    </View>
  </PickerBase>
));
