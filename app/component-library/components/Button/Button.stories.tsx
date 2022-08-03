/* eslint-disable no-console */
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select, text } from '@storybook/addon-knobs';
import Button from './Button';
import { IconName } from '../Icon';
import { ButtonSize } from './Button.types';

storiesOf('Component Library / Button', module)
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
      <Button
        icon={iconSelector}
        size={sizeSelector}
        label={labelSelector}
        onPress={() => console.log("I'm clicked!")}
      />
    );
  })
  .add('With label color', () => (
    <Button
      icon={IconName.BankTokenFilled}
      size={ButtonSize.Md}
      label={"I'm a button!"}
      onPress={() => console.log("I'm clicked!")}
      labelColor={'blue'}
    />
  ))
  .add('Without icon', () => (
    <Button
      size={ButtonSize.Md}
      label={"I'm a button!"}
      onPress={() => console.log("I'm clicked!")}
    />
  ));
