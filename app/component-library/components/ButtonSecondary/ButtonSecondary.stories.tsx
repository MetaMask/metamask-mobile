/* eslint-disable no-console */
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';
import { IconName } from '../Icon';
import { BaseButtonSize } from '../BaseButton';
import ButtonSecondary from './ButtonSecondary';
import { ButtonSecondaryVariant } from './ButtonSecondary.types';

storiesOf('Component Library / ButtonSecondary', module)
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
      <ButtonSecondary
        icon={iconSelector}
        size={sizeSelector}
        label={labelSelector}
        onPress={() => console.log("I'm clicked!")}
        variant={ButtonSecondaryVariant.Normal}
      />
    );
  })
  .add('Without icon', () => (
    <ButtonSecondary
      size={BaseButtonSize.Md}
      label={'Click Me!'}
      onPress={() => console.log("I'm clicked!")}
      variant={ButtonSecondaryVariant.Normal}
    />
  ))
  .add('Danger variant', () => (
    <ButtonSecondary
      size={BaseButtonSize.Md}
      label={'Click Me!'}
      onPress={() => console.log("I'm clicked!")}
      variant={ButtonSecondaryVariant.Danger}
    />
  ));
