/* eslint-disable no-console */
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';

import { IconName } from '../../Icon';

import ButtonBase from './ButtonBase';
import { ButtonBaseSize } from './ButtonBase.types';

storiesOf('Component Library / ButtonBase', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const sizeSelector = select(
      'size',
      ButtonBaseSize,
      ButtonBaseSize.Md,
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
      <ButtonBase
        icon={iconSelector}
        size={sizeSelector}
        label={labelSelector}
        onPress={() => console.log("I'm clicked!")}
      />
    );
  })
  .add('With label color', () => (
    <ButtonBase
      icon={IconName.BankTokenFilled}
      size={ButtonBaseSize.Md}
      label={"I'm a button!"}
      onPress={() => console.log("I'm clicked!")}
      labelColor={'blue'}
    />
  ))
  .add('Without icon', () => (
    <ButtonBase
      size={ButtonBaseSize.Md}
      label={"I'm a button!"}
      onPress={() => console.log("I'm clicked!")}
    />
  ));
