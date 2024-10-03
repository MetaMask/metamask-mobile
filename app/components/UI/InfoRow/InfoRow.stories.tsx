import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { StyleProp, Text, TextStyle, View } from 'react-native';

import InfoRow from './InfoRow';
import InfoSection from './InfoSection';

const style = {
  container: { padding: 8 },
  title: { marginTop: 20, fontSize: 20, fontWeight: '700' },
};

storiesOf('App Components / InfoRow', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => (
    <View style={style.container}>
      <Text style={style.title as StyleProp<TextStyle>}>Simple Info Row</Text>
      <InfoSection>
        <InfoRow label="label-Key">Value-Text</InfoRow>
      </InfoSection>
      <Text style={style.title as StyleProp<TextStyle>}>Value wrapped</Text>
      <InfoSection>
        <InfoRow label="label-Key">
          Value-Text Value-Text Value-Text Value-Text Value-Text Value-Text
          Value-Text Value-Text Value-Text Value-Text Value-Text Value-Text
          Value-Text Value-Text Value-Text Value-Text
        </InfoRow>
      </InfoSection>
    </View>
  ));
