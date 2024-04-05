// Internal dependencies.
import { default as TextComponent } from './Text';
import { SAMPLE_TEXT_PROPS } from './Text.constants';
import { TextVariant, TextColor } from './Text.types';

const TextMeta = {
  title: 'Component Library / Texts',
  component: TextComponent,
  argTypes: {
    variant: {
      options: TextVariant,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_TEXT_PROPS.variant,
    },
    children: {
      control: { type: 'text' },
      defaultValue: SAMPLE_TEXT_PROPS.children,
    },
    color: {
      options: TextColor,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_TEXT_PROPS.color,
    },
  },
};
export default TextMeta;

export const Text = {};
