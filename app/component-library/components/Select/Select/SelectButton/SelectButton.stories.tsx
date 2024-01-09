/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { SelectButtonSize } from '../../../../base-components/Select/BaseSelectButton';
import { SAMPLE_LISTITEM_PROPS } from '../../../ListItem/ListItem/ListItem.constants';

// Internal dependencies.
import { default as SelectButtonComponent } from './SelectButton';
import { SAMPLE_SELECTBUTTON_PROPS } from './SelectButton.constants';

const SelectButtonStoryMeta = {
  title: 'Component Library / Select',
  component: SelectButtonComponent,
  argTypes: {
    size: {
      options: SelectButtonSize,
      control: {
        type: 'select',
      },
    },
    isDisabled: {
      control: { type: 'boolean' },
    },
    isDanger: {
      control: { type: 'boolean' },
    },
  },
};

export default SelectButtonStoryMeta;

export const SelectButton = {
  args: {
    size: SAMPLE_SELECTBUTTON_PROPS.size,
    isDisabled: SAMPLE_SELECTBUTTON_PROPS.isDisabled,
    isDanger: SAMPLE_SELECTBUTTON_PROPS.isDanger,
  },
  render: (args: any) => (
    <SelectButtonComponent {...args} value={SAMPLE_LISTITEM_PROPS} />
  ),
};
