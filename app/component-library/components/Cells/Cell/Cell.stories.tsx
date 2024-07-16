/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';
import { Meta, Story } from '@storybook/react-native';

// External dependencies.
import { SAMPLE_CELLDISPLAY_PROPS } from './variants/CellDisplay/CellDisplay.constants';
import { SAMPLE_CELLMULTISELECT_PROPS } from './variants/CellMultiSelect/CellMultiSelect.constants';
import { SAMPLE_CELLSELECT_PROPS } from './variants/CellSelect/CellSelect.constants';

// Internal dependencies.
import { CellVariant } from './Cell.types';
import Cell from './Cell';

const CellMeta: Meta = {
  title: 'Component Library / Cells / Cell',
  component: Cell,
  argTypes: {
    variant: {
      options: [
        CellVariant.Display,
        CellVariant.MultiSelect,
        CellVariant.Select,
      ],
      control: {
        type: 'select',
      },
    },
  },
};
export default CellMeta;

const Template: Story<{ variant: CellVariant }> = (args) => {
  let sampleProps;

  switch (args.variant) {
    case CellVariant.Display:
      sampleProps = SAMPLE_CELLDISPLAY_PROPS;
      break;
    case CellVariant.MultiSelect:
      sampleProps = SAMPLE_CELLMULTISELECT_PROPS;
      break;
    case CellVariant.Select:
      sampleProps = SAMPLE_CELLSELECT_PROPS;
      break;
    default:
      throw new Error('Invalid Cell Variant');
  }

  return <Cell variant={args.variant} {...sampleProps} />;
};

export const Default = Template.bind({});
Default.args = {
  variant: CellVariant.Display,
};
