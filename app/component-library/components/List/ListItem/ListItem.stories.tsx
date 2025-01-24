/* eslint-disable react/display-name */
import React from 'react';

// External dependencies.
import Icon, { IconName } from '../../Icons/Icon';
import Text, { TextVariant } from '../../Texts/Text';
import ListItemColumn, { WidthType } from '../ListItemColumn';

// Internal dependencies.
import { default as ListItemComponent } from './ListItem';
import { SAMPLE_LISTITEM_PROPS } from './ListItem.constants';
import { ListItemProps, VerticalAlignment } from './ListItem.types';

const ListItemMeta = {
  title: 'Component Library / List',
  component: ListItemComponent,
  argTypes: {
    gap: {
      control: { type: 'number' },
      defaultValue: SAMPLE_LISTITEM_PROPS.gap,
    },
    verticalAlignment: {
      options: VerticalAlignment,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_LISTITEM_PROPS.verticalAlignment,
    },
    topAccessory: {
      control: { type: 'boolean' },
      defaultValue: false,
      mapping: {
        false: null,
        true: (
          <Text variant={TextVariant.BodySMMedium}>Sample Top Accessory</Text>
        ),
      },
    },
    bottomAccessory: {
      control: { type: 'boolean' },
      defaultValue: false,
      mapping: {
        false: null,
        true: (
          <Text variant={TextVariant.BodySMMedium}>
            Sample Bottom Accessory
          </Text>
        ),
      },
    },
    topAccessoryGap: {
      control: { type: 'number' },
      defaultValue: SAMPLE_LISTITEM_PROPS.topAccessoryGap,
    },
    bottomAccessoryGap: {
      control: { type: 'number' },
      defaultValue: SAMPLE_LISTITEM_PROPS.bottomAccessoryGap,
    },
  },
};
export default ListItemMeta;

export const ListItem = {
  render: (
    args: JSX.IntrinsicAttributes &
      ListItemProps & { children?: React.ReactNode },
  ) => (
    <ListItemComponent {...args}>
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
    </ListItemComponent>
  ),
};
