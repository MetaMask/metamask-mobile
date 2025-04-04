// External dependencies.
import { TextVariant } from '../../../../Texts/Text';

// Internal dependencies.
import { default as InputComponent } from './Input';
import { SAMPLE_INPUT_PROPS } from './Input.constants';

const InputMeta = {
  title: 'Component Library / Form',
  component: InputComponent,
  argTypes: {
    textVariant: {
      options: TextVariant,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_INPUT_PROPS.textVariant,
    },
    isDisabled: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_INPUT_PROPS.isDisabled,
    },
    isReadonly: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_INPUT_PROPS.isReadonly,
    },
    placeholder: {
      control: { type: 'text' },
      defaultValue: SAMPLE_INPUT_PROPS.placeholder,
    },
  },
};
export default InputMeta;

export const Input = {};
