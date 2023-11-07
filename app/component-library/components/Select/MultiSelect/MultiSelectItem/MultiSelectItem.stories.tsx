/* eslint-disable react/display-name */
import React from 'react';

// External dependencies.
import ListItemColumn, { WidthType } from '../../../List/ListItemColumn';
import Icon, { IconName } from '../../../Icons/Icon';
import Text, { TextVariant } from '../../../Texts/Text';

// Internal dependencies.
import { default as MultiSelectItemComponent } from './MultiSelectItem';
import { SAMPLE_MULTISELECTITEM_PROPS } from './MultiSelectItem.constants';

const MultiSelectItemMeta = {
  title: 'Component Library / Select',
  component: MultiSelectItemComponent,
  argTypes: {
    isSelected: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_MULTISELECTITEM_PROPS.isSelected,
    },
    isDisabled: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_MULTISELECTITEM_PROPS.isDisabled,
    },
  },
};
export default MultiSelectItemMeta;

export const MultiSelectItem = {
  render: (args: any) => (
    <MultiSelectItemComponent {...args}>
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
    </MultiSelectItemComponent>
  ),
};
