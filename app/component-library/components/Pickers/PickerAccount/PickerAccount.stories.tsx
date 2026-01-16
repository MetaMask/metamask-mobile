/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// Internal dependencies.
import { default as PickerAccountComponent } from './PickerAccount';
import { SAMPLE_PICKERACCOUNT_PROPS } from './PickerAccount.constants';
import { TouchableOpacityProps } from '../../../../components/Base/TouchableOpacity';
import { PickerAccountProps } from './PickerAccount.types';

const PickerAccountMeta = {
  title: 'Component Library / Pickers',
  component: PickerAccountComponent,
  argTypes: {
    accountName: {
      control: { type: 'text' },
    },
  },
};
export default PickerAccountMeta;

export const PickerAccount = {
  args: {
    accountName: SAMPLE_PICKERACCOUNT_PROPS.accountName,
  },
  render: (
    args: React.JSX.IntrinsicAttributes &
      PickerAccountProps &
      React.RefAttributes<
        React.ForwardRefExoticComponent<
          TouchableOpacityProps & React.RefAttributes<View>
        >
      >,
  ) => <PickerAccountComponent {...args} />,
};
