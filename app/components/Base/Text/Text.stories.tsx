import React from 'react';

import { storiesOf } from '@storybook/react-native';
import { action } from '@storybook/addon-actions';
import { text, boolean } from '@storybook/addon-knobs';

import Text from './Text';

storiesOf('Components / Base / Text', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => (
    <Text
      onPress={action('onPress')}
      reset={boolean('reset', false)}
      centered={boolean('centered', false)}
      right={boolean('right', false)}
      bold={boolean('bold', false)}
      green={boolean('green', false)}
      black={boolean('black', false)}
      blue={boolean('blue', false)}
      grey={boolean('grey', false)}
      red={boolean('red', false)}
      orange={boolean('orange', false)}
      primary={boolean('primary', false)}
      disclaimer={boolean('disclaimer', false)}
      small={boolean('small', false)}
      big={boolean('big', false)}
      upper={boolean('upper', false)}
      modal={boolean('modal', false)}
      infoModal={boolean('infoModal', false)}
      link={boolean('link', false)}
      strikethrough={boolean('strikethrough', false)}
      underline={boolean('underline', false)}
      noMargin={boolean('noMargin', false)}
    >
      {text('children', 'This is a Text component')}
    </Text>
  ));
