/* eslint-disable no-console */
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';
import { IconName } from '../Icon';
import { ButtonSize } from '../Button';
import ButtonTertiary from './ButtonTertiary';
import { ButtonTertiaryVariant } from './ButtonTertiary.types';

storiesOf('Component Library / ButtonTertiary', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const sizeSelector = select('size', ButtonSize, ButtonSize.Md, groupId);
    const iconSelector = select(
      'icon',
      IconName,
      IconName.AddSquareFilled,
      groupId,
    );
    const labelSelector = text('label', 'Click Me!', groupId);

    return (
      <ButtonTertiary
        icon={iconSelector}
        size={sizeSelector}
        label={labelSelector}
        onPress={() => console.log("I'm clicked!")}
        variant={ButtonTertiaryVariant.Normal}
      />
    );
  })
  .add('Without icon', () => (
    <ButtonTertiary
      size={ButtonSize.Md}
      label={'Click Me!'}
      onPress={() => console.log("I'm clicked!")}
      variant={ButtonTertiaryVariant.Normal}
    />
  ))
  .add('Danger variant', () => (
    <ButtonTertiary
      size={ButtonSize.Md}
      label={'Click Me!'}
      onPress={() => console.log("I'm clicked!")}
      variant={ButtonTertiaryVariant.Danger}
    />
  ));
