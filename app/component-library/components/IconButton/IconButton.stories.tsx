/* eslint-disable no-console */
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, boolean } from '@storybook/addon-knobs';
import { IconName } from '../Icon';
import IconButton from './IconButton';
import { IconButtonVariant } from './IconButton.types';

storiesOf(' Component Library / IconButton', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const iconSelector = select('icon', IconName, IconName.LockFilled, groupId);
    const variantSelector = select(
      'variant',
      IconButtonVariant,
      IconButtonVariant.Primary,
      groupId,
    );
    const disabledSelector = boolean('disabled', false, groupId);

    return (
      <IconButton
        variant={variantSelector}
        icon={iconSelector}
        disabled={disabledSelector}
        onPress={() => console.log("I'm clicked!")}
      />
    );
  });
