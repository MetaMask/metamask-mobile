// Internal dependencies.
import { default as SelectButtonComponent } from './SelectButton';
import { SelectButtonSize } from './SelectButton.types';
import { SAMPLE_SELECTBUTTON_PROPS } from './SelectButton.constants';

const SelectButtonStoryMeta = {
  title: 'Component Library / SelectButton',
  component: SelectButtonComponent,
  argTypes: {
    size: {
      options: SelectButtonSize,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_SELECTBUTTON_PROPS.size,
    },
    label: {
      control: { type: 'text' },
      defaultValue: SAMPLE_SELECTBUTTON_PROPS.label,
    },
    description: {
      control: { type: 'text' },
      defaultValue: SAMPLE_SELECTBUTTON_PROPS.description,
    },
    isDisabled: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_SELECTBUTTON_PROPS.isDisabled,
    },
    isDanger: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_SELECTBUTTON_PROPS.isDanger,
    },
  },
};

export default SelectButtonStoryMeta;

export const SelectButton = {};
