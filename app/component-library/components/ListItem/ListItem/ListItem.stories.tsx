/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { default as ListItemComponent } from './ListItem';
import { SAMPLE_LISTITEM_PROPS } from './ListItem.constants';

const ListItemStoryMeta = {
  title: 'Component Library / ListItem',
  component: ListItemComponent,
  argTypes: {
    label: {
      control: { type: 'text' },
    },
    description: {
      control: { type: 'text' },
    },
  },
};

export default ListItemStoryMeta;

export const ListItem = {
  args: {
    label: SAMPLE_LISTITEM_PROPS.label,
    description: SAMPLE_LISTITEM_PROPS.description,
  },
  render: (args: any) => (
    <ListItemComponent {...args} iconProps={SAMPLE_LISTITEM_PROPS.iconProps} />
  ),
};
