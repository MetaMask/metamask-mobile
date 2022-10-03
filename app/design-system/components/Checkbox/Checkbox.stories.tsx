/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { boolean } from '@storybook/addon-knobs';

// Internal dependencies.
import Checkbox from './Checkbox';

storiesOf('Design System / Checkbox', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const selectedSelector = boolean('isSelected', false, groupId);

    return <Checkbox isSelected={selectedSelector} />;
  });
