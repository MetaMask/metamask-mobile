import React from 'react';

import { storiesOf } from '@storybook/react-native';
import { action } from '@storybook/addon-actions';
import { text } from '@storybook/addon-knobs';
import ButtonReveal from './index';

storiesOf('Components / UI / ButtonReveal', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => (
    <ButtonReveal
      label={text('label', 'Hold to reveal SRP')}
      onLongPress={action('onLongPress')}
    />
  ));
