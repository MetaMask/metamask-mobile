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
import {
  BUTTON_TEST_ID,
  DEFAULT_LISTITEMMULTISELECT_GAP,
  SAMPLE_LISTITEMMULTISELECT_PROPS,
} from './ListItemMultiSelectButton.constants';
import { ListItemMultiSelectButtonProps } from './ListItemMultiSelectButton.types';

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
    showButtonIcon: {
      control: { type: 'boolean' },
      defaultValue: true,
    },
    buttonIcon: {
      control: { type: 'select' },
      options: Object.values(IconName),
      defaultValue: IconName.MoreVertical,
    },
    gap: {
      control: { type: 'number' },
      defaultValue: DEFAULT_LISTITEMMULTISELECT_GAP,
    },
    buttonProps: {
      control: 'object',
      defaultValue: {
        textButton: '',
        onButtonClick: () => null,
        buttonTestId: BUTTON_TEST_ID,
      },
    },
  },
};
export default ListItemSelectWithButtonMeta;

export const ListItemWithButtonSelect = {
  render: (args: JSX.IntrinsicAttributes & ListItemMultiSelectButtonProps) => (
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
