// Third party dependencies
import React from 'react';

// Internal dependencies
import { default as TextComponent } from './Text';
import { SAMPLE_TEXT_PROPS } from './Text.constants';
import { TextVariant, TextColor, TextProps } from './Text.types';

const TextMeta = {
  title: 'Component Library / Texts',
  component: TextComponent,
  argTypes: {
    variant: {
      options: TextVariant,
      control: {
        type: 'select',
      },
    },
    children: {
      control: { type: 'text' },
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

export const Text = {
  args: {
    variant: SAMPLE_TEXT_PROPS.variant,
    children: SAMPLE_TEXT_PROPS.children,
    color: SAMPLE_TEXT_PROPS.color,
    isBrandEvolution: false,
  },
};

export const TextVariants = (
  args: React.JSX.IntrinsicAttributes &
    TextProps & { children?: React.ReactNode | undefined },
) => (
  <>
    <TextComponent
      variant={TextVariant.DisplayMD}
      color={TextColor.Alternative}
    >
      Current
    </TextComponent>
    {Object.values(TextVariant).map((variant) => (
      <TextComponent key={variant} variant={variant} {...args}>
        {variant}
      </TextComponent>
    ))}
  </>
);
TextVariants.argTypes = {
  variant: { control: false },
  children: { control: false },
  isBrandEvolution: { control: false },
};
TextVariants.args = {
  color: SAMPLE_TEXT_PROPS.color,
};
