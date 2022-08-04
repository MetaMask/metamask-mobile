/* eslint-disable no-console */
import React from 'react';
import { storiesOf } from '@storybook/react-native';

import BaseText, { BaseTextVariant } from '../../BaseText';

import ButtonLink from './ButtonLink';

storiesOf('Component Library / ButtonLink', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => (
    <ButtonLink
      onPress={() => console.log("I'm clicked!")}
    >{`I'm a ButtonLink!`}</ButtonLink>
  ))
  .add('Nested within BaseText', () => (
    <BaseText variant={BaseTextVariant.lBodyMDBold}>
      {`Need to learn more? `}
      <ButtonLink
        variant={BaseTextVariant.lBodyMDBold}
        onPress={() => console.log("I'm clicked!")}
      >{`Click Here!`}</ButtonLink>
    </BaseText>
  ));
