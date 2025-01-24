import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { Text, View } from 'react-native';

import Tooltip from './Tooltip';

storiesOf('Confirmations / Tooltip', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => (
    <Tooltip
      title="Tooltip title"
      content={
        <View>
          <Text>Tooltip content to be displayed here!</Text>
        </View>
      }
    />
  ));
