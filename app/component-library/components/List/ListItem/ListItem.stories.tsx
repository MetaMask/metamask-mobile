/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, number } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from 'app/component-library/constants/storybook.constants';
import Button, { ButtonVariants } from '../../Buttons/Button';

// Internal dependencies.
import ListItem from './ListItem';
import { ListItemProps, VerticalAlignment } from './ListItem.types';
import {
  DEFAULT_LISTITEM_GAP,
  DEFAULT_LISTITEM_VERTICALALIGNMENT,
} from './ListItem.constants';

export const getListItemStoryProps = (): ListItemProps => {
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
    gap: gapInput,
    verticalAlignment: verticalAlignmentSelector,
  };
};

const ListItemStory = () => (
  <ListItem {...getListItemStoryProps()}>
    <Button
      variant={ButtonVariants.Secondary}
      label="Test"
      onPress={() => console.log('clicked')}
    />
    <Button
      variant={ButtonVariants.Secondary}
      label="Hello"
      onPress={() => console.log('clicked')}
    />
  </ListItem>
);

storiesOf('Component Library / ListItem', module).add('Default', ListItemStory);

export default ListItemStory;
