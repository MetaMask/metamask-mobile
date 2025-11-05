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
    children: {
      control: 'text',
    },
  },
  args: {
    children: 'Filter',
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
      <ButtonFilter {...args} isActive>
        All
      </ButtonFilter>
      <ButtonFilter {...args}>Purchased</ButtonFilter>
      <ButtonFilter {...args}>Sold</ButtonFilter>
    </Box>
  ),
};
