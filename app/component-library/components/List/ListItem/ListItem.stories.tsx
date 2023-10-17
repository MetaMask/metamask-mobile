/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, number } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import ListItemColumn, { WidthType } from '../ListItemColumn/';
import Icon, { IconName } from '../../Icons/Icon';
import Text, { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import ListItem from './ListItem';
import { ListItemProps, VerticalAlignment } from './ListItem.types';
import {
  DEFAULT_LISTITEM_PADDING,
  DEFAULT_LISTITEM_BORDERRADIUS,
  DEFAULT_LISTITEM_GAP,
  DEFAULT_LISTITEM_VERTICALALIGNMENT,
} from './ListItem.constants';

export const getListItemStoryProps = (): ListItemProps => {
  const paddingInput = number(
    'padding',
    DEFAULT_LISTITEM_PADDING,
    { min: 0 },
    storybookPropsGroupID,
  );

  const borderRadiusInput = number(
    'borderRadius',
    DEFAULT_LISTITEM_BORDERRADIUS,
    { min: 0 },
    storybookPropsGroupID,
  );

  const gapInput = number(
    'gap',
    DEFAULT_LISTITEM_GAP,
    { min: 0 },
    storybookPropsGroupID,
  );
  const verticalAlignmentSelector = select(
    'verticalAlignment',
    VerticalAlignment,
    DEFAULT_LISTITEM_VERTICALALIGNMENT,
    storybookPropsGroupID,
  );

  return {
    padding: paddingInput,
    borderRadius: borderRadiusInput,
    gap: gapInput,
    verticalAlignment: verticalAlignmentSelector,
  };
};

const ListItemStory = () => (
  <ListItem {...getListItemStoryProps()}>
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
  </ListItem>
);

storiesOf('Component Library / ListItem', module).add('Default', ListItemStory);

export default ListItemStory;
