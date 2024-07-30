/* eslint-disable react/display-name */
import React from 'react';

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
  },
};
export default PickerNetworkMeta;

export const PickerNetwork = {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => (
    <PickerNetworkComponent
      {...args}
      imageSource={SAMPLE_PICKERNETWORK_PROPS.imageSource}
      onPress={SAMPLE_PICKERNETWORK_PROPS.onPress}
    />
  ),
};
