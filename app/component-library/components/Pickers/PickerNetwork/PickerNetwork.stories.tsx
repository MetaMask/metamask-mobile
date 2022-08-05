/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { StyleSheet } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { text } from '@storybook/addon-knobs';

// Internal dependencies.
import PickerNetwork from './PickerNetwork';
import { TEST_IMAGE_URL } from './PickerNetwork.constants';

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
    <PickerNetwork
      onPress={() => {
        console.log('Picking network!');
      }}
      networkLabel={networkLabelSelector}
      networkImageUrl={TEST_IMAGE_URL}
      style={styles.networkPicker}
    />
  );
});
