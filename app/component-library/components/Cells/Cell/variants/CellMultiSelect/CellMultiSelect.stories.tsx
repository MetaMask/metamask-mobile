// Third party dependencies
import React from 'react';
import { Meta, Story } from '@storybook/react-native';

// Internal dependencies
import CellMultiSelect from './CellMultiSelect';
import { CellMultiSelectProps } from './CellMultiSelect.types';
import { SAMPLE_CELLMULTISELECT_PROPS } from './CellMultiSelect.constants';

export default {
  title: 'Component Library / Cells / CellMultiSelect',
  component: CellMultiSelect,
  argTypes: {
    title: { control: 'text' },
    secondaryText: { control: 'text' },
    tertiaryText: { control: 'text' },
    tagLabel: { control: 'text' },
    isSelected: { control: 'boolean' },
    isDisabled: { control: 'boolean' },
  },
} as Meta;

const Template: Story<CellMultiSelectProps> = (args) => (
  <CellMultiSelect {...args} />
);

export const Default = Template.bind({});
Default.args = {
  ...SAMPLE_CELLMULTISELECT_PROPS,
};
