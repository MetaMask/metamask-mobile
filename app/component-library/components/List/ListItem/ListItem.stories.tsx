/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import Button, { ButtonVariants } from '../../Buttons/Button';

// Internal dependencies.
import ListItem from './ListItem';
import { ListItemProps } from './ListItem.types';

const ListItemStory = () => (
  <ListItem>
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

storiesOf('Morph / Lists', module).add('ListItem', ListItemStory);

export default ListItemStory;
