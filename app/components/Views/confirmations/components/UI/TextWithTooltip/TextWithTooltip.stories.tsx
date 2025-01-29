import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { StyleProp, Text, TextStyle, View } from 'react-native';

import TextWithTooltip from '.';

const style = {
  container: { padding: 8 },
  title: { marginTop: 20, fontSize: 20, fontWeight: '700' },
};

storiesOf('Confirmations / TextWithTooltip', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => (
    <View style={style.container}>
      <Text style={style.title as StyleProp<TextStyle>}>
        Simple Text With Tooltip
      </Text>
      <TextWithTooltip
        text={'some_dummy_value'}
        tooltip={'some_dummy_tooltip'}
      />
    </View>
  ));
