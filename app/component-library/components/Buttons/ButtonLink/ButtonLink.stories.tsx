/* eslint-disable no-console */
import React from 'react';
import { storiesOf } from '@storybook/react-native';

import Text, { TextVariant } from '../../Text';

import ButtonLink from './ButtonLink';

storiesOf('Component Library / ButtonLink', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => (
    <ButtonLink
      onPress={() => console.log("I'm clicked!")}
    >{`I'm a ButtonLink!`}</ButtonLink>
  ))
  .add('Nested within Text', () => (
    <Text variant={TextVariant.lBodyMDBold}>
      {`Need to learn more? `}
      <ButtonLink
        variant={TextVariant.lBodyMDBold}
        onPress={() => console.log("I'm clicked!")}
      >{`Click Here!`}</ButtonLink>
    </Text>
  ));
