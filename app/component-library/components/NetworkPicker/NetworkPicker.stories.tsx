/* eslint-disable no-console */
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { text } from '@storybook/addon-knobs';
import NetworkPicker from './NetworkPicker';
import { testImageUrl } from './NetworkPicker.data';
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  networkPicker: {
    alignSelf: 'flex-start',
  },
});

storiesOf('Component Library / Network Picker', module).add('Default', () => {
  const groupId = 'Props';
  const networkLabelSelector = text(
    'networkLabel',
    'Ethereum Mainnet',
    groupId,
  );

  return (
    <NetworkPicker
      onPress={() => {
        console.log('Picking network!');
      }}
      networkLabel={networkLabelSelector}
      networkImageUrl={testImageUrl}
      style={styles.networkPicker}
    />
  );
});
