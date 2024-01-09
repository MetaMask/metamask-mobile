/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import ValueListItem from '../../../../ValueList/ValueListItem/ValueListItem';
import { SAMPLE_VALUELISTITEM_PROPS } from '../../../../ValueList/ValueListItem/ValueListItem.constants';

// Internal dependencies.
import { default as DropdownWrapperComponent } from './DropdownWrapper';

const DropdownWrapperStoryMeta = {
  title: 'Component Library / Selectables / Dropdown',
  component: DropdownWrapperComponent,
  argTypes: {
    placeholder: {
      control: { type: 'text' },
    },
  },
};

export default DropdownWrapperStoryMeta;

export const DropdownWrapper = {
  render: () => (
    <DropdownWrapperComponent value={SAMPLE_VALUELISTITEM_PROPS}>
      <ValueListItem {...SAMPLE_VALUELISTITEM_PROPS} />
      <ValueListItem {...SAMPLE_VALUELISTITEM_PROPS} />
      <ValueListItem {...SAMPLE_VALUELISTITEM_PROPS} />
    </DropdownWrapperComponent>
  ),
};
