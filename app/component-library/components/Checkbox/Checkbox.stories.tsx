/* eslint-disable no-console, react-native/no-inline-styles */

// Internal dependencies.
import { default as CheckboxComponent } from './Checkbox';
import { SAMPLE_CHECKBOX_PROPS } from './Checkbox.constants';

const CheckboxMeta = {
  title: 'Component Library / Checkbox',
  component: CheckboxComponent,
  argTypes: {
    isChecked: {
      control: { type: 'boolean' },
    },
    isIndeterminate: {
      control: { type: 'boolean' },
    },
    isDisabled: {
      control: { type: 'boolean' },
    },
    isReadOnly: {
      control: { type: 'boolean' },
    },
    isDanger: {
      control: { type: 'boolean' },
    },
  },
};
export default CheckboxMeta;

export const Checkbox = {
  args: SAMPLE_CHECKBOX_PROPS,
};
