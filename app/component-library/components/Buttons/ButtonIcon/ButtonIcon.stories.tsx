/* eslint-disable no-console */
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, boolean } from '@storybook/addon-knobs';

import { IconName } from '../../Icon';

import ButtonIcon from './ButtonIcon';
import { ButtonIconVariant } from './ButtonIcon.types';

storiesOf(' Component Library / ButtonIcon', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const iconSelector = select('icon', IconName, IconName.LockFilled, groupId);
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
        icon={iconSelector}
        disabled={disabledSelector}
        onPress={() => console.log("I'm clicked!")}
      />
    );
  });
