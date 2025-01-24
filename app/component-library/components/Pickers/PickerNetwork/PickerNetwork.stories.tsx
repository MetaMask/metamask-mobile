/* eslint-disable react/display-name */
import React, { ComponentProps } from 'react';

// Internal dependencies.
import { default as PickerNetworkComponent } from './PickerNetwork';
import { SAMPLE_PICKERNETWORK_PROPS } from './PickerNetwork.constants';

const PickerNetworkMeta = {
  title: 'Component Library / Pickers',
  component: PickerNetworkComponent,
  argTypes: {
    label: {
      control: { type: 'text' },
      defaultValue: SAMPLE_PICKERNETWORK_PROPS.label,
    },
    hideNetworkName: {
      control: { type: 'boolean' },
      defaultValue: false,
    },
  },
};
export default PickerNetworkMeta;

export const PickerNetwork = {
  render: (args: ComponentProps<typeof PickerNetworkComponent>) => (
    <PickerNetworkComponent
      {...args}
      imageSource={SAMPLE_PICKERNETWORK_PROPS.imageSource}
      onPress={SAMPLE_PICKERNETWORK_PROPS.onPress}
    />
  ),
};
