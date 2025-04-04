/* eslint-disable react/display-name */
import React from 'react';

// External dependencies.
import ListItemColumn, { WidthType } from '../../List/ListItemColumn';
import Icon, { IconName } from '../../Icons/Icon';
import Text, { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import { default as ListItemMultiSelectComponent } from './ListItemMultiSelect';
import { SAMPLE_LISTITEMMULTISELECT_PROPS } from './ListItemMultiSelect.constants';

const ListItemMultiSelectMeta = {
  title: 'Component Library / List',
  component: ListItemMultiSelectComponent,
  argTypes: {
    isSelected: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_LISTITEMMULTISELECT_PROPS.isSelected,
    },
    isDisabled: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_LISTITEMMULTISELECT_PROPS.isDisabled,
    },
  },
};
export default ListItemMultiSelectMeta;

export const ListItemMultiSelect = {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => (
    <ListItemMultiSelectComponent {...args}>
      <ListItemColumn>
        <Icon name={IconName.Clock} />
      </ListItemColumn>
      <ListItemColumn widthType={WidthType.Fill}>
        <Text numberOfLines={1} variant={TextVariant.HeadingSMRegular}>
          {'Sample Title'}
        </Text>
        <Text variant={TextVariant.BodyMD}>{'Sample Description'}</Text>
      </ListItemColumn>
      <ListItemColumn>
        <Icon name={IconName.Arrow2Right} />
      </ListItemColumn>
    </ListItemMultiSelectComponent>
  ),
};
