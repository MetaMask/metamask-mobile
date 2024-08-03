// Third party dependencies
import React from 'react';
import { Meta, Story } from '@storybook/react-native';

// Internal dependencies
import CellSelect from './CellSelect';
import { CellSelectProps } from './CellSelect.types';
import { SAMPLE_CELLSELECT_PROPS } from './CellSelect.constants';

export default {
  title: 'Component Library / Cells / CellSelect',
  component: CellSelect,
  argTypes: {
    title: { control: 'text' },
    secondaryText: { control: 'text' },
    tertiaryText: { control: 'text' },
    tagLabel: { control: 'text' },
    isSelected: { control: 'boolean' },
    isDisabled: { control: 'boolean' },
  },
} as Meta;

const Template: Story<CellSelectProps> = (args) => <CellSelect {...args} />;

export const Default = Template.bind({});
Default.args = {
  ...SAMPLE_CELLSELECT_PROPS,
};
