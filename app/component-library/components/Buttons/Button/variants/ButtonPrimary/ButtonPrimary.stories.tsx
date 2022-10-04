/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { IconName } from '../../../../Icon';
import { ButtonSize } from '../../Button.types';

// Internal dependencies.
import ButtonPrimary from './ButtonPrimary';
import { ButtonPrimaryVariant } from './ButtonPrimary.types';

storiesOf('Component Library / ButtonPrimary', module)
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
      <ButtonPrimary
        iconName={iconNameSelector}
        size={sizeSelector}
        label={labelSelector}
        onPress={() => console.log("I'm clicked!")}
        buttonPrimaryVariant={ButtonPrimaryVariant.Normal}
      />
    );
  })
  .add('Without icon', () => (
    <ButtonPrimary
      size={ButtonSize.Md}
      label={'Click Me!'}
      onPress={() => console.log("I'm clicked!")}
      buttonPrimaryVariant={ButtonPrimaryVariant.Normal}
    />
  ))
  .add('Danger variant', () => (
    <ButtonPrimary
      size={ButtonSize.Md}
      label={'Click Me!'}
      onPress={() => console.log("I'm clicked!")}
      buttonPrimaryVariant={ButtonPrimaryVariant.Danger}
    />
  ));
