/* eslint-disable react/display-name */
import React from 'react';

// External dependencies.
import ListItemColumn, { WidthType } from '../../../List/ListItemColumn';
import Icon, { IconName } from '../../../Icons/Icon';
import Text, { TextVariant } from '../../../Texts/Text';

// Internal dependencies.
import { default as SelectItemComponent } from './SelectItem';
import { SAMPLE_SELECTITEM_PROPS } from './SelectItem.constants';

const SelectItemMeta = {
  title: 'Component Library / Select',
  component: SelectItemComponent,
  argTypes: {
    isSelected: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_SELECTITEM_PROPS.isSelected,
    },
    isDisabled: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_SELECTITEM_PROPS.isDisabled,
    },
  },
};
export default SelectItemMeta;

export const SelectItem = {
  render: (args: any) => (
    <SelectItemComponent {...args}>
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
    </SelectItemComponent>
  ),
};
