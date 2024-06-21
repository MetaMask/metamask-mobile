/* eslint-disable react/display-name */
import React from 'react';

// External dependencies.
import { TextVariant, TextColor } from '../Text';
import { IconName, IconSize, IconColor } from '../../Icons/Icon';

// Internal dependencies.
import { default as TextWithPrefixIconComponent } from './TextWithPrefixIcon';
import { SAMPLE_TEXTWITHPREFIXICON_PROPS } from './TextWithPrefixIcon.constants';

const TextWithPrefixIconMeta = {
  title: 'Component Library / Texts',
  component: TextWithPrefixIconComponent,
  argTypes: {
    variant: {
      options: TextVariant,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_TEXTWITHPREFIXICON_PROPS.variant,
    },
    children: {
      control: { type: 'text' },
      defaultValue: SAMPLE_TEXTWITHPREFIXICON_PROPS.children,
    },
    color: {
      options: TextColor,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_TEXTWITHPREFIXICON_PROPS.color,
    },
    iconSize: {
      options: IconSize,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_TEXTWITHPREFIXICON_PROPS.iconProps.size,
    },
    iconName: {
      options: IconName,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_TEXTWITHPREFIXICON_PROPS.iconProps.name,
    },
    iconColor: {
      options: IconColor,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_TEXTWITHPREFIXICON_PROPS.iconProps.color,
    },
  },
};
export default TextWithPrefixIconMeta;

export const TextWithPrefixIcon = {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: ({ iconSize, iconName, iconColor, ...props }: any) => (
    <TextWithPrefixIconComponent
      iconProps={{ size: iconSize, name: iconName, color: iconColor }}
      {...props}
    />
  ),
};
