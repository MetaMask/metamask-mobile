/* eslint-disable no-console */
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import BaseButton from './BaseButton';
import { IconName } from '../Icon';
import { BaseButtonSize } from './BaseButton.types';
import { select, text } from '@storybook/addon-knobs';

storiesOf('Component Library / BaseButton', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const sizeSelector = select(
      'size',
      BaseButtonSize,
      BaseButtonSize.Md,
      groupId,
    );
    const iconSelector = select(
      'icon',
      IconName,
      IconName.AddSquareFilled,
      groupId,
    );
    const labelSelector = text('label', 'Click Me!', groupId);

    return (
      <BaseButton
        icon={iconSelector}
        size={sizeSelector}
        label={labelSelector}
        onPress={() => console.log("I'm clicked!")}
      />
    );
  });
