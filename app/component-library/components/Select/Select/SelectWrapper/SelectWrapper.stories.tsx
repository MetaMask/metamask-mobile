/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import ListItem from '../../../ListItem/ListItem';
import { SAMPLE_LISTITEM_PROPS } from '../../../ListItem/ListItem/ListItem.constants';

// Internal dependencies.
import { default as SelectWrapperComponent } from './SelectWrapper';

const SelectWrapperStoryMeta = {
  title: 'Component Library / Select',
  component: SelectWrapperComponent,
};

export default SelectWrapperStoryMeta;

export const SelectWrapper = {
  render: (args: any) => (
    <SelectWrapperComponent {...args} value={{ ...SAMPLE_LISTITEM_PROPS }}>
      <ListItem {...SAMPLE_LISTITEM_PROPS} />
      <ListItem {...SAMPLE_LISTITEM_PROPS} />
      <ListItem {...SAMPLE_LISTITEM_PROPS} />
    </SelectWrapperComponent>
  ),
};
