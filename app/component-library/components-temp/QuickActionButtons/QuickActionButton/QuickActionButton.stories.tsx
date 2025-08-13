/* eslint-disable no-console */
// Third party dependencies
import React from 'react';

// External dependencies
import {
  Box,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';

// Internal dependencies
import QuickActionButton from './QuickActionButton';
import { QuickActionButtonProps } from './QuickActionButton.types';

const QuickActionButtonMeta = {
  title: 'Components Temp / QuickActionButtons / QuickActionButton',
  component: QuickActionButton,
  argTypes: {
    children: {
      control: { type: 'text' },
      description: 'The content to display inside the button',
    },
    isDisabled: {
      control: { type: 'boolean' },
      description: 'Whether the button is disabled',
    },
  },
  args: {
    children: '25%',
    onPress: () => console.log('Button pressed'),
  },
};

export default QuickActionButtonMeta;

export const Default = {};

export const Size = {
  render: function Render(args: QuickActionButtonProps) {
    return (
      <Box gap={4}>
        <QuickActionButton {...args} size={ButtonSize.Sm} />
        <QuickActionButton {...args} size={ButtonSize.Md} />
        <QuickActionButton {...args} size={ButtonSize.Lg} />
      </Box>
    );
  },
};

export const IsDisabled = {
  args: {
    isDisabled: true,
  },
};

export const Variant = {
  render: function Render(args: QuickActionButtonProps) {
    return (
      <Box gap={4}>
        <QuickActionButton {...args} variant={ButtonVariant.Primary} />
        <QuickActionButton {...args} variant={ButtonVariant.Secondary} />
        <QuickActionButton {...args} variant={ButtonVariant.Tertiary} />
      </Box>
    );
  },
};
