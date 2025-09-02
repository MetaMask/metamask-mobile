import React from 'react';

import { Box, ButtonSize } from '@metamask/design-system-react-native';

import ButtonSemantic from './ButtonSemantic';
import {
  ButtonSemanticProps,
  ButtonSemanticSeverity,
} from './ButtonSemantic.types';

const ButtonSemanticMeta = {
  title: 'Components Temp / Buttons / ButtonSemantic',
  component: ButtonSemantic,
  args: {
    children: 'Action',
    severity: ButtonSemanticSeverity.Success,
    onPress: () => console.log('Button pressed'),
  },
  argTypes: {
    severity: {
      control: 'select',
      options: Object.values(ButtonSemanticSeverity),
    },
    size: {
      control: 'select',
      options: Object.values(ButtonSize),
    },
    isDisabled: {
      control: 'boolean',
    },
    isLoading: {
      control: 'boolean',
    },
    isFullWidth: {
      control: 'boolean',
    },
  },
};

export default ButtonSemanticMeta;

export const Default = {
  args: {
    severity: ButtonSemanticSeverity.Success,
    size: ButtonSize.Lg,
    isDisabled: false,
    isLoading: false,
    isFullWidth: false,
  },
};

export const WithSizes = {
  render: (args: ButtonSemanticProps) => (
    <Box gap={4}>
      <ButtonSemantic {...args} size={ButtonSize.Sm}>
        Small
      </ButtonSemantic>
      <ButtonSemantic {...args} size={ButtonSize.Md}>
        Medium
      </ButtonSemantic>
      <ButtonSemantic {...args} size={ButtonSize.Lg}>
        Large
      </ButtonSemantic>
    </Box>
  ),
};

export const AllVariants = {
  render: (args: ButtonSemanticProps) => (
    <Box gap={4}>
      <ButtonSemantic {...args} severity={ButtonSemanticSeverity.Success}>
        Success Button
      </ButtonSemantic>
      <ButtonSemantic {...args} severity={ButtonSemanticSeverity.Danger}>
        Danger Button
      </ButtonSemantic>
    </Box>
  ),
};

export const IsDisabled = {
  args: {
    isDisabled: true,
  },
};

export const IsLoading = {
  args: {
    isLoading: true,
  },
  render: (args: ButtonSemanticProps) => (
    <Box gap={4}>
      <ButtonSemantic {...args} />
      <ButtonSemantic {...args} loadingText="Loading..." />
    </Box>
  ),
};
