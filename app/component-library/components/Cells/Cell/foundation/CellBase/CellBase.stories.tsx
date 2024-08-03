// Third party dependencies
import React from 'react';
import { Meta, Story } from '@storybook/react-native';

// Internal dependencies
import CellBase from './CellBase';
import { CellBaseProps } from './CellBase.types';
import { SAMPLE_CELLBASE_PROPS } from './CellBase.constants';

export default {
  title: 'Component Library / Cells / CellBase',
  component: CellBase,
  argTypes: {
    title: { control: 'text' },
    secondaryText: { control: 'text' },
    tertiaryText: { control: 'text' },
    tagLabel: { control: 'text' },
  },
} as Meta;

const Template: Story<CellBaseProps> = (args) => <CellBase {...args} />;

export const Default = Template.bind({});
Default.args = {
  ...SAMPLE_CELLBASE_PROPS,
};
