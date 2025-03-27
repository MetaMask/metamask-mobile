import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { StyleProp, Text, TextStyle, View } from 'react-native';
import { fontStyles } from '../../../../../../styles/common';
import InfoRow from './InfoRow';
import InfoSection from './InfoSection';
import DisplayURL from './InfoValue/DisplayURL';

const style = {
  container: { padding: 8 },
  title: { marginTop: 20, fontSize: 20, ...fontStyles.bold },
};

storiesOf('Confirmations / InfoRow', module)
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
      <Text style={style.title as StyleProp<TextStyle>}>URL</Text>
      <InfoSection>
        <InfoRow label="url-key">
          <DisplayURL url="https://google.com" />
        </InfoRow>
        <InfoRow label="url-key">
          <DisplayURL url="http://google.com" />
        </InfoRow>
      </InfoSection>
    </View>
  ));
