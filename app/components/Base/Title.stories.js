import React from 'react';

import { storiesOf } from '@storybook/react-native';
import { action } from '@storybook/addon-actions';
import { text, boolean } from '@storybook/addon-knobs';

import Title from './Title';

storiesOf('Components / Base / Title', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => (
    <Title
      onPress={action('onPress')}
      centered={boolean('centered', false)}
      hero={boolean('hero', false)}
    >
      {text('children', 'This is a Title component')}
    </Title>
  ));
