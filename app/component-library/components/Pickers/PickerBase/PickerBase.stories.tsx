/* eslint-disable react/display-name */
/* eslint-disable react-native/no-inline-styles */
// External dependencies.
import React from 'react';
import { View, Text } from 'react-native';

// Internal dependencies.
import PickerBase from './PickerBase';
import { IconSize } from '../../Icons/Icon';

const PickerBaseMeta = {
  title: 'Component Library / Pickers',
  component: PickerBase,
  argTypes: {
    children: {
      control: { type: 'text' },
      defaultValue: 'Select an option',
    },
    iconSize: {
      options: Object.values(IconSize),
      control: { type: 'select' },
      defaultValue: IconSize.Md,
    },
  },
};

export default PickerBaseMeta;

export const Default = {
  render: ({
    children,
    iconSize,
  }: {
    children: string;
    iconSize: IconSize;
  }) => (
    <View style={{ alignItems: 'flex-start' }}>
      <PickerBase onPress={() => null} iconSize={iconSize}>
        <Text>{children}</Text>
      </PickerBase>
    </View>
  ),
};

export const WithCustomStyles = {
  render: () => (
    <View style={{ alignItems: 'flex-start' }}>
      <PickerBase
        onPress={() => null}
        style={{ width: 200 }}
        dropdownIconStyle={{ marginLeft: 20 }}
      >
        <Text>Custom Styled Picker</Text>
      </PickerBase>
    </View>
  ),
};
