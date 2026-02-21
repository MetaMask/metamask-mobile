/* eslint-disable react/display-name */
// External dependencies.
import { TextFieldSize } from '../TextField/TextField.types';

// Internal dependencies.
import { default as TextFieldSearchComponent } from './TextFieldSearch';
import { SAMPLE_TEXTFIELDSEARCH_PROPS } from './TextFieldSearch.constants';

const TextFieldSearchMeta = {
  title: 'Component Library / Form',
  component: TextFieldSearchComponent,
  argTypes: {
    size: {
      options: TextFieldSize,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_TEXTFIELDSEARCH_PROPS.size,
    },
    isError: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_TEXTFIELDSEARCH_PROPS.isError,
    },
    isDisabled: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_TEXTFIELDSEARCH_PROPS.isDisabled,
    },
    isReadonly: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_TEXTFIELDSEARCH_PROPS.isReadonly,
    },
    placeholder: {
      control: { type: 'text' },
      defaultValue: SAMPLE_TEXTFIELDSEARCH_PROPS.placeholder,
    },
    showClearButton: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_TEXTFIELDSEARCH_PROPS.showClearButton,
    },
  },
};
export default TextFieldSearchMeta;

export const TextFieldSearch = {};
