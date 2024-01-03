/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { ValueListVariant } from '../ValueList.types';

// Internal dependencies.
import { default as ValueListItemComponent } from './ValueListItem';
import { SAMPLE_VALUELISTITEM_PROPS } from './ValueListItem.constants';

const ValueListItemStoryMeta = {
  title: 'Component Library / ValueList',
  component: ValueListItemComponent,
  argTypes: {
    variant: {
      options: ValueListVariant,
      control: {
        type: 'select',
      },
    },
    label: {
      control: { type: 'text' },
    },
    description: {
      control: { type: 'text' },
    },
  },
};

export default ValueListItemStoryMeta;

export const ValueListItem = {
  args: {
    variant: ValueListVariant.Display,
    label: SAMPLE_VALUELISTITEM_PROPS.label,
    description: SAMPLE_VALUELISTITEM_PROPS.description,
  },
  render: (args: any) => (
    <ValueListItemComponent
      {...args}
      iconProps={SAMPLE_VALUELISTITEM_PROPS.iconProps}
    />
  ),
};
