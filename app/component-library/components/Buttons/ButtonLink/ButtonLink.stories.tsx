/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import Text, { TextVariant } from '../../Text';

// Internal dependencies.
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
