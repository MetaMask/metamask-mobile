// Third party dependencies
import React from 'react';

// External dependencies
import { TextVariant, TextColor } from '../Text/Text.types';

// Internal dependencies
import SensitiveText from './SensitiveText';
import { SensitiveTextProps, SensitiveLengths } from './SensitiveText.types';

const SensitiveTextMeta = {
  title: 'Component Library / Texts',
  component: SensitiveText,
  argTypes: {
    isHidden: {
      control: 'boolean',
    },
    length: {
      options: SensitiveLengths,
      control: {
        type: 'select',
      },
    },
    variant: {
      options: TextVariant,
      control: {
        type: 'select',
      },
    },
    color: {
      options: TextColor,
      control: {
        type: 'select',
      },
    },
    children: {
      control: { type: 'text' },
    },
  },
};
export default SensitiveTextMeta;

export const SensitiveTextExample = {
  args: {
    isHidden: false,
    length: SensitiveLengths.Short,
    variant: TextVariant.BodyMD,
    color: TextColor.Default,
    children: 'Sensitive Information',
  },
};

export const SensitiveTextVariants = (
  args: React.JSX.IntrinsicAttributes &
    SensitiveTextProps & { children?: React.ReactNode | undefined },
) => (
  <>
    <SensitiveText
      {...args}
      isHidden={false}
      length={SensitiveLengths.Short}
      variant={TextVariant.DisplayMD}
      color={TextColor.Alternative}
    >
      Visible Sensitive Text
    </SensitiveText>
    {Object.values(SensitiveLengths).map((length) => (
      <SensitiveText
        key={length}
        {...args}
        length={length as SensitiveLengths}
        isHidden
      >
        {`Hidden (${length})`}
      </SensitiveText>
    ))}
  </>
);
SensitiveTextVariants.argTypes = {
  isHidden: { control: false },
  length: { control: false },
  children: { control: false },
};
SensitiveTextVariants.args = {
  variant: TextVariant.BodyMD,
  color: TextColor.Default,
};
