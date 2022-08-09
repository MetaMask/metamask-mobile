/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { ButtonBaseSize } from '../ButtonBase';
import { IconName } from '../../Icon';

// Internal dependencies.
import ButtonTertiary from './ButtonTertiary';
import { ButtonTertiaryVariant } from './ButtonTertiary.types';

storiesOf('Component Library / ButtonTertiary', module)
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
      <ButtonTertiary
        iconName={iconNameSelector}
        size={sizeSelector}
        label={labelSelector}
        onPress={() => console.log("I'm clicked!")}
        variant={ButtonTertiaryVariant.Normal}
      />
    );
  })
  .add('Without icon', () => (
    <ButtonTertiary
      size={ButtonBaseSize.Md}
      label={'Click Me!'}
      onPress={() => console.log("I'm clicked!")}
      variant={ButtonTertiaryVariant.Normal}
    />
  ))
  .add('Danger variant', () => (
    <ButtonTertiary
      size={ButtonBaseSize.Md}
      label={'Click Me!'}
      onPress={() => console.log("I'm clicked!")}
      variant={ButtonTertiaryVariant.Danger}
    />
  ));
