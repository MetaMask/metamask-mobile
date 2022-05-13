/* eslint-disable no-console */
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import Link from './';
import BaseText, { BaseTextVariant } from '../BaseText';

storiesOf('Component Library / Link', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => (
    <Link onPress={() => console.log("I'm clicked!")}>{`I'm a Link!`}</Link>
  ))
  .add('Nested within BaseText', () => (
    <BaseText variant={BaseTextVariant.lBodyMDBold}>
      {`Need to learn more? `}
      <Link
        variant={BaseTextVariant.lBodyMDBold}
        onPress={() => console.log("I'm clicked!")}
      >{`Click Here!`}</Link>
    </BaseText>
  ));
