/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { ImageSourcePropType, StyleSheet } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import { boolean, text } from '@storybook/addon-knobs';

// Internal dependencies.
import PickerNetwork from './PickerNetwork';
import { TEST_IMAGE_URL } from './PickerNetwork.constants';

const styles = StyleSheet.create({
  networkPicker: {
    alignSelf: 'flex-start',
  },
});

storiesOf('Component Library / PickerNetwork', module).add('Default', () => {
  const groupId = 'Props';
  const networkLabelSelector = text('label', 'Ethereum Mainnet', groupId);
  const includesImage = boolean('Includes image', true, groupId);
  const imageUrl = text('imageSource.uri', TEST_IMAGE_URL, groupId);
  const imageSource = (includesImage && {
    uri: imageUrl,
  }) as ImageSourcePropType;

  return (
    <PickerNetwork
      onPress={() => {
        console.log('Picking network!');
      }}
      label={networkLabelSelector}
      imageSource={imageSource}
      style={styles.networkPicker}
    />
  );
});
