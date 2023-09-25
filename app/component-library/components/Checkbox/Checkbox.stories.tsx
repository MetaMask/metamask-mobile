/* eslint-disable no-console, react-native/no-inline-styles */

// Internal dependencies.
import { default as CheckboxComponent } from './Checkbox';
import {
  STORYBOOK_CHECKBOX_ARGTYPES,
  SAMPLE_CHECKBOX_PROPS,
} from './Checkbox.constants';

const CheckboxMeta = {
  title: 'Component Library / Checkbox',
  component: CheckboxComponent,
  argTypes: STORYBOOK_CHECKBOX_ARGTYPES,
};
export default CheckboxMeta;

export const Checkbox = {
  args: SAMPLE_CHECKBOX_PROPS,
};
