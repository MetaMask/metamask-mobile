/* eslint-disable react/display-name */
import React from 'react';

// External dependencies.
import ListItemColumn, { WidthType } from '../../List/ListItemColumn';
import Icon, { IconName } from '../../Icons/Icon';
import Text, { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import { default as ListItemSelectComponent } from './ListItemSelect';
import { SAMPLE_SELECTITEM_PROPS } from './ListItemSelect.constants';

const ListItemSelectMeta = {
  title: 'Component Library / List',
  component: ListItemSelectComponent,
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
export default ListItemSelectMeta;

export const ListItemSelect = {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => (
    <ListItemSelectComponent {...args}>
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
    </ListItemSelectComponent>
  ),
};
