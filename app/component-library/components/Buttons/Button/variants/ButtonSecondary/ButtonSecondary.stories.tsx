/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { ButtonSize } from '../../Button.types';
import { IconName } from '../../../../Icon';

// Internal dependencies.
import ButtonSecondary from './ButtonSecondary';
import { ButtonSecondaryVariant } from './ButtonSecondary.types';

storiesOf('Component Library / ButtonSecondary', module)
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
      <ButtonSecondary
        iconName={iconNameSelector}
        size={sizeSelector}
        label={labelSelector}
        onPress={() => console.log("I'm clicked!")}
        buttonSecondaryVariant={ButtonSecondaryVariant.Normal}
      />
    );
  })
  .add('Without icon', () => (
    <ButtonSecondary
      size={ButtonSize.Md}
      label={'Click Me!'}
      onPress={() => console.log("I'm clicked!")}
      buttonSecondaryVariant={ButtonSecondaryVariant.Normal}
    />
  ))
  .add('Danger variant', () => (
    <ButtonSecondary
      size={ButtonSize.Md}
      label={'Click Me!'}
      onPress={() => console.log("I'm clicked!")}
      buttonSecondaryVariant={ButtonSecondaryVariant.Danger}
    />
  ));
