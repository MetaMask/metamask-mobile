/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';

// External dependencies.
import { IconName } from '../../../../Icon';

// Internal dependencies.
import ButtonBase from './ButtonBase';
import { ButtonSize } from '../../Button.types';

storiesOf('Component Library / ButtonBase', module)
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
      <ButtonBase
        iconName={iconNameSelector}
        size={sizeSelector}
        label={labelSelector}
        onPress={() => console.log("I'm clicked!")}
      />
    );
  })
  .add('With label color', () => (
    <ButtonBase
      iconName={IconName.BankTokenFilled}
      size={ButtonSize.Md}
      label={"I'm a button!"}
      onPress={() => console.log("I'm clicked!")}
      labelColor={'blue'}
    />
  ))
  .add('Without icon', () => (
    <ButtonBase
      size={ButtonSize.Md}
      label={"I'm a button!"}
      onPress={() => console.log("I'm clicked!")}
    />
  ));
