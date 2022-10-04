/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { ButtonSize } from '../../Button.types';
import { IconName } from '../../../../Icon';

// Internal dependencies.
import ButtonTertiary from './ButtonTertiary';
import { ButtonTertiaryVariant } from './ButtonTertiary.types';

storiesOf('Component Library / ButtonTertiary', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const sizeSelector = select('size', ButtonSize, ButtonSize.Md, groupId);
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
        buttonTertiaryVariant={ButtonTertiaryVariant.Normal}
      />
    );
  })
  .add('Without icon', () => (
    <ButtonTertiary
      size={ButtonSize.Md}
      label={'Click Me!'}
      onPress={() => console.log("I'm clicked!")}
      buttonTertiaryVariant={ButtonTertiaryVariant.Normal}
    />
  ))
  .add('Danger variant', () => (
    <ButtonTertiary
      size={ButtonSize.Md}
      label={'Click Me!'}
      onPress={() => console.log("I'm clicked!")}
      buttonTertiaryVariant={ButtonTertiaryVariant.Danger}
    />
  ));
