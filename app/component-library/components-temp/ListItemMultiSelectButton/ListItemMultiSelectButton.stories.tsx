/* eslint-disable react/display-name */
import React from 'react';

// External dependencies.
import ListItemColumn, {
  WidthType,
} from '../../../component-library/components/List/ListItemColumn';
import Icon, {
  IconName,
} from '../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';

// Internal dependencies.
import { default as ListItemSelectWithButtonComponent } from './ListItemMultiSelectButton';
import { SAMPLE_LISTITEMMULTISELECT_PROPS } from './ListItemMultiSelectButton.constants';

const ListItemSelectWithButtonMeta = {
  title: 'Component Library / List',
  component: ListItemSelectWithButtonComponent,
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
export default ListItemSelectWithButtonMeta;

export const ListItemWithButtonSelect = {
  render: (args: any) => (
    <ListItemSelectWithButtonComponent {...args}>
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
    </ListItemSelectWithButtonComponent>
  ),
};
