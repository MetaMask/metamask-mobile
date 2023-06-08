/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../constants/storybook.constants';
import ListItemColumn, { WidthType } from '../../../List/ListItemColumn';
import Icon, { IconName } from '../../../Icons/Icon';
import Text, { TextVariant } from '../../../Texts/Text';
import { getListItemStoryProps } from '../../../List/ListItem/ListItem.stories';

// Internal dependencies.
import MultiSelectItem from './MultiSelectItem';
import { MultiSelectItemProps } from './MultiSelectItem.types';

export const getMultiSelectItemStoryProps = (): MultiSelectItemProps => {
  const isSelected = boolean('isSelected', false, storybookPropsGroupID);
  const isDisabled = boolean('isDisabled', false, storybookPropsGroupID);

  return {
    isSelected,
    isDisabled,
    ...getListItemStoryProps(),
  };
};

const MultiSelectItemStory = () => (
  <MultiSelectItem {...getMultiSelectItemStoryProps()}>
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
  </MultiSelectItem>
);

storiesOf('Component Library / Select', module).add(
  'MultiSelectItem',
  MultiSelectItemStory,
);

export default MultiSelectItemStory;
