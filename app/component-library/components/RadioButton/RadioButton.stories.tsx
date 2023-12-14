/* eslint-disable no-console, react-native/no-inline-styles */

// Internal dependencies.
import { default as RadioButtonComponent } from './RadioButton';
import { SAMPLE_RADIOBUTTON_PROPS } from './RadioButton.constants';

const RadioButtonMeta = {
  title: 'Component Library / RadioButton',
  component: RadioButtonComponent,
  argTypes: {
    label: {
      control: { type: 'text' },
    },
    isChecked: {
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
export default RadioButtonMeta;

export const RadioButton = {
  args: SAMPLE_RADIOBUTTON_PROPS,
};
