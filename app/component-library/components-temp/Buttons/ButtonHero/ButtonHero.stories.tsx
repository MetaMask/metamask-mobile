import React from 'react';

import { Box, ButtonBaseProps } from '@metamask/design-system-react-native';

import ButtonHero from './ButtonHero';

const ButtonHeroMeta = {
  title: 'Components Temp / Buttons / ButtonHero',
  component: ButtonHero,
  args: {
    children: 'Action',
  },
};

export default ButtonHeroMeta;

export const Default = {};

export const IsDisabled = {
  args: {
    isDisabled: true,
  },
};

export const IsLoading = {
  args: {
    isLoading: true,
  },
  render: (args: ButtonBaseProps) => (
    <Box gap={4}>
      <ButtonHero {...args} />
      <ButtonHero {...args} loadingText="Loading..." />
    </Box>
  ),
};
