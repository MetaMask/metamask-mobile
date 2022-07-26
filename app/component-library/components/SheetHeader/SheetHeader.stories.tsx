/* eslint-disable no-console */
import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import SheetHeader from './SheetHeader';
import { mockTheme } from '../../../util/theme';
import BaseText, { BaseTextVariant } from '../BaseText';

const styles = StyleSheet.create({
  wrappedContent: {
    height: 50,
    flex: 1,
    backgroundColor: mockTheme.colors.background.alternative,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

storiesOf('Component Library / SheetHeader', module).add('Default', () => (
  <SheetHeader onPress={() => Alert.alert('Pressed picker!')}>
    <View style={styles.wrappedContent}>
      <BaseText variant={BaseTextVariant.sBodySM}>{'Wrapped Content'}</BaseText>
    </View>
  </SheetHeader>
));
