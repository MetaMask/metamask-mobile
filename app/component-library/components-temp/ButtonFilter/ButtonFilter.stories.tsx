import React from 'react';

import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';

import ButtonFilter from './ButtonFilter';
import { ButtonFilterProps } from './ButtonFilter.types';

const ButtonFilterMeta = {
  title: 'Components Temp / Buttons / ButtonFilter',
  component: ButtonFilter,
  argTypes: {
    isActive: {
      control: 'boolean',
    },
    label: {
      control: 'text',
    },
  },
  args: {
    label: 'Filter',
    onPress: () => {
      // For demo purposes only
    },
  },
};

export default ButtonFilterMeta;

export const Default = {};

export const Active = {
  args: {
    isActive: true,
  },
};

export const FilterGroup = {
  render: (args: ButtonFilterProps) => (
    <Box flexDirection={BoxFlexDirection.Row} gap={3}>
      <ButtonFilter {...args} label="All" isActive />
      <ButtonFilter {...args} label="Purchased" />
      <ButtonFilter {...args} label="Sold" />
    </Box>
  ),
};
