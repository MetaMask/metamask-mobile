/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */
/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';

// External dependencies.

// Internal dependencies.
import { default as SelectButtonComponent } from './SelectButton';
import { SelectButtonSize } from './SelectButton.types';

const SelectButtonStoryMeta = {
  title: 'Component Library / SelectButton',
  component: SelectButtonComponent,
  argTypes: {
    size: {
      options: SelectButtonSize,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_TEXTFIELD_PROPS.size,
    },
  },
};

export default SelectButtonStoryMeta;

export const SelectButton = {
  render: () => (
    <SelectButtonComponent title={'test'} description={'test description'} />
  ),
};
