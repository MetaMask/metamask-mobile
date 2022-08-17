/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { ButtonBaseSize } from '../ButtonBase';
import { IconName } from '../../Icon';

// Internal dependencies.
import ButtonSecondary from './ButtonSecondary';
import { ButtonSecondaryVariant } from './ButtonSecondary.types';

storiesOf('Component Library / ButtonSecondary', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const sizeSelector = select(
      'size',
      ButtonBaseSize,
      ButtonBaseSize.Md,
      groupId,
    );
    const iconNameSelector = select(
      'iconName',
      IconName,
      IconName.AddSquareFilled,
      groupId,
    );
    const labelSelector = text('label', 'Click Me!', groupId);

    return (
      <ButtonSecondary
        iconName={iconNameSelector}
        size={sizeSelector}
        label={labelSelector}
        onPress={() => console.log("I'm clicked!")}
        variant={ButtonSecondaryVariant.Normal}
      />
    );
  })
  .add('Without icon', () => (
    <ButtonSecondary
      size={ButtonBaseSize.Md}
      label={'Click Me!'}
      onPress={() => console.log("I'm clicked!")}
      variant={ButtonSecondaryVariant.Normal}
    />
  ))
  .add('Danger variant', () => (
    <ButtonSecondary
      size={ButtonBaseSize.Md}
      label={'Click Me!'}
      onPress={() => console.log("I'm clicked!")}
      variant={ButtonSecondaryVariant.Danger}
    />
  ));
