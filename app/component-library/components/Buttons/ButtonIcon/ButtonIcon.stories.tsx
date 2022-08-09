/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, boolean } from '@storybook/addon-knobs';

// External dependencies.
import { IconName } from '../../Icon';

// Internal dependencies.
import ButtonIcon from './ButtonIcon';
import { ButtonIconVariant } from './ButtonIcon.types';

storiesOf(' Component Library / ButtonIcon', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const iconNameSelector = select(
      'iconName',
      IconName,
      IconName.LockFilled,
      groupId,
    );
    const variantSelector = select(
      'variant',
      ButtonIconVariant,
      ButtonIconVariant.Primary,
      groupId,
    );
    const disabledSelector = boolean('disabled', false, groupId);

    return (
      <ButtonIcon
        variant={variantSelector}
        iconName={iconNameSelector}
        disabled={disabledSelector}
        onPress={() => console.log("I'm clicked!")}
      />
    );
  });
